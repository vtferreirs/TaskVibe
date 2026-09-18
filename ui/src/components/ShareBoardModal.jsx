import { useState, useEffect } from "react";
import { X, Users, UserPlus, Trash2, Mail } from "lucide-react";
import api from "../services/api";
import "./CreateBoardModal.css";
import "./ShareBoardModal.css";

// Modal de compartilhamento de quadro (exclusivo do dono).
// Permite convidar usuários por e-mail, ajustar a permissão de cada membro
// (visualizar/editar) e remover membros — tudo via endpoints /quadro/:id/membros.
export default function ShareBoardModal({ isOpen, quadroId, onClose, onUpdateQuadro }) {
  const [quadro, setQuadro] = useState(null); // Dados atuais do quadro (com membros)
  const [email, setEmail] = useState("");
  const [permissao, setPermissao] = useState("visualizar");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Recarrega o quadro toda vez que o modal abre, para listar membros atualizados
  useEffect(() => {
    if (!isOpen || !quadroId) return;

    const carregarQuadro = async () => {
      try {
        const res = await api.get(`/quadro?id=${quadroId}`);
        // A API pode responder com array (lista) ou objeto único; normaliza aqui
        const dados = Array.isArray(res.data)
          ? res.data.find((q) => q._id === quadroId) || null
          : res.data;
        setQuadro(dados);
        setErro("");
      } catch (err) {
        setErro(err.response?.data?.message || "Não foi possível carregar os membros.");
      }
    };

    carregarQuadro();
  }, [isOpen, quadroId]);

  if (!isOpen) return null;

  const membros = quadro?.membros || [];

  // Convidar membro: POST /quadro/:id/membros com e-mail + permissão
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErro("Informe o e-mail do usuário.");
      return;
    }

    setCarregando(true);
    setErro("");
    try {
      const res = await api.post(`/quadro/${quadroId}/membros`, {
        email: email.trim(),
        permissao,
      });
      // Atualiza o quadro local e avisa a página (para sincronizar listas)
      setQuadro(res.data);
      onUpdateQuadro?.(res.data);
      setEmail("");
    } catch (err) {
      setErro(err.response?.data?.message || "Erro ao adicionar membro.");
    } finally {
      setCarregando(false);
    }
  };

  // Alterar permissão do membro: PUT /quadro/:id/membros/:membroId
  const handleChangePermissao = async (membroId, novaPermissao) => {
    try {
      const res = await api.put(`/quadro/${quadroId}/membros/${membroId}`, {
        permissao: novaPermissao,
      });
      setQuadro(res.data);
      onUpdateQuadro?.(res.data);
    } catch (err) {
      setErro(err.response?.data?.message || "Erro ao alterar permissão.");
    }
  };

  // Remover membro: DELETE /quadro/:id/membros/:membroId
  const handleRemove = async (membroId) => {
    try {
      const res = await api.delete(`/quadro/${quadroId}/membros/${membroId}`);
      setQuadro(res.data);
      onUpdateQuadro?.(res.data);
    } catch (err) {
      setErro(err.response?.data?.message || "Erro ao remover membro.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card large-modal">
        <div className="modal-header">
          <div className="modal-title">
            <Users size={20} style={{ color: "var(--accent)" }} />
            <h3>Compartilhar Quadro</h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {erro && <div className="share-error">{erro}</div>}

          {/* Formulário de convite: e-mail + permissão + botão adicionar */}
          <form onSubmit={handleAdd} className="share-form">
            <div className="form-group">
              <label htmlFor="member-email">E-mail cadastrado</label>
              <div className="share-email-row">
                <div className="share-email-input">
                  <Mail size={16} />
                  <input
                    id="member-email"
                    type="email"
                    placeholder="convidado@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (erro) setErro("");
                    }}
                  />
                </div>
                <select
                  value={permissao}
                  onChange={(e) => setPermissao(e.target.value)}
                  className="share-permissao-select"
                  title="Permissão do convidado"
                >
                  <option value="visualizar">Visualizar</option>
                  <option value="editar">Editar</option>
                </select>
                <button type="submit" className="btn-add-member" disabled={carregando}>
                  <UserPlus size={16} /> {carregando ? "..." : "Adicionar"}
                </button>
              </div>
            </div>
          </form>

          {/* Lista de membros atuais com controle de permissão e remoção */}
          <div className="share-members-list">
            <h4 className="share-list-title">Membros ({membros.length})</h4>

            {membros.length === 0 ? (
              <p className="share-empty">
                Nenhum membro ainda. Convide alguém pelo e-mail cadastrado.
              </p>
            ) : (
              membros.map((membro) => (
                <div key={membro._id} className="share-member-row">
                  {/* Avatar com a inicial do nome */}
                  <div className="share-member-avatar">
                    {membro.nome?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="share-member-info">
                    <strong>{membro.nome}</strong>
                    <span>{membro.email}</span>
                  </div>

                  <select
                    className="share-permissao-select"
                    value={membro.permissao}
                    onChange={(e) => handleChangePermissao(membro._id, e.target.value)}
                  >
                    <option value="visualizar">Visualizar</option>
                    <option value="editar">Editar</option>
                  </select>

                  <button
                    className="btn-remove-member"
                    title="Remover membro"
                    onClick={() => handleRemove(membro._id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
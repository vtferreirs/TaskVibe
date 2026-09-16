import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Share2, Eye, Edit3, FolderKanban } from "lucide-react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import "./Dashboard.css";
import "./Compartilhados.css";

export default function Compartilhados() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });
  const [compartilhados, setCompartilhados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const usuarioId = user._id || user.id;
    let ativo = true;

    api
      .get("/quadro")
      .then((response) => {
        if (!ativo) return;
        const dados = Array.isArray(response.data)
          ? response.data.filter((q) => {
              const donoId = String(q.id_usuario?._id || q.id_usuario || "");
              return donoId !== String(usuarioId);
            })
          : [];
        setCompartilhados(dados);
      })
      .catch((err) => {
        if (!ativo) return;
        console.error("Erro ao carregar quadros compartilhados:", err);
        setCompartilhados([]);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [user, navigate]);

  return (
    <div className="dashboard-container">
      <Navbar user={user} />

      <main className="dashboard-content">
        <div className="dashboard-welcome">
          <h1>Quadros Compartilhados</h1>
          <p>Quadros que outras pessoas compartilharam com você colaborar.</p>
        </div>

        {loading ? (
          <p>Carregando quadros...</p>
        ) : compartilhados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={32} />
            </div>
            <h3>Nenhum quadro compartilhado ainda</h3>
            <p>
              Quando alguém compartilhar um quadro com você pelo e-mail cadastrado, ele
              aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="boards-grid compartilhados-grid">
            {compartilhados.map((quadro) => {
              const dono = quadro.id_usuario?._id ? quadro.id_usuario : null;
              const membroAtual = (quadro.membros || []).find(
                (m) => String(m.id_usuario) === String(user?._id || user?.id)
              );
              const permissao = membroAtual?.permissao === "editar" ? "editar" : "visualizar";
              const titulo = quadro.titulo_quadro || quadro.titulo;

              return (
                <div
                  key={quadro._id}
                  className="board-card"
                  style={{ background: quadro.cor || "#FFFFFF" }}
                  onClick={() => navigate(`/quadro/${quadro._id}`)}
                >
                  <div className="board-card-header">
                    <h3>{titulo}</h3>
                    <span className={`shared-permissao-badge ${permissao}`}>
                      {permissao === "editar" ? <Edit3 size={13} /> : <Eye size={13} />}
                      {permissao === "editar" ? "Pode editar" : "Somente leitura"}
                    </span>
                  </div>

                  <div className="compartilhado-dono">
                    <Share2 size={14} />
                    <span>
                      Compartilhado por <strong>{dono?.nome || "um usuário"}</strong>
                    </span>
                  </div>

                  <div className="board-card-footer">
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <FolderKanban size={14} /> Kanban
                    </span>
                    <span className={`badge-importance ${quadro.importancia || "Baixa"}`}>
                      {quadro.importancia || "Baixa"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
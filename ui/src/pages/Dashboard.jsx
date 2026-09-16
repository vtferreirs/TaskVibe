import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Layout, FolderKanban, Sparkles, Clock, Trash2 } from "lucide-react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import CreateBoardModal from "../components/CreateBoardModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [quadros, setQuadros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para o Modal de Exclusão Customizado
  const [boardToDelete, setBoardToDelete] = useState(null);

  const fetchQuadros = useCallback(async (usuarioId) => {
    try {
      const response = await api.get(`/quadro?usuarioId=${usuarioId}`);
      if (Array.isArray(response.data)) {
        const meusQuadros = response.data.filter((q) => {
          const donoId = q.id_usuario?._id || q.id_usuario || q.usuarioId || q.usuario;
          return String(donoId) === String(usuarioId);
        });
        setQuadros(meusQuadros);
      } else {
        setQuadros([]);
      }
    } catch (err) {
      console.error("Erro ao carregar quadros:", err);
      setQuadros([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const me = localStorage.getItem("user");
    if (!me) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(me);
      setUser(userData);
      const userId = userData._id || userData.id;
      fetchQuadros(userId);
    } catch (error) {
      localStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate, fetchQuadros]);

  useEffect(() => {
    if (location.state?.openModal && !loading) {
      setIsModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, loading, navigate]);

  const handleCreateBoard = async ({ titulo, cor, importancia }) => {
    try {
      const response = await api.post("/quadro", {
        titulo_quadro: titulo,
        cor,
        importancia,
      });

      setQuadros((prev) => [...prev, response.data]);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro ao criar quadro:", err);
      alert("Não foi possível criar o quadro.");
    }
  };

  // Abre o modal estilizado salvando o quadro selecionado
  const openDeleteModal = (e, quadro) => {
    e.stopPropagation();
    setBoardToDelete({
      id: quadro._id,
      titulo: quadro.titulo_quadro || quadro.titulo,
    });
  };

  // Executa a exclusão na API
  const handleConfirmDelete = async () => {
    if (!boardToDelete) return;

    try {
      await api.delete(`/quadro/${boardToDelete.id}`);
      setQuadros((prev) => prev.filter((q) => q._id !== boardToDelete.id));
      setBoardToDelete(null);
    } catch (err) {
      console.error("Erro ao deletar quadro:", err);
      alert("Não foi possível excluir o quadro.");
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar user={user} />

      <main className="dashboard-content">
        <div className="dashboard-welcome">
          <h1>Bem-vindo de volta, {user?.nome?.split(" ")[0] || "Usuário"} </h1>
          <p>Gerencie seus projetos e acompanhe seu fluxo de trabalho.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple">
              <FolderKanban size={24} />
            </div>
            <div className="stat-info">
              <h4>Quadros Ativos</h4>
              <span>{quadros.length}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pink">
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <h4>Status da Conta</h4>
              <span>Ativa</span>
            </div>
          </div>
        </div>

        <div className="content-header">
          <h2>Seus Quadros</h2>
          <button onClick={() => setIsModalOpen(true)} className="btn-create-board">
            <Plus size={18} /> Novo Quadro
          </button>
        </div>

        {loading ? (
          <p>Carregando quadros...</p>
        ) : quadros.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Sparkles size={32} />
            </div>
            <h3>Nenhum quadro criado ainda</h3>
            <p>Comece organizando suas tarefas. Crie seu primeiro quadro Kanban agora mesmo!</p>
            <button onClick={() => setIsModalOpen(true)} className="btn-create-board">
              <Plus size={18} /> Criar meu primeiro quadro
            </button>
          </div>
        ) : (
          <div className="boards-grid">
            {quadros.map((quadro) => {
              const titulo = quadro.titulo_quadro || quadro.titulo;
              const usuarioId = String(user?._id || user?.id || "");
              const ehDono =
                String(quadro.id_usuario?._id || quadro.id_usuario || "") === usuarioId;
              return (
                <div
                  key={quadro._id}
                  className="board-card"
                  style={{ background: quadro.cor || "#FFFFFF" }}
                  onClick={() => navigate(`/quadro/${quadro._id}`)}
                >
                  <div className="board-card-header">
                    <h3>{titulo}</h3>
                    {ehDono && (
                      <button
                        className="btn-delete-board"
                        title="Excluir quadro"
                        onClick={(e) => openDeleteModal(e, quadro)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="board-card-footer">
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Layout size={14} /> Kanban
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

      <CreateBoardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateBoard}
      />

      <DeleteConfirmModal
        isOpen={Boolean(boardToDelete)}
        onClose={() => setBoardToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Quadro"
        subjectName={boardToDelete?.titulo || ""}
        message="Tem certeza que deseja excluir o quadro"
        confirmLabel="Sim, excluir"
      />
    </div>
  );
}
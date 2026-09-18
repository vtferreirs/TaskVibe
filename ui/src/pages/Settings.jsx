import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  User,
  Mail,
  CalendarDays,
  KeyRound,
  BellRing,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  ImageOff,
} from "lucide-react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { normalizarNivel } from "../components/cardStatus";
import "./Settings.css";

const formatarData = (data) => {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// Página de configurações da conta: dados pessoais, foto de perfil, senha,
// nível de alertas e exclusão da conta. Cada seção salva separadamente via
// PUT /usuario/:id (a API valida a senha atual para alterações sensíveis).
export default function Settings() {
  const navigate = useNavigate();

  // Usuário carregado do localStorage (persistido no login)
  const [user, setUser] = useState(() => {
    const me = localStorage.getItem("user");
    if (!me) return null;
    try {
      return JSON.parse(me);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Campos do formulário de dados pessoais + foto (preview em base64)
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState("");
  const [fotoPreview, setFotoPreview] = useState("");
  const [nivelAlertas, setNivelAlertas] = useState("intenso");
  const [dataCriacao, setDataCriacao] = useState(null);

  // Campos do formulário de senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  // Estado global de "o que está salvando" + feedback (sucesso/erro) por seção
  const [salvando, setSalvando] = useState("");
  const [feedback, setFeedback] = useState({});

  // Estado do modal de exclusão de conta
  const [modalExclusao, setModalExclusao] = useState(false);
  const [senhaExclusao, setSenhaExclusao] = useState("");

  useEffect(() => {
    // Sem sessão local, volta para o login
    const me = localStorage.getItem("user");
    if (!me) {
      navigate("/login");
      return;
    }

    let userData;
    try {
      userData = JSON.parse(me);
    } catch {
      localStorage.removeItem("user");
      navigate("/login");
      return;
    }

    const userId = userData._id || userData.id;
    if (!userId) {
      localStorage.removeItem("user");
      navigate("/login");
      return;
    }

    // Busca o perfil atualizado na API e preenche os formulários
    api
      .get("/usuario")
      .then((response) => {
        const dados = response.data;
        setNome(dados.nome || "");
        setEmail(dados.email || "");
        setFotoPerfil(dados.foto_perfil || "");
        setFotoPreview(dados.foto_perfil || "");
        // normalizarNivel trata campos antigos (alertas_visuais) e novos (nivel_alertas)
        setNivelAlertas(normalizarNivel(dados.nivel_alertas ?? dados.alertas_visuais));
        setDataCriacao(dados.data_criacao_user);

        // Sincroniza o localStorage com os dados mais recentes
        const atualizado = { ...userData, ...dados };
        localStorage.setItem("user", JSON.stringify(atualizado));
        setUser(atualizado);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  // Helpers de feedback por seção (objeto keyed by seção)
  const feedbackSucesso = (secao, texto) =>
    setFeedback((prev) => ({ ...prev, [secao]: { tipo: "sucesso", texto } }));

  const feedbackErro = (secao, texto) =>
    setFeedback((prev) => ({ ...prev, [secao]: { tipo: "erro", texto } }));

  const limparFeedback = (secao) =>
    setFeedback((prev) => ({ ...prev, [secao]: undefined }));

  // Função única para salvar qualquer dado do usuário (evita duplicação).
  // Após o sucesso, atualiza o estado local e o localStorage, e mostra feedback.
  const salvarUsuario = async (payload, secao, textoSucesso) => {
    const userId = user?._id || user?.id;
    if (!userId) return false;

    try {
      setSalvando(secao);
      const resposta = await api.put(`/usuario/${userId}`, payload);
      const atualizado = resposta.data;

      const guardado = JSON.parse(localStorage.getItem("user")) || {};
      const novoUser = { ...guardado, ...atualizado };
      localStorage.setItem("user", JSON.stringify(novoUser));
      setUser(novoUser);

      setNome(atualizado.nome);
      setEmail(atualizado.email);
      setFotoPerfil(atualizado.foto_perfil || "");
      setFotoPreview(atualizado.foto_perfil || "");
      setNivelAlertas(normalizarNivel(atualizado.nivel_alertas ?? atualizado.alertas_visuais));

      feedbackSucesso(secao, textoSucesso);
      return true;
    } catch (err) {
      feedbackErro(secao, err.response?.data?.message || "Erro ao salvar. Tente novamente.");
      return false;
    } finally {
      setSalvando("");
    }
  };

  // Seção: dados pessoais (nome + e-mail)
  const salvarDados = async (e) => {
    e.preventDefault();
    limparFeedback("dados");
    if (!nome.trim() || !email.trim()) {
      feedbackErro("dados", "Preencha nome e e-mail.");
      return;
    }
    await salvarUsuario({ nome: nome.trim(), email: email.trim() }, "dados", "Dados atualizados com sucesso.");
  };

  // Valida e prepara o arquivo de imagem como base64 para preview (sem enviar ainda)
  const handleFotoChange = (e) => {
    limparFeedback("foto");
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      feedbackErro("foto", "Envie um arquivo de imagem válido.");
      return;
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      feedbackErro("foto", "A imagem deve ter no máximo 2 MB.");
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => setFotoPreview(leitor.result);
    leitor.readAsDataURL(arquivo);
  };

  const salvarFoto = async () => {
    limparFeedback("foto");
    // Só salva se houve mudança real de imagem
    if (!fotoPreview || fotoPreview === fotoPerfil) return;
    await salvarUsuario({ foto_perfil: fotoPreview }, "foto", "Foto de perfil atualizada.");
  };

  const removerFoto = async () => {
    limparFeedback("foto");
    await salvarUsuario({ foto_perfil: "" }, "foto", "Foto de perfil removida.");
  };

  // Seção: alterar senha (a API exige a senha atual para permitir)
  const salvarSenha = async (e) => {
    e.preventDefault();
    limparFeedback("senha");
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      feedbackErro("senha", "Preencha todos os campos de senha.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      feedbackErro("senha", "As novas senhas não coincidem.");
      return;
    }
    const ok = await salvarUsuario(
      { senha: novaSenha, senhaAtual },
      "senha",
      "Senha alterada com sucesso."
    );
    if (ok) {
      // Limpa os campos após sucesso
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    }
  };

  // Opções disponíveis de nível de alertas visuais
  const niveisAlerta = [
    { valor: "desligado", label: "Desligado" },
    { valor: "sutil", label: "Sutil" },
    { valor: "intenso", label: "Intenso" },
  ];

  // Aplica o novo nível otimisticamente; reverte se a API rejeitar
  const alterarNivel = async (novoNivel) => {
    if (novoNivel === nivelAlertas) return;
    limparFeedback("alertas");
    const anterior = nivelAlertas;
    setNivelAlertas(novoNivel);
    const ok = await salvarUsuario(
      { nivel_alertas: novoNivel },
      "alertas",
      `Alertas visuais em nível ${novoNivel}.`
    );
    if (!ok) setNivelAlertas(anterior);
  };

  // Exclui a conta permanentemente (exige a senha; o back-end remove quadros/cards em cascata)
  const excluirConta = async (e) => {
    e.preventDefault();
    limparFeedback("exclusao");
    if (!senhaExclusao) {
      feedbackErro("exclusao", "Informe a sua senha para confirmar a exclusão.");
      return;
    }

    try {
      setSalvando("exclusao");
      const userId = user?._id || user?.id;
      // DELETE com corpo: o axios envia a senha atual no objeto data
      await api.delete(`/usuario/${userId}`, { data: { senhaAtual: senhaExclusao } });
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("/login");
    } catch (err) {
      feedbackErro("exclusao", err.response?.data?.message || "Erro ao excluir a conta. Tente novamente.");
    } finally {
      setSalvando("");
    }
  };

  // Inicial exibida no avatar quando não há foto
  const inicial = (nome || user?.nome || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="settings-container">
      <div className="aurora-bg" />
      <Navbar user={user} />

      <main className="settings-content">
        <div className="settings-header">
          <h1>Configurações</h1>
          <p>Gerencie seus dados, preferências e segurança da conta.</p>
        </div>

        {loading ? (
          <p className="settings-loading">Carregando configurações...</p>
        ) : (
          <div className="settings-stack">
            {/* Cartão de perfil */}
            <section className="settings-card profile-card">
              <div className="avatar-grande">
                {fotoPerfil ? (
                  <img src={fotoPerfil} alt="Foto de perfil" />
                ) : (
                  <span>{inicial}</span>
                )}
              </div>
              <div className="profile-info">
                <h2>{user?.nome}</h2>
                <p>{user?.email}</p>
                <div className="membro-desde">
                  <CalendarDays size={16} />
                  <span>Membro desde {formatarData(dataCriacao || user?.data_criacao_user)}</span>
                </div>
              </div>
            </section>

            <div className="settings-grid">
              {/* Dados pessoais */}
              <section className="settings-card">
              <div className="section-title">
                <Mail size={18} />
                <h2>Dados pessoais</h2>
              </div>
              <form onSubmit={salvarDados} className="settings-form">
                <div className="form-group">
                  <label htmlFor="nome">Nome de exibição</label>
                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      limparFeedback("dados");
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      limparFeedback("dados");
                    }}
                  />
                </div>

                {feedback.dados && (
                  <div className={`settings-feedback ${feedback.dados.tipo}`}>
                    {feedback.dados.tipo === "sucesso" ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertTriangle size={16} />
                    )}
                    {feedback.dados.texto}
                  </div>
                )}

                <button type="submit" className="btn-submit" disabled={salvando === "dados"}>
                  <Save size={16} />
                  {salvando === "dados" ? "Salvando..." : "Salvar alterações"}
                </button>
              </form>
            </section>

            {/* Foto de perfil */}
            <section className="settings-card">
              <div className="section-title">
                <User size={18} />
                <h2>Foto de perfil</h2>
              </div>

              <div className="foto-upload">
                <div className="avatar-upload">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Prévia da foto" />
                  ) : (
                    <div className="avatar-upload-placeholder">
                      <Camera size={26} />
                    </div>
                  )}
                </div>
                <div className="foto-actions">
                  <label className="btn-outline">
                    <ImagePlus size={16} />
                    Escolher imagem
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      style={{ display: "none" }}
                    />
                  </label>
                  {fotoPreview && fotoPreview !== fotoPerfil && (
                    <button
                      type="button"
                      onClick={salvarFoto}
                      className="btn-submit"
                      disabled={salvando === "foto"}
                    >
                      <Save size={16} />
                      {salvando === "foto" ? "Salvando..." : "Salvar foto"}
                    </button>
                  )}
                  {fotoPerfil && (
                    <button type="button" onClick={removerFoto} className="btn-danger-ghost">
                      <ImageOff size={16} />
                      Remover foto
                    </button>
                  )}
                </div>
              </div>

              {feedback.foto && (
                <div className={`settings-feedback ${feedback.foto.tipo}`}>
                  {feedback.foto.tipo === "sucesso" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                  {feedback.foto.texto}
                </div>
              )}

              <p className="field-hint">
                Imagem em formato JPG, PNG ou WebP com até 2 MB.
              </p>
            </section>

            {/* Alterar senha */}
            <section className="settings-card">
              <div className="section-title">
                <KeyRound size={18} />
                <h2>Alterar senha</h2>
              </div>
              <form onSubmit={salvarSenha} className="settings-form">
                <div className="form-group">
                  <label htmlFor="senhaAtual">Senha atual</label>
                  <input
                    id="senhaAtual"
                    name="senhaAtual"
                    type="password"
                    autoComplete="current-password"
                    value={senhaAtual}
                    onChange={(e) => {
                      setSenhaAtual(e.target.value);
                      limparFeedback("senha");
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="novaSenha">Nova senha</label>
                  <input
                    id="novaSenha"
                    name="novaSenha"
                    type="password"
                    autoComplete="new-password"
                    value={novaSenha}
                    onChange={(e) => {
                      setNovaSenha(e.target.value);
                      limparFeedback("senha");
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmarSenha">Confirmar nova senha</label>
                  <input
                    id="confirmarSenha"
                    name="confirmarSenha"
                    type="password"
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(e) => {
                      setConfirmarSenha(e.target.value);
                      limparFeedback("senha");
                    }}
                  />
                </div>

                {feedback.senha && (
                  <div className={`settings-feedback ${feedback.senha.tipo}`}>
                    {feedback.senha.tipo === "sucesso" ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertTriangle size={16} />
                    )}
                    {feedback.senha.texto}
                  </div>
                )}

                <button type="submit" className="btn-submit" disabled={salvando === "senha"}>
                  <Save size={16} />
                  {salvando === "senha" ? "Salvando..." : "Alterar senha"}
                </button>
              </form>
            </section>

            {/* Alertas visuais */}
            <section className="settings-card">
              <div className="section-title">
                <BellRing size={18} />
                <h2>Notificações</h2>
              </div>

              <div className="alerta-opcao">
                <div className="alerta-texto">
                  <strong>Alertas visuais de tarefas</strong>
                  <p>
                    Destaca automaticamente as tarefas conforme o prazo de entrega:
                  </p>
                  <ul className="alerta-lista">
                    <li>
                      <span className="alerta-dot alerta-dot--vencido" />
                      Tarja preta no topo e selo <strong>"Atrasado"</strong> quando a data de
                      entrega já passou e a tarefa não foi concluída.
                    </li>
                    <li>
                      <span className="alerta-dot alerta-dot--concluido" />
                      Selo <strong>"Concluído com atraso"</strong> quando a tarefa foi concluída
                      depois do prazo.
                    </li>
                    <li>
                      <span className="alerta-dot alerta-dot--proximo" />
                      Tarja secundária colorida e selo <strong>"Vence hoje / amanhã / em N dias"</strong>{" "}
                      conforme a proximidade do vencimento, além de contadores de tarefas
                      atrasadas e vencendo no topo de cada coluna.
                    </li>
                  </ul>
                </div>

                <div className="nivel-alertas" role="group" aria-label="Nível dos alertas visuais">
                  {niveisAlerta.map((nivel) => (
                    <button
                      key={nivel.valor}
                      type="button"
                      className={`nivel-alertas-opcao ${
                        nivelAlertas === nivel.valor ? "ativo" : ""
                      }`}
                      onClick={() => alterarNivel(nivel.valor)}
                      disabled={salvando === "alertas"}
                      aria-pressed={nivelAlertas === nivel.valor}
                    >
                      {nivel.label}
                    </button>
                  ))}
                </div>

                <p className="alerta-nota">
                  <strong>Sutil</strong> mostra as tarjas e contadores sem animação;{" "}
                  <strong>Intenso</strong> adiciona brilho nas tarjas e pulso no selo de
                  vencimento próximo; <strong>Desligado</strong> oculta as tarjas de prazo, o
                  rótulo de prazo e os contadores por coluna. Os avisos de atraso continuam
                  sempre visíveis.
                </p>
              </div>

              {feedback.alertas && (
                <div className={`settings-feedback ${feedback.alertas.tipo}`}>
                  {feedback.alertas.tipo === "sucesso" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                  {salvando === "alertas"
                    ? "Salvando preferência..."
                    : feedback.alertas.texto}
                </div>
              )}
            </section>

            </div>

            {/* Zona de perigo */}
            <section className="settings-card danger-card">
              <div className="section-title danger-title">
                <AlertTriangle size={18} />
                <h2>Zona de perigo</h2>
              </div>
              <p className="danger-text">
                Ao excluir sua conta, todos os seus quadros, colunas e tarefas serão
                permanentemente removidos. Esta ação não pode ser desfeita.
              </p>
              <button type="button" className="btn-danger" onClick={() => setModalExclusao(true)}>
                <Trash2 size={16} />
                Excluir conta
              </button>
            </section>
          </div>
        )}
      </main>

      {modalExclusao && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title">
                <AlertTriangle size={20} style={{ color: "var(--danger)" }} />
                <h3>Excluir conta</h3>
              </div>
              <button className="btn-close" onClick={() => setModalExclusao(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={excluirConta} className="modal-body">
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0, lineHeight: 1.5 }}>
                Tem certeza que deseja excluir a conta{" "}
                <strong style={{ color: "var(--text-primary)" }}>&ldquo;{user?.email}&rdquo;</strong>?
                Todos os seus quadros e tarefas associados serão removidos permanentemente.
              </p>
              <span style={{ color: "var(--danger)", fontSize: "0.82rem", fontWeight: 600 }}>
                Essa ação é permanente e não pode ser desfeita.
              </span>

              <div className="form-group">
                <label htmlFor="senhaExclusao">Digite sua senha para confirmar</label>
                <input
                  id="senhaExclusao"
                  name="senhaExclusao"
                  type="password"
                  autoComplete="current-password"
                  value={senhaExclusao}
                  onChange={(e) => {
                    setSenhaExclusao(e.target.value);
                    limparFeedback("exclusao");
                  }}
                />
              </div>

              {feedback.exclusao && (
                <div className={`settings-feedback ${feedback.exclusao.tipo}`}>
                  <AlertTriangle size={16} />
                  {feedback.exclusao.texto}
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: "4px" }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalExclusao(false)}
                  disabled={salvando === "exclusao"}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  style={{ background: "var(--danger)" }}
                  disabled={salvando === "exclusao"}
                >
                  <Trash2 size={16} />
                  {salvando === "exclusao" ? "Excluindo..." : "Excluir conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
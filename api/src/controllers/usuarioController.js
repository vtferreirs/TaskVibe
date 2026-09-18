import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.js";
import Quadro from "../models/quadro.js";
import Coluna from "../models/coluna.js";
import Card from "../models/card.js";

// Cria o token JWT do usuário autenticado.
// O id fica no "payload" e expira em 7 dias (o middleware auth.js valida esse token depois).
const gerarToken = (usuario) => {
  return jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const NIVEIS_ALERTA = ["desligado", "sutil", "intenso"];

// Deriva o nível de alerta válido do usuário, com regras de compatibilidade:
// valor válido mantém; alertas desligados vira "desligado"; senão assume "intenso".
const normalizarNivel = (usuario) => {
  if (NIVEIS_ALERTA.includes(usuario?.nivel_alertas)) return usuario.nivel_alertas;
  if (usuario?.alertas_visuais === false) return "desligado";
  return "intenso";
};

// Monta a "visão pública" do usuário: nunca expõe a senha (nem o hash).
// É o que as rotas de usuário devolvem para o front.
const usuarioPublico = (usuario) => {
  const nivelAlertas = normalizarNivel(usuario);
  return {
    _id: usuario._id,
    nome: usuario.nome,
    email: usuario.email,
    foto_perfil: usuario.foto_perfil || "",
    nivel_alertas: nivelAlertas,
    alertas_visuais: nivelAlertas !== "desligado",
    data_criacao_user: usuario.data_criacao_user,
  };
};

// Escapa metacaracteres de regex para buscar e-mail literalmente,
// sem que "." (entre outros) signifique "qualquer caractere"
const escaparRegex = (texto) =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Confere a senha informada com a do banco, lidando com os dois formatos:
// hash bcrypt (começa com "$2") ou texto puro (conta antiga pré-migração)
const conferirSenhaAtual = async (usuario, senhaAtual) => {
  if (!senhaAtual) return false;
  if (usuario.senha.startsWith("$2")) {
    return bcrypt.compare(senhaAtual, usuario.senha);
  }
  // Caso legado: senha ainda em texto puro (comparação direta)
  return usuario.senha === senhaAtual;
};

// Após editar perfil, sincroniza nome/e-mail em todos os quadros em que o usuário
// aparece como membro — evita que a tela do membro exiba dados desatualizados
const propagarDadosEmQuadros = async (usuario) => {
  await Quadro.updateMany(
    { "membros.id_usuario": usuario._id },
    { $set: { "membros.$.email": usuario.email, "membros.$.nome": usuario.nome } }
  );
};

export const getUsuario = async (req, res) => {
  try {
    // O id autenticado vem do middleware auth.js (req.usuarioId)
    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    res.json(usuarioPublico(usuario));
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar usuário." });
  }
};

export const postUsuario = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Preencha todos os campos." });
    }

    // Impede cadastro duplicado por e-mail (o index único do banco é o reforço final)
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ message: "Já existe uma conta cadastrada com este e-mail." });
    }

    // Nunca guarda a senha em texto puro: aplica hash bcrypt com custo 10
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    const novoUsuario = await Usuario.create({
      nome,
      email,
      senha: senhaCriptografada,
      nivel_alertas: "intenso",
      alertas_visuais: true,
    });

    // Cadastro já devolve o token (login automático após registrar)
    res.status(201).json({ ...usuarioPublico(novoUsuario), token: gerarToken(novoUsuario) });
  } catch (error) {
    res.status(400).json({ message: "Erro ao criar usuário. Verifique os dados enviados." });
  }
};

export const postLogin = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ message: "Preencha e-mail e senha." });
    }

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      // Mensagem genérica para não revelar se o e-mail existe ou não
      return res.status(401).json({ message: "E-mail ou senha incorretos." });
    }

    let senhaValida;
    if (usuario.senha.startsWith("$2")) {
      senhaValida = await bcrypt.compare(senha, usuario.senha);
    } else {
      // Migração de contas antigas que ainda têm senha em texto puro:
      // compara em texto puro uma última vez e, se conferir, reescreve como hash
      senhaValida = usuario.senha === senha;
      if (senhaValida) {
        usuario.senha = await bcrypt.hash(senha, 10);
        await usuario.save();
      }
    }

    if (!senhaValida) {
      return res.status(401).json({ message: "E-mail ou senha incorretos." });
    }

    // Login válido: devolve dados públicos + token de 7 dias
    res.json({ ...usuarioPublico(usuario), token: gerarToken(usuario) });
  } catch (error) {
    res.status(500).json({ message: "Erro ao realizar login." });
  }
};

export const putUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // Só é permitido editar a própria conta (o id da URL deve ser o seu)
    if (String(usuario._id) !== String(req.params.id)) {
      return res.status(403).json({ message: "Você só pode editar o seu próprio usuário." });
    }

    const { nome, email, senha, senhaAtual, foto_perfil, nivel_alertas, alertas_visuais } =
      req.body;

    // Trocar senha exige confirmar a senha atual; novo valor sempre vira hash bcrypt
    if (senha) {
      if (!senhaAtual) {
        return res.status(400).json({ message: "Informe a senha atual para alterar a senha." });
      }
      const senhaAceita = await conferirSenhaAtual(usuario, senhaAtual);
      if (!senhaAceita) {
        return res.status(401).json({ message: "Senha atual incorreta." });
      }
      usuario.senha = await bcrypt.hash(senha, 10);
    }

    // Alteração de nome: compara ignorando espaços/caixa e checa duplicidade
    // (o schema exige nome único)
    if (nome !== undefined && String(usuario.nome).trim().toLowerCase() !== String(nome).trim().toLowerCase()) {
      const nomeEmUso = await Usuario.findOne({ nome, _id: { $ne: usuario._id } });
      if (nomeEmUso) {
        return res.status(400).json({ message: "Já existe um usuário com este nome." });
      }
      usuario.nome = nome;
    }

    // Alteração de e-mail: busca por igualdade literal, ignorando caixa,
    // e exclui o próprio usuário da verificação de duplicidade
    if (email !== undefined && String(usuario.email).trim().toLowerCase() !== String(email).trim().toLowerCase()) {
      const emailEmUso = await Usuario.findOne({
        email: { $regex: new RegExp(`^${escaparRegex(email.trim())}$`, "i") },
        _id: { $ne: usuario._id },
      });
      if (emailEmUso) {
        return res.status(400).json({ message: "Já existe uma conta cadastrada com este e-mail." });
      }
      usuario.email = email;
    }

    if (foto_perfil !== undefined) usuario.foto_perfil = foto_perfil;

    // Mantém os campos de alertas coerentes entre si:
    // nível definido explicitamente atualiza o booleano; senão, o booleano define o nível
    if (nivel_alertas !== undefined) {
      if (!NIVEIS_ALERTA.includes(nivel_alertas)) {
        return res.status(400).json({ message: "Nível de alertas inválido." });
      }
      usuario.nivel_alertas = nivel_alertas;
      usuario.alertas_visuais = nivel_alertas !== "desligado";
    } else if (alertas_visuais !== undefined) {
      const ativo = alertas_visuais === true || alertas_visuais === "true";
      usuario.nivel_alertas = ativo ? "intenso" : "desligado";
      usuario.alertas_visuais = ativo;
    }

    const usuarioAtualizado = await usuario.save();
    // Sincroniza nome/e-mail atualizados nos quadros onde o usuário é membro
    await propagarDadosEmQuadros(usuarioAtualizado);

    res.json(usuarioPublico(usuarioAtualizado));
  } catch (error) {
    res.status(400).json({ message: "Erro ao atualizar usuário." });
  }
};

export const deleteUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // Só o próprio usuário pode excluir a conta
    if (String(usuario._id) !== String(req.params.id)) {
      return res.status(403).json({ message: "Você só pode excluir o seu próprio usuário." });
    }

    // Segurança extra: exige a senha atual antes de apagar tudo
    const { senhaAtual } = req.body;
    if (!senhaAtual) {
      return res.status(400).json({ message: "Informe a senha atual para excluir a conta." });
    }
    const senhaAceita = await conferirSenhaAtual(usuario, senhaAtual);
    if (!senhaAceita) {
      return res.status(401).json({ message: "Senha atual incorreta." });
    }

    // Exclusão em cascata manual dos quadros do usuário:
    // apaga cards e colunas antes, pois são ligados ao quadro por id_quadro
    const quadrosDoUsuario = await Quadro.find({ id_usuario: usuario._id }).select("_id");
    const idsQuadros = quadrosDoUsuario.map((quadro) => quadro._id);

    if (idsQuadros.length > 0) {
      await Card.deleteMany({ id_quadro: { $in: idsQuadros } });
      await Coluna.deleteMany({ id_quadro: { $in: idsQuadros } });
      await Quadro.deleteMany({ _id: { $in: idsQuadros } });
    }

    // Remove o usuário da lista de membros dos quadros onde participava como convidado
    await Quadro.updateMany(
      { "membros.id_usuario": usuario._id },
      { $pull: { membros: { id_usuario: usuario._id } } }
    );

    await Usuario.findByIdAndDelete(usuario._id);
    res.json({ message: "Usuário deletado com sucesso." });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar usuário." });
  }
};
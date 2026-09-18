import Quadro from "../models/quadro.js";
import Usuario from "../models/usuario.js";
import {
  permissaoQuadro,
  ehDono,
} from "../utils/permissaoQuadro.js";

// Converte qualquer entrada de permissão de membro nos dois valores válidos.
// Qualquer coisa que não seja "editar" vira "visualizar" (mínimo garantido de segurança).
const NORMALIZAR_PERMISSAO = (permissao) =>
  permissao === "editar" ? "editar" : "visualizar";

// Escapa metacaracteres de regex para que a busca por e-mail seja literal,
// sem que caracteres como "." (qualquer caractere) mudem o comportamento da busca
const escaparRegex = (texto) =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getQuadro = async (req, res) => {
  try {
    // GET /quadro?id=<id> -> quadro específico; GET /quadro -> todos os acessíveis
    const { id } = req.query;

    if (id) {
      // Ver quadro exige ter algum nível de acesso
      const permissao = await permissaoQuadro(id, req.usuarioId);
      if (!permissao) {
        return res.status(404).json({ message: "Quadro não encontrado." });
      }
      // populate traz os dados do dono para exibir nome/e-mail junto do quadro
      const quadro = await Quadro.findById(id).populate("id_usuario", "nome email");
      return res.json(quadro);
    }

    // Lista apenas quadros em que o usuário é dono OU membro,
    // com os mais recentes primeiro
    const quadros = await Quadro.find({
      $or: [{ id_usuario: req.usuarioId }, { "membros.id_usuario": req.usuarioId }],
    })
      .populate("id_usuario", "nome email")
      .sort({ data_criacao_quadro: -1 });

    res.json(quadros);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar quadros." });
  }
};

export const postQuadro = async (req, res) => {
  try {
    const { titulo_quadro, cor, importancia } = req.body;
    // Criar quadro é uma ação pessoal: registra o usuário autenticado como dono
    const novoQuadro = await Quadro.create({
      titulo_quadro,
      cor,
      importancia,
      id_usuario: req.usuarioId,
    });
    res.status(201).json(novoQuadro);
  } catch (error) {
    res.status(400).json({ message: "Erro ao criar quadro." });
  }
};

export const putQuadro = async (req, res) => {
  try {
    // Editar as configurações do quadro é exclusivo do dono
    const permissao = await permissaoQuadro(req.params.id, req.usuarioId);
    if (!ehDono(permissao)) {
      return res.status(403).json({ message: "Apenas o dono pode editar o quadro." });
    }

    const quadroAtualizado = await Quadro.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // new: retorna o doc atualizado; runValidators: revalida o schema
    );

    if (!quadroAtualizado) {
      return res.status(404).json({ message: "Quadro não encontrado." });
    }

    res.json(quadroAtualizado);
  } catch (error) {
    res.status(400).json({ message: "Erro ao atualizar quadro." });
  }
};

export const deleteQuadro = async (req, res) => {
  try {
    // Exclusão é exclusiva do dono
    const permissao = await permissaoQuadro(req.params.id, req.usuarioId);
    if (!ehDono(permissao)) {
      return res.status(403).json({ message: "Apenas o dono pode excluir o quadro." });
    }

    const quadroDeletado = await Quadro.findByIdAndDelete(req.params.id);

    if (!quadroDeletado) {
      return res.status(404).json({ message: "Quadro não encontrado." });
    }

    res.json({ message: "Quadro deletado com sucesso.", quadroDeletado });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar quadro." });
  }
};

export const addMembro = async (req, res) => {
  try {
    const quadro = await Quadro.findById(req.params.id);
    if (!quadro) {
      return res.status(404).json({ message: "Quadro não encontrado." });
    }

    // Convidar membros também é exclusivo do dono
    const permissaoDono = await permissaoQuadro(req.params.id, req.usuarioId);
    if (!ehDono(permissaoDono)) {
      return res.status(403).json({ message: "Apenas o dono pode convidar membros." });
    }

    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Informe o e-mail do usuário." });
    }

    // Busca o usuário pelo e-mail exato, ignorando maiúsculas/minúsculas
    // (a regex por e-mail é escapada para comparação literal, sem metacaracteres)
    const convidado = await Usuario.findOne({
      email: { $regex: new RegExp(`^${escaparRegex(email.trim())}$`, "i") },
    });

    if (!convidado) {
      return res
        .status(404)
        .json({ message: "Usuário não encontrado. Verifique o e-mail cadastrado." });
    }

    // Não faz sentido o dono se convidar para o próprio quadro
    if (String(quadro.id_usuario) === String(convidado._id)) {
      return res.status(400).json({ message: "Este quadro já é seu." });
    }

    // Evita convidar alguém que já é membro
    const jaMembro = quadro.membros.some(
      (m) => String(m.id_usuario) === String(convidado._id)
    );
    if (jaMembro) {
      return res.status(400).json({ message: "Este usuário já é membro do quadro." });
    }

    // Guarda nome/e-mail no convite para exibir mesmo se o usuário mudar depois
    quadro.membros.push({
      id_usuario: convidado._id,
      email: convidado.email,
      nome: convidado.nome,
      permissao: NORMALIZAR_PERMISSAO(req.body.permissao),
    });
    await quadro.save();

    res.status(201).json(quadro);
  } catch (error) {
    res.status(500).json({ message: "Erro ao adicionar membro." });
  }
};

export const updateMembro = async (req, res) => {
  try {
    const quadro = await Quadro.findById(req.params.id);
    if (!quadro) {
      return res.status(404).json({ message: "Quadro não encontrado." });
    }

    // Alterar permissão é exclusivo do dono
    const permissaoDono = await permissaoQuadro(req.params.id, req.usuarioId);
    if (!ehDono(permissaoDono)) {
      return res.status(403).json({ message: "Apenas o dono pode alterar permissões." });
    }

    // Aceita tanto o id da entrada de membro (m._id) quanto o id do usuário (m.id_usuario)
    const membro = quadro.membros.find(
      (m) => String(m._id) === String(req.params.membroId) || String(m.id_usuario) === String(req.params.membroId)
    );

    if (!membro) {
      return res.status(404).json({ message: "Membro não encontrado." });
    }

    // Evita remover a própria permissão de dono
    if (String(membro.id_usuario) === String(quadro.id_usuario)) {
      return res.status(400).json({ message: "O dono não tem permissão editável." });
    }

    // Normaliza para "editar"/"visualizar" antes de salvar
    membro.permissao = NORMALIZAR_PERMISSAO(req.body.permissao);
    await quadro.save();

    res.json(quadro);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar membro." });
  }
};

export const deleteMembro = async (req, res) => {
  try {
    const quadro = await Quadro.findById(req.params.id);
    if (!quadro) {
      return res.status(404).json({ message: "Quadro não encontrado." });
    }

    // Remover membro é exclusivo do dono
    const permissaoDono = await permissaoQuadro(req.params.id, req.usuarioId);
    if (!ehDono(permissaoDono)) {
      return res.status(403).json({ message: "Apenas o dono pode remover membros." });
    }

    const membro = quadro.membros.find(
      (m) => String(m._id) === String(req.params.membroId) || String(m.id_usuario) === String(req.params.membroId)
    );

    if (!membro) {
      return res.status(404).json({ message: "Membro não encontrado." });
    }

    // O dono nunca pode ser removido pelo sistema de membros
    if (String(membro.id_usuario) === String(quadro.id_usuario)) {
      return res.status(400).json({ message: "O dono não pode ser removido." });
    }

    // Filtra o array removendo apenas a entrada do membro
    quadro.membros = quadro.membros.filter(
      (m) => String(m._id) !== String(membro._id)
    );
    await quadro.save();

    res.json(quadro);
  } catch (error) {
    res.status(500).json({ message: "Erro ao remover membro." });
  }
};
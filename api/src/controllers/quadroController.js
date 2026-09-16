import Quadro from "../models/quadro.js";
import Usuario from "../models/usuario.js";
import {
  permissaoQuadro,
  ehDono,
} from "../utils/permissaoQuadro.js";

const NORMALIZAR_PERMISSAO = (permissao) =>
  permissao === "editar" ? "editar" : "visualizar";

const escaparRegex = (texto) =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getQuadro = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      const permissao = await permissaoQuadro(id, req.usuarioId);
      if (!permissao) {
        return res.status(404).json({ message: "Quadro não encontrado." });
      }
      const quadro = await Quadro.findById(id).populate("id_usuario", "nome email");
      return res.json(quadro);
    }

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
    const permissao = await permissaoQuadro(req.params.id, req.usuarioId);
    if (!ehDono(permissao)) {
      return res.status(403).json({ message: "Apenas o dono pode editar o quadro." });
    }

    const quadroAtualizado = await Quadro.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
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

    const permissaoDono = await permissaoQuadro(req.params.id, req.usuarioId);
    if (!ehDono(permissaoDono)) {
      return res.status(403).json({ message: "Apenas o dono pode convidar membros." });
    }

    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Informe o e-mail do usuário." });
    }

    const convidado = await Usuario.findOne({
      email: { $regex: new RegExp(`^${escaparRegex(email.trim())}$`, "i") },
    });

    if (!convidado) {
      return res
        .status(404)
        .json({ message: "Usuário não encontrado. Verifique o e-mail cadastrado." });
    }

    if (String(quadro.id_usuario) === String(convidado._id)) {
      return res.status(400).json({ message: "Este quadro já é seu." });
    }

    const jaMembro = quadro.membros.some(
      (m) => String(m.id_usuario) === String(convidado._id)
    );
    if (jaMembro) {
      return res.status(400).json({ message: "Este usuário já é membro do quadro." });
    }

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

    const permissaoDono = await permissaoQuadro(req.params.id, req.usuarioId);
    if (!ehDono(permissaoDono)) {
      return res.status(403).json({ message: "Apenas o dono pode alterar permissões." });
    }

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

    if (String(membro.id_usuario) === String(quadro.id_usuario)) {
      return res.status(400).json({ message: "O dono não pode ser removido." });
    }

    quadro.membros = quadro.membros.filter(
      (m) => String(m._id) !== String(membro._id)
    );
    await quadro.save();

    res.json(quadro);
  } catch (error) {
    res.status(500).json({ message: "Erro ao remover membro." });
  }
};
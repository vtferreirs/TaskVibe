import Card from "../models/card.js";
import {
  permissaoQuadro,
  quadrosAcessiveis,
  podeEditarQuadro,
} from "../utils/permissaoQuadro.js";

export const getCard = async (req, res) => {
  try {
    const { id_quadro } = req.query;

    if (id_quadro) {
      const permissao = await permissaoQuadro(id_quadro, req.usuarioId);
      if (!permissao) {
        return res.status(403).json({ message: "Sem acesso a este quadro." });
      }
      const cards = await Card.find({ id_quadro });
      return res.json(cards);
    }

    const quadros = await quadrosAcessiveis(req.usuarioId);
    const cards = await Card.find({ id_quadro: { $in: quadros } });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar cards." });
  }
};

export const postCard = async (req, res) => {
  try {
    const permissao = await permissaoQuadro(req.body.id_quadro, req.usuarioId);
    if (!podeEditarQuadro(permissao)) {
      return res.status(403).json({ message: "Sem permissão de edição neste quadro." });
    }

    const novoCard = await Card.create(req.body);
    res.status(201).json(novoCard);
  } catch (error) {
    console.error("Erro no Mongoose ao criar card:", error);
    res.status(400).json({ message: "Erro ao criar card.", detalhe: error.message });
  }
};

export const putCard = async (req, res) => {
  try {
    const cardAtual = await Card.findById(req.params.id);
    if (!cardAtual) {
      return res.status(404).json({ message: "Card não encontrado." });
    }

    const permissao = await permissaoQuadro(cardAtual.id_quadro, req.usuarioId);
    if (!podeEditarQuadro(permissao)) {
      return res.status(403).json({ message: "Sem permissão de edição neste quadro." });
    }

    const cardAtualizado = await Card.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(cardAtualizado);
  } catch (error) {
    res.status(400).json({ message: "Erro ao atualizar card." });
  }
};

export const deleteCard = async (req, res) => {
  try {
    const cardAtual = await Card.findById(req.params.id);
    if (!cardAtual) {
      return res.status(404).json({ message: "Card não encontrado." });
    }

    const permissao = await permissaoQuadro(cardAtual.id_quadro, req.usuarioId);
    if (!podeEditarQuadro(permissao)) {
      return res.status(403).json({ message: "Sem permissão de edição neste quadro." });
    }

    const cardDeletado = await Card.findByIdAndDelete(req.params.id);
    res.json({ message: "Card deletado com sucesso.", cardDeletado });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar card." });
  }
};
import Coluna from "../models/coluna.js";
import {
  permissaoQuadro,
  quadrosAcessiveis,
  podeEditarQuadro,
} from "../utils/permissaoQuadro.js";

export const getColuna = async (req, res) => {
  try {
    // Busca com ?id_quadro=<id> (colunas de um quadro) ou global (todas as acessíveis)
    const { id_quadro } = req.query;

    if (id_quadro) {
      // Listar colunas exige apenas leitura do quadro
      const permissao = await permissaoQuadro(id_quadro, req.usuarioId);
      if (!permissao) {
        return res.status(403).json({ message: "Sem acesso a este quadro." });
      }
      // Ordena por `ordem` para o front mostrar as colunas na posição correta
      const colunas = await Coluna.find({ id_quadro }).sort({ ordem: 1 });
      return res.json(colunas);
    }

    // Busca global: quadros onde o usuário é dono/membro, com as mesmas regras de ordenação
    const quadros = await quadrosAcessiveis(req.usuarioId);
    const colunas = await Coluna.find({ id_quadro: { $in: quadros } }).sort({ ordem: 1 });
    res.json(colunas);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar colunas." });
  }
};

export const postColuna = async (req, res) => {
  try {
    // Criar coluna é escrita: exige "dono" ou "editar"
    const permissao = await permissaoQuadro(req.body.id_quadro, req.usuarioId);
    if (!podeEditarQuadro(permissao)) {
      return res.status(403).json({ message: "Sem permissão de edição neste quadro." });
    }

    const { id_quadro } = req.body;
    // Se o front não enviar uma ordem, usa a contagem atual de colunas do quadro
    // (ex.: 3 colunas existentes -> próxima recebe ordem 3)
    const proximaOrdem = await Coluna.countDocuments(
      id_quadro ? { id_quadro } : {}
    );

    const novaColuna = await Coluna.create({
      ...req.body,
      ordem: req.body.ordem != null ? req.body.ordem : proximaOrdem,
    });

    res.status(201).json(novaColuna);
  } catch (error) {
    res.status(400).json({ message: "Erro ao criar coluna." });
  }
};

export const putColuna = async (req, res) => {
  try {
    const colunaAtual = await Coluna.findById(req.params.id);
    if (!colunaAtual) {
      return res.status(404).json({ message: "Coluna não encontrada." });
    }

    // Permissão verificada pelo quadro a que a coluna pertence
    const permissao = await permissaoQuadro(colunaAtual.id_quadro, req.usuarioId);
    if (!podeEditarQuadro(permissao)) {
      return res.status(403).json({ message: "Sem permissão de edição neste quadro." });
    }

    // runValidators reaplica as validações do schema na atualização
    const colunaAtualizada = await Coluna.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(colunaAtualizada);
  } catch (error) {
    res.status(400).json({ message: "Erro ao atualizar coluna." });
  }
};

export const deleteColuna = async (req, res) => {
  try {
    const colunaAtual = await Coluna.findById(req.params.id);
    if (!colunaAtual) {
      return res.status(404).json({ message: "Coluna não encontrada." });
    }

    // Excluir é escrita: exige "dono" ou "editar"
    const permissao = await permissaoQuadro(colunaAtual.id_quadro, req.usuarioId);
    if (!podeEditarQuadro(permissao)) {
      return res.status(403).json({ message: "Sem permissão de edição neste quadro." });
    }

    const colunaDeletada = await Coluna.findByIdAndDelete(req.params.id);
    res.json({ message: "Coluna deletada com sucesso.", colunaDeletada });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar coluna." });
  }
};
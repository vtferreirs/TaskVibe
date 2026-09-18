import Card from "../models/card.js";
import {
  permissaoQuadro,
  quadrosAcessiveis,
  podeEditarQuadro,
} from "../utils/permissaoQuadro.js";

// Verdadeiro quando o card está marcado como concluído.
// Normaliza o dado booleano antes de decidir se data_conclusao precisa ser preenchida.
const ehConcluido = (card) => card?.concluido === true;

export const getCard = async (req, res) => {
  try {
    // Busca pode vir com ?id_quadro=<id> (cards de um quadro específico)
    // ou sem filtro (todos os cards acessíveis ao usuário)
    const { id_quadro } = req.query;

    if (id_quadro) {
      // Listar cards de um quadro exige apenas ter algum acesso (leitura basta)
      const permissao = await permissaoQuadro(id_quadro, req.usuarioId);
      if (!permissao) {
        return res.status(403).json({ message: "Sem acesso a este quadro." });
      }
      const cards = await Card.find({ id_quadro });
      return res.json(cards);
    }

    // Busca global: descobre os quadros onde o usuário é dono/membro e traz os cards deles
    const quadros = await quadrosAcessiveis(req.usuarioId);
    const cards = await Card.find({ id_quadro: { $in: quadros } });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar cards." });
  }
};

export const postCard = async (req, res) => {
  try {
    // Criar card é escrita: exige permissão "dono" ou "editar" no quadro
    const permissao = await permissaoQuadro(req.body.id_quadro, req.usuarioId);
    if (!podeEditarQuadro(permissao)) {
      return res.status(403).json({ message: "Sem permissão de edição neste quadro." });
    }

    // Aceita tanto boolean quanto a string "true" vinda do front-end
    const concluido =
      req.body.concluido === true || req.body.concluido === "true";

    const novoCard = await Card.create({
      ...req.body,
      concluido,
      // Marca o momento da conclusão apenas se o card já nasce concluído
      data_conclusao: concluido ? new Date() : null,
    });
    res.status(201).json(novoCard);
  } catch (error) {
    console.error("Erro no Mongoose ao criar card:", error);
    // 400 porque o erro costuma ser de validação dos dados enviados
    res.status(400).json({ message: "Erro ao criar card.", detalhe: error.message });
  }
};

export const putCard = async (req, res) => {
  try {
    const cardAtual = await Card.findById(req.params.id);
    if (!cardAtual) {
      return res.status(404).json({ message: "Card não encontrado." });
    }

    // A permissão é verificada pelo quadro que o card pertence, não pelo card em si
    const permissao = await permissaoQuadro(cardAtual.id_quadro, req.usuarioId);
    if (!podeEditarQuadro(permissao)) {
      return res.status(403).json({ message: "Sem permissão de edição neste quadro." });
    }

    const dados = { ...req.body };

    // Controla a data de conclusão: só é preenchida/limpa quando o estado muda.
    // Se a requisição não menciona `concluido`, mantém o valor atual do card.
    const estavaConcluido = ehConcluido(cardAtual);
    const ficaraConcluido =
      dados.concluido !== undefined
        ? dados.concluido === true || dados.concluido === "true"
        : estavaConcluido;

    if (ficaraConcluido !== estavaConcluido) {
      dados.data_conclusao = ficaraConcluido ? new Date() : null;
    }
    dados.concluido = ficaraConcluido;

    // runValidators: reaplica as validações do schema (ex.: formato do horário) na atualização
    const cardAtualizado = await Card.findByIdAndUpdate(
      req.params.id,
      dados,
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

    // Excluir é escrita: exige "dono" ou "editar" no quadro do card
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
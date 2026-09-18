import mongoose from "mongoose";
import Quadro from "../models/quadro.js";

// Converte um campo em string de id, aceitando tanto o valor direto quanto
// um documento do Mongoose que tenha o campo _id (ex.: ao passar um popule).
const textoId = (valor) => (valor && valor._id ? String(valor._id) : String(valor || ""));

// Núcleo do controle de acesso. Dado um quadro e um usuário, responde:
//   "dono"      -> usuário é o criador do quadro (pode tudo, inclusive gerir membros)
//   "editar"    -> membro convidado com permissão de edição (cria/edita/deleta cards e colunas)
//   "visualizar"-> membro convidado somente leitura
//   null        -> usuário não tem acesso ao quadro
export async function permissaoQuadro(quadroId, usuarioId) {
  if (!quadroId) return null;

  let quadro;
  try {
    quadro = await Quadro.findById(quadroId);
  } catch (error) {
    // Id malformado invalida a busca — tratado como "sem acesso"
    return null;
  }

  // Quadro inexistente também é tratado como "sem acesso"
  if (!quadro) return null;

  // O dono é o usuário gravado em id_usuario
  if (textoId(quadro.id_usuario) === String(usuarioId)) return "dono";

  // Membro convidado: retorna a permissão gravada na entrada de membros
  const membro = (quadro.membros || []).find(
    (m) => textoId(m.id_usuario) === String(usuarioId)
  );

  return membro ? membro.permissao : null;
}

// Retorna os ids de todos os quadros em que o usuário é dono OU membro.
// Usado nas buscas globais ("todos os meus cards/colunas").
export async function quadrosAcessiveis(usuarioId) {
  const quadros = await Quadro.find({
    $or: [{ id_usuario: usuarioId }, { "membros.id_usuario": usuarioId }],
  }).select("_id");

  return quadros.map((q) => q._id);
}

// True apenas para o dono — usado onde só o criador pode agir (gerir membros, editar/excluir quadro)
export function ehDono(permissao) {
  return permissao === "dono";
}

// True quando o usuário pode modificar cards e colunas (dono ou membro com "editar")
export function podeEditarQuadro(permissao) {
  return permissao === "dono" || permissao === "editar";
}

// Verifica se o valor é um ObjectId válido do MongoDB (evita queries com id inválido)
export function ehObjectIdValido(valor) {
  return mongoose.isValidObjectId(valor);
}
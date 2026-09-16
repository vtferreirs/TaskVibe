import mongoose from "mongoose";
import Quadro from "../models/quadro.js";

const textoId = (valor) => (valor && valor._id ? String(valor._id) : String(valor || ""));

export async function permissaoQuadro(quadroId, usuarioId) {
  if (!quadroId) return null;

  let quadro;
  try {
    quadro = await Quadro.findById(quadroId);
  } catch (error) {
    return null;
  }

  if (!quadro) return null;

  if (textoId(quadro.id_usuario) === String(usuarioId)) return "dono";

  const membro = (quadro.membros || []).find(
    (m) => textoId(m.id_usuario) === String(usuarioId)
  );

  return membro ? membro.permissao : null;
}

export async function quadrosAcessiveis(usuarioId) {
  const quadros = await Quadro.find({
    $or: [{ id_usuario: usuarioId }, { "membros.id_usuario": usuarioId }],
  }).select("_id");

  return quadros.map((q) => q._id);
}

export function ehDono(permissao) {
  return permissao === "dono";
}

export function podeEditarQuadro(permissao) {
  return permissao === "dono" || permissao === "editar";
}

export function ehObjectIdValido(valor) {
  return mongoose.isValidObjectId(valor);
}
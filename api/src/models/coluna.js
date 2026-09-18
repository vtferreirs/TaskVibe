import mongoose from "mongoose";

// pertencente a um quadro (id_quadro) e ordenada pelo campo `ordem`.
const colunaSchema = new mongoose.Schema({
    titulo: { type: String, required: true, default: "Nova Coluna" }, 
    key: { type: String }, // Identificador estável usado pelo front-end (drag & drop)
    corFundo: { type: String }, 
    imagemFundo: { type: String }, 
    ordem: { type: Number, default: 0 }, 
    id_quadro: { type: mongoose.Schema.Types.ObjectId, ref: "Quadro", required: true }, 
    data_criacao_coluna: { type: Date, default: Date.now } 
});

const Coluna = mongoose.model("Coluna", colunaSchema);

export default Coluna;
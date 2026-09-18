import mongoose from "mongoose";

// Cada card pertence a um quadro (id_quadro) e herda as permissões
// de acesso/edição que o usuário tem sobre esse quadro (ver utils/permissaoQuadro.js).
const cardSchema = new mongoose.Schema({

    titulo: { type: String, required: true }, 
    descricao: { type: String }, 
    data_entrega: { type: Date, required:true}, 
    hora_entrega: {
        type: String,
        default: "23:59", 
        match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido. Use o formato HH:mm."]
    },
    status: { type: String, default: "A Fazer", required: true }, 
    prioridade: { type: String, enum: ["Baixa", "Media", "Alta"], default: "Baixa", required: true }, 
    cor: { type: String, default: "#ffffff" }, 
    cor_texto: { type: String, default: "#1e293b" }, 
    id_quadro: { type: mongoose.Schema.Types.ObjectId, ref: "Quadro", required: true }, 
    concluido: { type: Boolean, default: false }, 
    data_conclusao: { type: Date, default: null }, 
    data_criacao_card: {type: Date, default: Date.now} 
});

const Card = mongoose.model("Card", cardSchema);

export default Card;
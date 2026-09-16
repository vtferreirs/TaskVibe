import mongoose from "mongoose";

const quadroSchema = new mongoose.Schema({

    titulo_quadro: {type: String, required:true},
    cor: {type: String, default: "#FFFFFF", required:true},
    id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    membros: [{
        id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
        email: { type: String },
        nome: { type: String },
        permissao: { type: String, enum: ["visualizar", "editar"], default: "visualizar" },
        data_adicao: { type: Date, default: Date.now }
    }],
    data_criacao_quadro: {type: Date, default: Date.now},
    importancia: {type: String, enum: ["Baixa", "Media", "Alta"], default: "Baixa", required:true}

});

const Quadro = mongoose.model("Quadro", quadroSchema);

export default Quadro;
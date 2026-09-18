import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema({

    nome: { type: String, required:true, unique:true}, 
    email: { type: String, required: true, unique: true}, 
    senha: {type: String, required:true}, 
    foto_perfil: { type: String, default: "" }, 
    nivel_alertas: {
        type: String,
        enum: ["desligado", "sutil", "intenso"], 
        default: "intenso"
    },
    alertas_visuais: { type: Boolean, default: true }, 
    data_criacao_user: {type: Date, default: Date.now} 

});

const Usuario = mongoose.model("Usuario", usuarioSchema);

export default Usuario;
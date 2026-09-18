import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function connectDatabase() {
   try {
       await mongoose.connect(process.env.MONGODB_URI);


       console.log("✅ Banco de dados conectado com sucesso!");
   } catch (error) {
       console.error("❌ Erro ao conectar ao banco:", error);

       process.exit(1);
   }
}


export default connectDatabase;

	
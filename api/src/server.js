import express from "express";
import cors from "cors";
import dns from "node:dns";
import connectDatabase from "./database/connection.js";
import cardRoutes from "./routes/cardRoutes.js";
import quadroRoutes from "./routes/quadroRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import colunaRoutes from "./routes/colunaRoutes.js";

// Ajustes de rede intencionais para conectar ao MongoDB Atlas em algumas redes:
// força resolução IPv4 primeiro e usa DNS público do Google (8.8.8.8 / 8.8.4.4)
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
// Inicia a conexão com o banco (lê MONGODB_URI do .env)
connectDatabase();

const app = express();
const PORT = 3001;
// cors libera o acesso de outras origens (ex.: o Vite em localhost:5173)
app.use(cors());
// Intercepta o corpo JSON das requisições e deixa disponível em req.body
app.use(express.json());

// Monta os routers da API sob seus prefixos
app.use("/card", cardRoutes);
app.use("/usuario", usuarioRoutes);
app.use("/quadro", quadroRoutes);
app.use("/coluna", colunaRoutes);

// Rota mínima para conferir se a API está no ar
app.get("/", (req, res) => {
  res.json({
    message: "API está funcionando! ",
  });
});

// Rota auxiliar de teste (resposta em texto simples)
app.get("/teste", (req, res) => {
  res.send("Servidor de teste funcionando!");
});

// Sobe o servidor HTTP na porta 3001
app.listen(PORT, () => {
  console.log("Esse é o servidor TaskVibe");
  console.log(`Servidor rodando na porta ${PORT}`);
});
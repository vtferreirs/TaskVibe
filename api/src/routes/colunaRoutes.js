import { Router } from "express";
import auth from "../middleware/auth.js";
import {
  getColuna,
  postColuna,
  putColuna,
  deleteColuna,
} from "../controllers/colunaController.js";

// Router de colunas. Todas as rotas exigem autenticação (Bearer token).
const router = Router();

// Aplica autenticação a TODAS as rotas definidas depois desta linha
router.use(auth);

// CRUD básico de colunas, delegando a lógica aos controllers
router.get("/", getColuna);    
router.post("/", postColuna);  
router.put("/:id", putColuna); 
router.delete("/:id", deleteColuna); 

export default router;
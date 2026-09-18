import { Router } from "express";
import auth from "../middleware/auth.js";
import { 
    getCard, 
    postCard, 
    putCard, 
    deleteCard 
} from "../controllers/cardController.js";


// o middleware auth valida o Bearer token e preenche req.usuarioId.
const router = Router();

// Aplica autenticação a TODAS as rotas definidas depois desta linha
router.use(auth);

router.get("/", getCard);      
router.post("/", postCard);    
router.put("/:id", putCard);   
router.delete("/:id", deleteCard); 

export default router;
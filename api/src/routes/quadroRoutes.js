import { Router } from "express";
import auth from "../middleware/auth.js";
import { 
    getQuadro, 
    postQuadro, 
    putQuadro, 
    deleteQuadro,
    addMembro,
    updateMembro,
    deleteMembro,
} from "../controllers/quadroController.js";

// Router de quadros e gestão de membros. Todas as rotas exigem autenticação.
const router = Router();

// Aplica autenticação a TODAS as rotas definidas depois desta linha
router.use(auth);

router.get("/", getQuadro);   
router.post("/", postQuadro);  

// Gestão de membros (apenas dono, verificado no controller)
router.post("/:id/membros", addMembro); 
router.put("/:id/membros/:membroId", updateMembro); 
router.delete("/:id/membros/:membroId", deleteMembro); 


router.put("/:id", putQuadro);   
router.delete("/:id", deleteQuadro); 

export default router;
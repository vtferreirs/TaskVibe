import { Router } from "express";
import auth from "../middleware/auth.js";
import { 
    getUsuario, 
    postUsuario, 
    postLogin, 
    putUsuario, 
    deleteUsuario 
} from "../controllers/usuarioController.js";

// Router de usuários.
const router = Router();

// Rotas públicas: não exigem token
router.post("/login", postLogin); // POST /usuario/login  -> autentica e devolve token
router.post("/", postUsuario);    // POST /usuario        -> cadastra novo usuário

// A partir daqui, todas as rotas exigem autenticação (Bearer token)
router.use(auth);

router.get("/", getUsuario);           
router.put("/:id", putUsuario);        
router.delete("/:id", deleteUsuario);  

export default router;
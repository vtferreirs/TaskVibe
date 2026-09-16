import { Router } from "express";
import auth from "../middleware/auth.js";
import { 
    getUsuario, 
    postUsuario, 
    postLogin, 
    putUsuario, 
    deleteUsuario 
} from "../controllers/usuarioController.js";

const router = Router();

router.post("/login", postLogin);
router.post("/", postUsuario);

router.use(auth);

router.get("/", getUsuario);
router.put("/:id", putUsuario);
router.delete("/:id", deleteUsuario);

export default router;
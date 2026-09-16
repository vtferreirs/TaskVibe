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

const router = Router();

router.use(auth);

router.get("/", getQuadro);
router.post("/", postQuadro);

router.post("/:id/membros", addMembro);
router.put("/:id/membros/:membroId", updateMembro);
router.delete("/:id/membros/:membroId", deleteMembro);

router.put("/:id", putQuadro);
router.delete("/:id", deleteQuadro);

export default router;
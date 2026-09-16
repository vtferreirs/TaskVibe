import { Router } from "express";
import auth from "../middleware/auth.js";
import { 
    getCard, 
    postCard, 
    putCard, 
    deleteCard 
} from "../controllers/cardController.js";

const router = Router();

router.use(auth);

router.get("/", getCard);
router.post("/", postCard);
router.put("/:id", putCard);
router.delete("/:id", deleteCard);

export default router;
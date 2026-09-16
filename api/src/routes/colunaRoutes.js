import { Router } from "express";
import auth from "../middleware/auth.js";
import {
  getColuna,
  postColuna,
  putColuna,
  deleteColuna,
} from "../controllers/colunaController.js";

const router = Router();

router.use(auth);

router.get("/", getColuna);
router.post("/", postColuna);
router.put("/:id", putColuna);
router.delete("/:id", deleteColuna);

export default router;
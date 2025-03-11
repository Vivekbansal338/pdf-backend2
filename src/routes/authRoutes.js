import express from "express";
import { getToken, verifyToken } from "../controllers/authController.js";

const router = express.Router();

router.post("/token", getToken);
router.get("/token", getToken);
router.get("/verify", verifyToken);

export default router;

import express from "express";
import {
  chatHandler,
  getChatHistoryByDocument,
} from "../controllers/chatController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/chat", authMiddleware, chatHandler);
router.get("/history/:documentId", authMiddleware, getChatHistoryByDocument);

export default router;

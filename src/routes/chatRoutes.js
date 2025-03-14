import express from "express";
import {
  chatHandler,
  getChatHistoryByDocument,
  getChatImageById,
} from "../controllers/chatController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/chat", authMiddleware, chatHandler);
router.get("/history/:documentId", authMiddleware, getChatHistoryByDocument);
router.get("/image/:imageId", authMiddleware, getChatImageById);

export default router;

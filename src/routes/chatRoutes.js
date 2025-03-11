import express from "express";
import {
  chatHandler,
  chatHandlerStream,
  getChatHistoryByDocument,
} from "../controllers/chatController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/chat", authMiddleware, chatHandler);
router.post("/chatstream", authMiddleware, chatHandlerStream);
router.get("/history/:documentId", authMiddleware, getChatHistoryByDocument);

export default router;

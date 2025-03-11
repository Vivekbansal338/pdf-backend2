import express from "express";
import {
  uploadDocument,
  getUserDocuments,
  getDocumentById,
} from "../controllers/documentController.js";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

router.post("/upload", authMiddleware, upload.single("file"), uploadDocument);

router.get("/", authMiddleware, getUserDocuments);

router.get("/:id", authMiddleware, getDocumentById);

export default router;

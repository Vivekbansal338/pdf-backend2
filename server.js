import express from "express";
import cors from "cors";
import documentRoutes from "./src/routes/documentRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import errorHandler from "./src/middleware/errorHandler.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://vivek-pdf-rag.netlify.app"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads directory as static
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);

// Error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

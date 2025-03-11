import dotenv from "dotenv";

dotenv.config();

const environment = {
  PORT: process.env.PORT || 3001,
  MONGODB_URI: process.env.MONGODB_URI,
  DB_NAME: process.env.DB_NAME || "pdf_rag",
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
};

export default environment;

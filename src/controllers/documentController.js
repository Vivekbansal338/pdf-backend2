import { processPDF } from "../services/processingService.js";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { promises as fsPromises } from "fs";
import { v2 as cloudinary } from "cloudinary";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadDocument = async (req, res) => {
  try {
    // Validate request
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!req.body.fileName) {
      return res.status(400).json({ error: "File name is required" });
    }

    const filePath = req.file.path;
    const fileName = req.body.fileName;
    const userId = req.user.userId;

    // Upload file to Cloudinary
    const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "raw",
      folder: `pdfs/${userId}`,
      public_id: `${Date.now()}_${fileName.replace(/\.[^/.]+$/, "")}`,
      tags: ["pdf", "rag"],
    });

    const link = cloudinaryResult.secure_url;

    // Process the PDF with Mistral
    const { docCount, documentId } = await processPDF(
      filePath,
      userId,
      fileName,
      link
    );

    // Delete temporary file
    await fsPromises.unlink(filePath).catch((deleteErr) => {
      console.warn(`Failed to delete temporary file ${filePath}:`, deleteErr);
    });

    res.json({
      documentId,
      pageCount: docCount,
      fileName,
      link,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getUserDocuments = async (req, res) => {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || "pdf_rag");
    const documentsCollection = db.collection("documents");

    const userId = req.user.userId;

    const documents = await documentsCollection
      .find({ userId })
      .sort({ uploadDate: -1 })
      .toArray();

    res.json({
      documents: documents.map((doc) => ({
        id: doc._id,
        name: doc.name,
        uploadDate: doc.uploadDate,
        status: doc.status,
        chunkCount: doc.chunkCount || 0,
        link: doc.link,
      })),
    });
  } catch (err) {
    console.error("Error fetching user documents:", err);
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
};

export const getDocumentById = async (req, res) => {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || "pdf_rag");
    const documentsCollection = db.collection("documents");

    const userId = req.user.userId;
    const documentId = req.params.id;

    if (!ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const document = await documentsCollection.findOne({
      _id: new ObjectId(documentId),
      userId,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({
      id: document._id,
      name: document.name,
      uploadDate: document.uploadDate,
      status: document.status,
      chunkCount: document.chunkCount || 0,
      link: document.link,
    });
  } catch (err) {
    console.error("Error fetching document:", err);
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
};

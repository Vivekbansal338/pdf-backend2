import { processPDF } from "../services/processingService.js";
import { MongoClient, ObjectId } from "mongodb";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import { promises as fsPromises } from "fs";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    global: {
      fetch: (url, options = {}) => {
        // Add the duplex option when a body exists
        if (options.body) {
          options.duplex = "half";
        }
        return fetch(url, options);
      },
    },
  }
);

// Upload a document
export const uploadDocument = async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileName = req.body.fileName;
    const userId = req.user.userId;

    const fileData = fs.createReadStream(filePath);
    const filePathInBucket = `pdfs/${Date.now()}_${fileName}`;

    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(filePathInBucket, fileData, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error("Failed to upload to Supabase: " + error.message);
    }

    const result = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(filePathInBucket);

    const link = result.data.publicUrl;

    const { docCount, documentId } = await processPDF(
      filePath,
      userId,
      fileName,
      link
    );

    try {
      await fsPromises.unlink(filePath);
      console.log(`Temporary file deleted: ${filePath}`);
    } catch (deleteErr) {
      console.warn(`Failed to delete temporary file ${filePath}:`, deleteErr);
    }

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

// Get all documents for a user
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

// Get a single document by ID
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

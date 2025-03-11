import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { Mistral } from "@mistralai/mistralai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MistralAIEmbeddings } from "@langchain/mistralai";
import { MongoClient } from "mongodb";

async function processPDF(filePath, userId, documentName, link) {
  console.log(
    "Processing PDF:",
    process.env.MISTRAL_API_KEY,
    process.env.MONGODB_URI,
    process.env.DB_NAME
  );

  const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  const client = new MongoClient(process.env.MONGODB_URI);
  const dbName = process.env.DB_NAME || "pdf_rag";

  try {
    await client.connect();
    const db = client.db(dbName);
    const documentsCollection = db.collection("documents");
    const chunksCollection = db.collection("document_chunks");

    const documentEntry = {
      name: documentName || path.basename(filePath),
      userId: userId,
      originalFilename: path.basename(filePath),
      uploadDate: new Date(),
      link: link,
      status: "processing",
    };

    const docResult = await documentsCollection.insertOne(documentEntry);
    const documentId = docResult.insertedId;

    const fileContent = await fs.readFile(filePath);
    const uploaded_pdf = await mistral.files.upload({
      file: { fileName: path.basename(filePath), content: fileContent },
      purpose: "ocr",
    });

    const signedUrl = await mistral.files.getSignedUrl({
      fileId: uploaded_pdf.id,
    });

    const ocrResponse = await mistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
      },
    });

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", " ", ""],
    });

    let textContent = "";
    let splitDocs = [];

    if (ocrResponse.pages && Array.isArray(ocrResponse.pages)) {
      for (let i = 0; i < ocrResponse.pages.length; i++) {
        const page = ocrResponse.pages[i];
        const pageContent = page.markdown || page.text;

        if (pageContent) {
          textContent += pageContent + "\n\n";

          const pageChunks = await splitter.createDocuments(
            [pageContent],
            [{ page: page.index + 1, source: path.basename(filePath) }]
          );

          splitDocs = splitDocs.concat(pageChunks);
        }
      }
    }

    if (!textContent) {
      throw new Error("Empty text content from OCR response");
    }

    const embeddings = new MistralAIEmbeddings({
      apiKey: process.env.MISTRAL_API_KEY,
      model: "mistral-embed",
    });

    const chunkOperations = [];
    for (const doc of splitDocs) {
      const embedding = await embeddings.embedQuery(doc.pageContent);
      chunkOperations.push({
        insertOne: {
          document: {
            documentId,
            userId,
            content: doc.pageContent,
            metadata: doc.metadata,
            embedding: embedding,
            createdAt: new Date(),
          },
        },
      });
    }

    if (chunkOperations.length > 0) {
      await chunksCollection.bulkWrite(chunkOperations, { ordered: false });
    }

    const indexes = await chunksCollection.listSearchIndexes().toArray();
    const indexExists = indexes.some((idx) => idx.name === "vector_index");
    if (!indexExists) {
      await chunksCollection.createSearchIndex({
        name: "vector_index",
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              numDimensions: 1024,
              path: "embedding",
              similarity: "cosine",
            },
          ],
        },
      });
    }

    await documentsCollection.updateOne(
      { _id: documentId },
      { $set: { status: "ready", chunkCount: splitDocs.length } }
    );

    return {
      docCount: splitDocs.length,
      documentId: documentId.toString(),
      textContent,
    };
  } catch (error) {
    console.error("OCR Processing Error:", error);
    throw error;
  } finally {
    await client.close();
  }
}

export { processPDF };

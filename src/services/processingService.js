// import "dotenv/config";
// import fs from "fs/promises";
// import path from "path";
// import { Mistral } from "@mistralai/mistralai";
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import { MistralAIEmbeddings } from "@langchain/mistralai";
// import { MongoClient } from "mongodb";

// async function processPDF(filePath, userId, documentName, link) {
//   console.log(
//     `Processing PDF: ${filePath}, User ID: ${userId}, Document Name: ${documentName}, Link: ${link}`
//   );

//   const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
//   const client = new MongoClient(process.env.MONGODB_URI);
//   const dbName = process.env.DB_NAME || "pdf_rag";

//   try {
//     await client.connect();
//     const db = client.db(dbName);
//     const documentsCollection = db.collection("documents");
//     const chunksCollection = db.collection("document_chunks");

//     const documentEntry = {
//       name: documentName || path.basename(filePath),
//       userId: userId,
//       originalFilename: path.basename(filePath),
//       uploadDate: new Date(),
//       link: link,
//       status: "processing",
//     };

//     const docResult = await documentsCollection.insertOne(documentEntry);
//     const documentId = docResult.insertedId;

//     const fileContent = await fs.readFile(filePath);
//     const uploaded_pdf = await mistral.files.upload({
//       file: { fileName: path.basename(filePath), content: fileContent },
//       purpose: "ocr",
//     });

//     const signedUrl = await mistral.files.getSignedUrl({
//       fileId: uploaded_pdf.id,
//     });

//     const ocrResponse = await mistral.ocr.process({
//       model: "mistral-ocr-latest",
//       document: {
//         type: "document_url",
//         documentUrl: signedUrl.url,
//       },
//     });

//     const splitter = new RecursiveCharacterTextSplitter({
//       chunkSize: 1000,
//       chunkOverlap: 200,
//       separators: ["\n\n", "\n", " ", ""],
//     });

//     let textContent = "";
//     let splitDocs = [];

//     if (ocrResponse.pages && Array.isArray(ocrResponse.pages)) {
//       for (let i = 0; i < ocrResponse.pages.length; i++) {
//         const page = ocrResponse.pages[i];
//         const pageContent = page.markdown || page.text;

//         if (pageContent) {
//           textContent += pageContent + "\n\n";

//           const pageChunks = await splitter.createDocuments(
//             [pageContent],
//             [{ page: page.index + 1, source: path.basename(filePath) }]
//           );

//           splitDocs = splitDocs.concat(pageChunks);
//         }
//       }
//     }

//     if (!textContent) {
//       throw new Error("Empty text content from OCR response");
//     }

//     const embeddings = new MistralAIEmbeddings({
//       apiKey: process.env.MISTRAL_API_KEY,
//       model: "mistral-embed",
//     });

//     const chunkOperations = [];
//     for (const doc of splitDocs) {
//       const embedding = await embeddings.embedQuery(doc.pageContent);
//       chunkOperations.push({
//         insertOne: {
//           document: {
//             documentId,
//             userId,
//             content: doc.pageContent,
//             metadata: doc.metadata,
//             embedding: embedding,
//             createdAt: new Date(),
//           },
//         },
//       });
//     }

//     if (chunkOperations.length > 0) {
//       await chunksCollection.bulkWrite(chunkOperations, { ordered: false });
//     }

//     const indexes = await chunksCollection.listSearchIndexes().toArray();
//     const indexExists = indexes.some((idx) => idx.name === "vector_index");
//     if (!indexExists) {
//       await chunksCollection.createSearchIndex({
//         name: "vector_index",
//         type: "vectorSearch",
//         definition: {
//           fields: [
//             {
//               type: "vector",
//               numDimensions: 1024,
//               path: "embedding",
//               similarity: "cosine",
//             },
//           ],
//         },
//       });
//     }

//     await documentsCollection.updateOne(
//       { _id: documentId },
//       { $set: { status: "ready", chunkCount: splitDocs.length } }
//     );

//     return {
//       docCount: splitDocs.length,
//       documentId: documentId.toString(),
//       textContent,
//     };
//   } catch (error) {
//     console.error("OCR Processing Error:", error);
//     throw error;
//   } finally {
//     await client.close();
//   }
// }

// export { processPDF };
import "dotenv/config";
import path from "path";
import { Mistral } from "@mistralai/mistralai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MistralAIEmbeddings } from "@langchain/mistralai";
import { MongoClient } from "mongodb";

async function processPDF(filePath, userId, documentName, link) {
  const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  const client = new MongoClient(process.env.MONGODB_URI);
  const dbName = process.env.DB_NAME || "pdf_rag";

  try {
    await client.connect();
    const db = client.db(dbName);
    const documentsCollection = db.collection("documents");
    const chunksCollection = db.collection("document_chunks");
    const imagesCollection = db.collection("document_images");

    // Create document entry
    const documentEntry = {
      name: documentName,
      userId: userId,
      originalFilename: documentName,
      uploadDate: new Date(),
      link: link,
      status: "processing",
    };

    const docResult = await documentsCollection.insertOne(documentEntry);
    const documentId = docResult.insertedId;

    // Process document with Mistral OCR
    const ocrResponse = await mistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: link,
      },
      includeImageBase64: true,
    });

    // Configure text splitter for chunking
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", " ", ""],
    });

    let textContent = "";
    let splitDocs = [];
    let totalPages = ocrResponse.pages?.length || 0;
    let totalImages = 0;

    if (ocrResponse.pages && Array.isArray(ocrResponse.pages)) {
      for (let i = 0; i < ocrResponse.pages.length; i++) {
        const page = ocrResponse.pages[i];
        const pageContent = page.markdown || page.text;
        const pageNumber = page.index + 1;

        // Process images on the page
        const imageRefs = [];
        // if (page.images && page.images.length > 0) {
        //   for (const image of page.images) {
        //     totalImages++;
        //     // console.log(image);
        //     const imageId = `${documentId}_page${pageNumber}_img_${
        //       image.id || totalImages
        //     }`;

        //     // Store image metadata and data
        //     await imagesCollection.insertOne({
        //       imageId,
        //       documentId,
        //       pageNumber,
        //       fileName: image.id,
        //       position: {
        //         topLeft: { x: image.topLeftX, y: image.topLeftY },
        //         bottomRight: {
        //           x: image.bottomRightX,
        //           y: image.bottomRightY,
        //         },
        //       },
        //       dimensions: {
        //         width: image.bottomRightX - image.topLeftX,
        //         height: image.bottomRightY - image.topLeftY,
        //       },
        //       pagePosition: {
        //         relativeTop: image.topLeftY / page.dimensions.height,
        //         relativeLeft: image.topLeftX / page.dimensions.width,
        //       },
        //       pageDimensions: page.dimensions,
        //       imageData: image.imageBase64,
        //       createdAt: new Date(),
        //     });

        //     // Create reference to store with text
        //     imageRefs.push({
        //       imageId,
        //       fileName: image.id,
        //       position: {
        //         topLeft: { x: image.topLeftX, y: image.topLeftY },
        //         bottomRight: {
        //           x: image.bottomRightX,
        //           y: image.bottomRightY,
        //         },
        //       },
        //     });
        //   }
        // }

        if (pageContent) {
          textContent += pageContent + "\n\n";

          // Create chunks with enhanced metadata
          const pageChunks = await splitter.createDocuments(
            [pageContent],
            [
              {
                page: pageNumber,
                source: link,
                documentName: documentName,
                documentId: documentId.toString(),
                images: imageRefs.length > 0 ? imageRefs : undefined,
                dimensions: page.dimensions,
                position: {
                  pageNumber,
                  totalPages,
                  relativePosition: pageNumber / totalPages,
                },
                createdAt: new Date(),
              },
            ]
          );

          splitDocs = splitDocs.concat(pageChunks);
        }
      }
    }

    if (!textContent) {
      throw new Error("Empty text content from OCR response");
    }

    // Generate embeddings for each chunk
    const embeddings = new MistralAIEmbeddings({
      apiKey: process.env.MISTRAL_API_KEY,
      model: "mistral-embed",
    });

    // Prepare chunk operations for batch processing
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

    // Bulk insert chunks for better performance
    if (chunkOperations.length > 0) {
      await chunksCollection.bulkWrite(chunkOperations, { ordered: false });
    }

    // Ensure vector search index exists
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

    // Update document status
    await documentsCollection.updateOne(
      { _id: documentId },
      {
        $set: {
          status: "ready",
          chunkCount: splitDocs.length,
          imageCount: totalImages,
          pageCount: totalPages,
          processingCompletedAt: new Date(),
        },
      }
    );

    return {
      docCount: splitDocs.length,
      imageCount: totalImages,
      pageCount: totalPages,
      documentId: documentId.toString(),
      textContent,
    };
  } catch (error) {
    console.error("OCR Processing Error:", error);

    // Update document status to failed if we have a documentId
    if (typeof documentId !== "undefined") {
      try {
        await documentsCollection.updateOne(
          { _id: documentId },
          { $set: { status: "failed", error: error.message } }
        );
      } catch (updateError) {
        console.error("Failed to update document status:", updateError);
      }
    }

    throw error;
  } finally {
    await client.close();
  }
}

export { processPDF };

import { MongoClient, ObjectId } from "mongodb";
import { MistralAIEmbeddings } from "@langchain/mistralai";
import { Mistral } from "@mistralai/mistralai";

// export const chatHandler = async (req, res) => {
//   const client = new MongoClient(process.env.MONGODB_URI);
//   const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

//   try {
//     const { documentId, query } = req.body;
//     const userId = req.user.userId;
//     if (!documentId || !query) {
//       return res.status(400).json({ error: "Missing document ID or query" });
//     }

//     await client.connect();
//     const db = client.db(process.env.DB_NAME || "pdf_rag");
//     const chunksCollection = db.collection("document_chunks");

//     const embeddings = new MistralAIEmbeddings({
//       apiKey: process.env.MISTRAL_API_KEY,
//       model: "mistral-embed",
//     });
//     const questionEmbedding = await embeddings.embedQuery(query);

//     const pipeline = [
//       {
//         $vectorSearch: {
//           index: "vector_index",
//           queryVector: questionEmbedding,
//           path: "embedding",
//           numCandidates: 100,
//           limit: 5,
//         },
//       },
//       {
//         $match: {
//           documentId: new ObjectId(documentId),
//           ...(userId && { userId: userId }),
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           content: 1,
//           metadata: 1,
//           score: { $meta: "searchScore" },
//         },
//       },
//     ];

//     const relevantChunks = await chunksCollection.aggregate(pipeline).toArray();

//     const citations = relevantChunks.map((chunk, index) => ({
//       id: index + 1,
//       page: chunk.metadata?.page || "unknown",
//       text: chunk.content.slice(0, 100) + "...",
//       score: chunk.score,
//       images: chunk.metadata?.images.map((image) => ({
//         id: image.id,
//       })),
//     }));

//     const context = relevantChunks.map((chunk) => chunk.content).join("\n\n");
//     const prompt = `Context:\n${context}\n\nQuestion: ${query}\nAnswer the question based only on the provided context.`;

//     const response = await mistral.chat.complete({
//       model: "mistral-medium",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 500,
//     });

//     const answer = response.choices[0].message.content;

//     // Record the chat exchange along with citations into the chatHistory collection
//     const chatHistoryCollection = db.collection("chatHistory");
//     await chatHistoryCollection.insertOne({
//       userId,
//       documentId: new ObjectId(documentId),
//       query,
//       answer,
//       citations,
//       timestamp: new Date(),
//     });

//     return res.json({
//       answer,
//       citations,
//     });
//   } catch (err) {
//     console.error("Chat error:", err);
//     res.status(500).json({ error: err.message });
//   } finally {
//     if (client) await client.close();
//   }
// };

// ...existing code...
export const chatHandler = async (req, res) => {
  const client = new MongoClient(process.env.MONGODB_URI);
  const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

  try {
    const { documentId, query } = req.body;
    const userId = req.user.userId;
    if (!documentId || !query) {
      return res.status(400).json({ error: "Missing document ID or query" });
    }

    await client.connect();
    const db = client.db(process.env.DB_NAME || "pdf_rag");
    const chunksCollection = db.collection("document_chunks");

    const embeddings = new MistralAIEmbeddings({
      apiKey: process.env.MISTRAL_API_KEY,
      model: "mistral-embed",
    });
    const questionEmbedding = await embeddings.embedQuery(query);

    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          queryVector: questionEmbedding,
          path: "embedding",
          numCandidates: 100,
          limit: 5,
        },
      },
      {
        $match: {
          documentId: new ObjectId(documentId),
          ...(userId && { userId: userId }),
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          metadata: 1,
          score: { $meta: "searchScore" },
        },
      },
    ];

    const relevantChunks = await chunksCollection.aggregate(pipeline).toArray();

    const citations = relevantChunks.map((chunk, index) => ({
      id: index + 1,
      page: chunk.metadata?.page || "unknown",
      text: chunk.content.slice(0, 100) + "...",
      score: chunk.score,
      images:
        chunk.metadata?.images?.map((image) => ({
          id: image.imageId,
        })) || [],
    }));

    const context = relevantChunks.map((chunk) => chunk.content).join("\n\n");
    const prompt = `Context:\n${context}\n\nQuestion: ${query}\nAnswer the question based only on the provided context.`;

    const response = await mistral.chat.complete({
      model: "mistral-medium",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    const answer = response.choices[0].message.content;

    const chatHistoryCollection = db.collection("chatHistory");
    await chatHistoryCollection.insertOne({
      userId,
      documentId: new ObjectId(documentId),
      query,
      answer,
      citations,
      timestamp: new Date(),
    });

    return res.json({
      answer,
      citations,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) await client.close();
  }
};

export const getChatHistoryByDocument = async (req, res) => {
  const { documentId } = req.params;
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    if (!ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    await client.connect();
    const db = client.db(process.env.DB_NAME || "pdf_rag");
    const chatHistoryCollection = db.collection("chatHistory");
    const userId = req.user.userId;

    const history = await chatHistoryCollection
      .find({
        userId,
        documentId: new ObjectId(documentId),
      })
      .sort({ timestamp: 1 })
      .toArray();

    res.json(history);
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
};

export const getChatImageById = async (req, res) => {
  const { imageId } = req.params;
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || "pdf_rag");
    const imagesCollection = db.collection("document_images");
    const userId = req.user.userId;

    console.log("userId", userId);
    console.log("imageId", imageId);

    const image = await imagesCollection.findOne({
      imageId: imageId,
    });

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json(image);
  } catch (err) {
    console.error("Error fetching image:", err);
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
};

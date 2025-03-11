// import "dotenv/config";
// import { Mistral } from "@mistralai/mistralai";

// const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// export const uploadFile = async (fileContent, fileName) => {
//   const uploadedFile = await mistral.files.upload({
//     file: { fileName, content: fileContent },
//     purpose: "ocr",
//   });
//   return uploadedFile;
// };

// export const retrieveFile = async (fileId) => {
//   const retrievedData = await mistral.files.retrieve({ fileId });
//   return retrievedData;
// };

// export const getSignedUrl = async (fileId) => {
//   const signedUrl = await mistral.files.getSignedUrl({ fileId });
//   return signedUrl;
// };

// export const processOCR = async (signedUrl) => {
//   const ocrResponse = await mistral.ocr.process({
//     model: "mistral-ocr-latest",
//     document: {
//       type: "document_url",
//       documentUrl: signedUrl.url,
//     },
//   });
//   return ocrResponse;
// };

// export const generateEmbeddings = async (content) => {
//   const embeddings = new MistralAIEmbeddings({
//     apiKey: process.env.MISTRAL_API_KEY,
//     model: "mistral-embed",
//   });
//   const embedding = await embeddings.embedQuery(content);
//   return embedding;
// };

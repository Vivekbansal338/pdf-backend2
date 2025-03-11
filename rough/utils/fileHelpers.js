// import fs from 'fs/promises';
// import path from 'path';

// export const readFile = async (filePath) => {
//   try {
//     const data = await fs.readFile(filePath, 'utf-8');
//     return data;
//   } catch (error) {
//     throw new Error(`Error reading file at ${filePath}: ${error.message}`);
//   }
// };

// export const deleteFile = async (filePath) => {
//   try {
//     await fs.unlink(filePath);
//   } catch (error) {
//     throw new Error(`Error deleting file at ${filePath}: ${error.message}`);
//   }
// };

// export const getFileExtension = (fileName) => {
//   return path.extname(fileName);
// };

# PDF RAG API

A RESTful API service for processing PDF documents using RAG (Retrieval Augmented Generation) with Mistral AI capabilities. This service enables document upload, OCR processing, vector storage, and AI-powered question answering based on document content.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Setup and Installation](#setup-and-installation)
- [Environment Variables](#environment-variables)
- [Workflow](#workflow)
- [Authentication](#authentication)
- [Document Processing](#document-processing)
- [Chat System](#chat-system)
- [Error Handling](#error-handling)
- [Development](#development)

## Features

- **PDF Document Processing**: Upload, OCR, and vectorization of PDF documents
- **Vector Search**: Semantic search over document content using MongoDB vector search
- **Context-Aware Chat**: Question answering based on document content
- **JWT Authentication**: Secure API endpoints with token-based authentication
- **Chat History**: Persistent storage of chat interactions
- **Document Management**: List and retrieve uploaded documents
- **Cloud Storage**: PDF files stored in Supabase

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: MongoDB with vector search capabilities
- **AI Services**:
  - [Mistral AI](https://mistral.ai/) for OCR processing
  - [Mistral AI Embeddings](https://docs.mistral.ai/api/embeddings/) for vector creation
  - Mistral Medium model for chat responses
- **Storage**: [Supabase](https://supabase.com/) for PDF file storage
- **Authentication**: JWT tokens
- **Text Processing**: [LangChain](https://js.langchain.com/) for text splitting

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **Controllers**: Handle HTTP requests and responses ([`src/controllers/`](src/controllers/))
- **Services**: Contain business logic ([`src/services/`](src/services/))
- **Routes**: Define API endpoints ([`src/routes/`](src/routes/))
- **Middleware**: Process requests before they reach routes ([`src/middleware/`](src/middleware/))
- **Models**: Define data structures (MongoDB collections)

## API Endpoints

### Authentication

- `GET/POST /api/auth/token` - Generate authentication token
- `GET /api/auth/verify` - Verify token validity

### Documents

- `POST /api/documents/upload` - Upload a PDF document
- `GET /api/documents` - List all user documents
- `GET /api/documents/:id` - Get document by ID

### Chat

- `POST /api/chat/chat` - Send a query and get a response
- `GET /api/chat/history/:documentId` - Get chat history for a document

## Setup and Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Vivekbansal338/pdf-backend2.git
   cd pdf-rag-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file based on the Environment Variables section below.

4. **Create upload directory**

   ```bash
   mkdir -p uploads
   ```

5. **Start the server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## Environment Variables

Create a `.env` file with the following variables:

```
# Server
PORT=3001

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net
DB_NAME=pdf_rag

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Mistral AI
MISTRAL_API_KEY=your_mistral_api_key_here

# Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
SUPABASE_BUCKET=your_bucket_name
```

## Workflow

### Document Processing Flow

1. User uploads PDF file
2. File is temporarily stored on the server
3. File is uploaded to Supabase for permanent storage
4. Mistral OCR processes the PDF content
5. Text is split into chunks using LangChain's `RecursiveCharacterTextSplitter`
6. Embeddings are generated for each chunk using Mistral AI
7. Chunks and embeddings are stored in MongoDB
8. Vector search index is created/updated
9. Temporary file is deleted

### Chat Query Flow

1. User sends query with document ID
2. Query is converted to embedding
3. Vector search finds relevant document chunks
4. Relevant chunks form context for the LLM
5. Mistral AI generates response based on context
6. Citations are provided with the response
7. Chat history is recorded in database

## Authentication

The API uses a JWT-based authentication system:

- Tokens are generated with UUID-based user IDs through the [`authController`](src/controllers/authController.js)
- All protected API endpoints require authentication via [`authMiddleware`](src/middleware/authMiddleware.js)
- Token must be included in the Authorization header: `Bearer <token>`

## Document Processing

Documents are processed through the [`processingService.js`](src/services/processingService.js):

1. **OCR Processing**: Uses Mistral OCR to extract text from PDFs
2. **Text Splitting**: Splits text into manageable chunks (1000 characters with 200 character overlap)
3. **Embeddings**: Generates vector embeddings for each text chunk
4. **Storage**: Stores document metadata and chunks in MongoDB

## Chat System

The chat functionality is implemented in [`chatController.js`](src/controllers/chatController.js):

- Convert query to embedding using `MistralAIEmbeddings`
- Find relevant chunks using MongoDB's vector search
- Create context by combining relevant chunks
- Generate response using Mistral Medium model
- Return response with citations that reference specific pages

## Error Handling

The application includes a global error handler middleware in [`errorHandler.js`](src/middleware/errorHandler.js) that:

- Logs error stack traces
- Formats error responses consistently
- Hides sensitive error information in production

## Development

```bash
# Run in development mode with hot reloading
npm run dev
```

This README provides an overview of the PDF RAG API. For specific implementation details, please refer to the source code files in the repository.

import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function connectDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}

function getDatabase(dbName) {
  return client.db(dbName);
}

export { connectDatabase, getDatabase };

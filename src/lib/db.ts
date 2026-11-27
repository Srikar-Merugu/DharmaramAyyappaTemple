import { MongoClient, type Db } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ayyappa_annadanam";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (global._mongoClientPromise) {
    return global._mongoClientPromise;
  }
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
  });
  global._mongoClientPromise = client.connect();
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}

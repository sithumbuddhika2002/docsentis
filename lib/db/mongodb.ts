import mongoose from "mongoose";
import dns from "dns";

// Prevent Windows Node.js querySrv ECONNREFUSED when resolving MongoDB Atlas SRV URIs
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setServers is restricted
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/peaksora_assignment_viewer";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: any) {
    cached.promise = null;
    console.error(
      "\n⚠️ [MongoDB Connection Warning]: Could not connect to MongoDB at:",
      MONGODB_URI,
      "\nEnsure your local MongoDB service is running, or set MONGODB_URI to a free MongoDB Atlas connection string in .env.local (see README.md).\n"
    );
    throw e;
  }

  return cached.conn;
}

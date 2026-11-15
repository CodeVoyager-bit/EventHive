import mongoose from "mongoose";

// Singleton Pattern: one shared connection, reused across requests and serverless invocations
class Database {
  private static instance: Database;
  private connecting?: Promise<void>;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public connect(uri: string): Promise<void> {
    if (mongoose.connection.readyState === 1) return Promise.resolve();
    if (!this.connecting) {
      this.connecting = mongoose
        .connect(uri)
        .then(() => {
          console.log("MongoDB connected successfully");
        })
        .catch((error) => {
          this.connecting = undefined; // allow the next request to retry
          throw error;
        });
    }
    return this.connecting;
  }

  public async disconnect(): Promise<void> {
    await mongoose.disconnect();
    this.connecting = undefined;
    console.log("MongoDB disconnected");
  }
}

export default Database;

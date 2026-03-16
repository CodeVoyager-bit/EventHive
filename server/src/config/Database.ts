import mongoose from "mongoose";

// Singleton Pattern: ensures only one database connection instance exists
class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(uri: string): Promise<void> {
    if (this.isConnected) {
      console.log("Database already connected");
      return;
    }

    try {
      await mongoose.connect(uri);
      this.isConnected = true;
      console.log("MongoDB connected successfully");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    await mongoose.disconnect();
    this.isConnected = false;
    console.log("MongoDB disconnected");
  }
}

export default Database;

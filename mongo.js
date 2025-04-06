import { MongoClient } from 'mongodb';

let client;
let db;

const connectToMongo = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('chat_app');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

export default connectToMongo;
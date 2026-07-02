const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;

async function testConnection() {
  console.log("Testing with native MongoDB driver...");
  console.log("URI:", uri.replace(/:.+@/, ":****@"));

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log("✅ Connected successfully!");

    const db = client.db("bitepickup");
    console.log("📊 Database:", db.databaseName);

    // List collections
    const collections = await db.listCollections().toArray();
    console.log(
      "📁 Collections:",
      collections.map((c) => c.name),
    );

    await client.close();
    console.log("✅ Disconnected successfully");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
  }
}

testConnection();

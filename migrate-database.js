import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Connection URIs
const currentDbUri = process.env.MONGO_URI; // Current: split-bill-db
const newDbUri = currentDbUri.replace("/split-bill-db", "/splitbill"); // New: splitbill

console.log("🔄 Starting database migration...");
console.log("📤 Source DB:", currentDbUri.split("@")[1]);
console.log("📥 Target DB:", newDbUri.split("@")[1]);

async function migrateDatabase() {
  let sourceConnection, targetConnection;

  try {
    // Connect to source database
    console.log("\n📡 Connecting to source database...");
    sourceConnection = await mongoose.createConnection(currentDbUri);
    console.log("✅ Connected to source database");

    // Connect to target database
    console.log("📡 Connecting to target database...");
    targetConnection = await mongoose.createConnection(newDbUri);
    console.log("✅ Connected to target database");

    // Get all collections from source database
    const collections = await sourceConnection.db.listCollections().toArray();
    console.log(`\n📋 Found ${collections.length} collections to migrate:`);
    collections.forEach((col) => console.log(`   - ${col.name}`));

    // Migrate each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`\n🔄 Migrating collection: ${collectionName}`);

      // Get source collection
      const sourceCollection = sourceConnection.db.collection(collectionName);
      const targetCollection = targetConnection.db.collection(collectionName);

      // Count documents in source
      const sourceCount = await sourceCollection.countDocuments();
      console.log(`   📊 Source documents: ${sourceCount}`);

      if (sourceCount === 0) {
        console.log(`   ⏭️  Skipping empty collection`);
        continue;
      }

      // Check if target collection already has data
      const targetCount = await targetCollection.countDocuments();
      if (targetCount > 0) {
        console.log(
          `   ⚠️  Target collection already has ${targetCount} documents`
        );
        console.log(
          `   🤔 Do you want to merge or skip? (Skipping for safety)`
        );
        continue;
      }

      // Get all documents from source
      const documents = await sourceCollection.find({}).toArray();

      if (documents.length > 0) {
        // Insert documents into target
        await targetCollection.insertMany(documents);
        console.log(`   ✅ Migrated ${documents.length} documents`);

        // Verify migration
        const verifyCount = await targetCollection.countDocuments();
        if (verifyCount === sourceCount) {
          console.log(`   ✅ Verification passed: ${verifyCount} documents`);
        } else {
          console.log(
            `   ❌ Verification failed: expected ${sourceCount}, got ${verifyCount}`
          );
        }
      }
    }

    // Migration summary
    console.log("\n📊 Migration Summary:");
    const finalCollections = await targetConnection.db
      .listCollections()
      .toArray();
    for (const col of finalCollections) {
      const count = await targetConnection.db
        .collection(col.name)
        .countDocuments();
      console.log(`   - ${col.name}: ${count} documents`);
    }

    console.log("\n🎉 Migration completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("   1. Update your .env file to use the new database name");
    console.log("   2. Test your application with the new database");
    console.log("   3. Once verified, you can safely delete the old database");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    // Close connections
    if (sourceConnection) {
      await sourceConnection.close();
      console.log("\n🔌 Closed source database connection");
    }
    if (targetConnection) {
      await targetConnection.close();
      console.log("🔌 Closed target database connection");
    }
  }
}

// Backup function
async function createBackup() {
  console.log("\n💾 Creating backup information...");

  try {
    const connection = await mongoose.createConnection(currentDbUri);
    const collections = await connection.db.listCollections().toArray();

    const backupInfo = {
      timestamp: new Date().toISOString(),
      sourceDatabase: currentDbUri.split("/")[3].split("?")[0],
      collections: [],
    };

    for (const col of collections) {
      const count = await connection.db.collection(col.name).countDocuments();
      backupInfo.collections.push({
        name: col.name,
        documentCount: count,
      });
    }

    console.log("📋 Backup Information:");
    console.log(JSON.stringify(backupInfo, null, 2));

    await connection.close();
    return backupInfo;
  } catch (error) {
    console.error("❌ Backup failed:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log("🚀 Split Bill Database Migration Tool");
    console.log("=====================================");

    // Create backup info first
    await createBackup();

    // Confirm migration
    console.log(
      "\n⚠️  IMPORTANT: This will copy data from split-bill-db to splitbill"
    );
    console.log(
      "   Make sure you have a backup of your data before proceeding!"
    );

    // Run migration
    await migrateDatabase();
  } catch (error) {
    console.error("\n💥 Migration process failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateDatabase, createBackup };

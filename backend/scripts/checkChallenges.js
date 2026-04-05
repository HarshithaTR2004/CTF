require("dotenv").config();
const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");

async function checkChallenges() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cyberrangex");
    console.log("Connected to MongoDB");

    const count = await Challenge.countDocuments();
    console.log(`\nTotal challenges in database: ${count}`);

    if (count === 0) {
      console.log("\n⚠️  No challenges found! Please run: npm run seed");
      process.exit(1);
    } else {
      const challenges = await Challenge.find().select("title category difficulty");
      console.log("\nChallenges in database:");
      challenges.forEach((c, i) => {
        console.log(`${i + 1}. ${c.title} (${c.category}, ${c.difficulty})`);
      });
      process.exit(0);
    }
  } catch (error) {
    console.error("Error checking challenges:", error);
    process.exit(1);
  }
}

checkChallenges();


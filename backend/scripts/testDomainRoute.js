require("dotenv").config();
const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cyberrangex");
    console.log("✅ Connected to MongoDB\n");

    // Test 1: Check all domains
    const allDomains = await Challenge.distinct("domain");
    console.log("📊 All domains in database:");
    allDomains.forEach(d => console.log(`  - ${d}`));
    console.log("");

    // Test 2: Check challenges for each domain
    for (const domain of allDomains) {
      const count = await Challenge.countDocuments({ domain });
      console.log(`📁 ${domain}: ${count} challenges`);
      
      // Get a sample challenge
      const sample = await Challenge.findOne({ domain }).select("_id title difficulty");
      if (sample) {
        console.log(`   Sample: ${sample.title} (${sample.difficulty}) - ID: ${sample._id}`);
      }
    }
    console.log("");

    // Test 3: Test domain matching
    const testDomain = "Networking & Web Application Security";
    console.log(`🔍 Testing domain: "${testDomain}"`);
    const challenges = await Challenge.find({ domain: testDomain })
      .select("_id title category difficulty description points domain vmConfig labPath")
      .sort({ difficulty: 1, title: 1 });
    
    console.log(`   Found: ${challenges.length} challenges`);
    if (challenges.length > 0) {
      console.log(`   First challenge: ${challenges[0].title}`);
      console.log(`   Has _id: ${!!challenges[0]._id}`);
      console.log(`   Has domain: ${!!challenges[0].domain}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

test();

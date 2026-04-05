const fs = require("fs");
const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");
const { proofToken } = require("../labs/theoryScenarios");

async function main() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cyberrangex";
  await mongoose.connect(mongoUri);

  const docs = await Challenge.find().select(
    "title domain category difficulty points correctAnswer labPath vmConfig vmFlag _id"
  ).lean();

  docs.sort((a, b) => a.domain.localeCompare(b.domain) || a.difficulty.localeCompare(b.difficulty) || a.title.localeCompare(b.title));

  let md = "# CyberRangeX - 160 Challenge Answer Key (with verification inputs)\n\n";
  md += "(Generated from current MongoDB `Challenge` collection)\n\n";
  md +=
    "**Use:**\n- Non-VM (theory workspace): complete terminal checklist, copy `SUBMISSION_CODE` from evidence files, paste into lab verify, then paste `Final Flag`.\n" +
    "- VM: solve in VM, paste `VM Verification Proof` into `Verify VM solve`, then paste `Final Flag`.\n\n";

  const byDomain = {};
  for (const c of docs) {
    if (!byDomain[c.domain]) byDomain[c.domain] = [];
    byDomain[c.domain].push(c);
  }

  const domains = Object.keys(byDomain).sort((a, b) => a.localeCompare(b));
  const diffs = ["easy", "medium", "hard"];

  for (const domain of domains) {
    md += "## " + domain + "\n\n";
    for (const diff of diffs) {
      const arr = byDomain[domain].filter((x) => x.difficulty === diff);
      if (!arr.length) continue;
      md += "### " + diff.toUpperCase() + " (" + arr.length + ")\n\n";

      for (const c of arr) {
        const isVM = !!c.vmConfig?.enabled;
        md += "- **" + c.title + "** (" + c.category + ")\n";
        md += "  - Points: " + c.points + "\n";
        md += "  - Environment: " + (isVM ? "VM" : "Lab") + "\n";

        if (isVM) {
          md += "  - VM Verification Proof (type in `Verify VM solve`): `" + (c.vmFlag || c.correctAnswer || "") + "`\n";
        } else {
          md += "  - Lab closeout token (theory workspace verify): `" + proofToken(c) + "`\n";
        }

        md += "  - Final Flag (type in `Your Answer`): `" + (c.correctAnswer || "") + "`\n\n";
      }
      md += "\n";
    }
    md += "\n";
  }

  fs.writeFileSync("../ans.md", md, "utf8");
  console.log("Updated ../ans.md");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

require("dotenv").config();
const { D, generateChallenges, seed } = require("./seedCTFChallenges");

const TARGET_TOTAL = 60;
const DOMAIN_ORDER = [
  D.DIGITAL,
  D.CRYPTO,
  D.SYSTEMS,
  D.FORENSICS,
  D.NETWEB,
  D.LINUX_VM,
  D.AD_VM,
  D.PENTEST_VM,
];

function build60Profile(allChallenges) {
  const byDomain = new Map();
  DOMAIN_ORDER.forEach((d) => byDomain.set(d, []));

  for (const ch of allChallenges) {
    if (!byDomain.has(ch.domain)) continue;
    byDomain.get(ch.domain).push(ch);
  }

  // Keep balanced exposure across all 8 domains:
  // - 7 from each domain => 56
  // - +1 extra from each VM domain + net/web => 60
  const basePerDomain = 7;
  const extras = new Set([D.NETWEB, D.LINUX_VM, D.AD_VM, D.PENTEST_VM]);

  const selected = [];
  for (const domain of DOMAIN_ORDER) {
    const pool = byDomain.get(domain) || [];
    const take = basePerDomain + (extras.has(domain) ? 1 : 0);
    selected.push(...pool.slice(0, take));
  }

  if (selected.length !== TARGET_TOTAL) {
    throw new Error(`Expected ${TARGET_TOTAL} challenges, got ${selected.length}`);
  }
  return selected;
}

async function seed60() {
  const all = generateChallenges();
  const sixty = build60Profile(all);
  await seed(sixty);
}

if (require.main === module) {
  seed60();
}

module.exports = { build60Profile, seed60 };

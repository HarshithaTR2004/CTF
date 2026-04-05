const fs = require('fs');
const content = fs.readFileSync('scripts/seedCTFChallenges.js', 'utf8');

const challengesRegex = /{title:"([^"]+)",category:"([^"]+)",difficulty:"([^"]+)",points:(\d+),correctAnswer:"([^"]+)"/g;
// actually the file has spaces, so a better regex is:
const regex = /{[\s\S]*?title:\s*"([^"]+)",[\s\S]*?category:\s*"([^"]+)",[\s\S]*?difficulty:\s*"([^"]+)",[\s\S]*?points:\s*(\d+),[\s\S]*?correctAnswer:\s*"([^"]+)"/g;

let match;
let output = "# Complete CTF Challenge Solutions & Flags Database\n\n";

while ((match = regex.exec(content)) !== null) {
  output += `### Challenge: ${match[1]}\n`;
  output += `- **Category:** ${match[2]}\n`;
  output += `- **Difficulty:** ${match[3]}\n`;
  output += `- **Points:** ${match[4]}\n`;
  output += `- **FLAG / SOLUTION:** \`${match[5]}\`\n\n`;
}

fs.writeFileSync('CTF_Answers.md', output);

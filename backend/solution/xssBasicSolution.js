const express = require("express");
const router = express.Router();

// Secure version of XSS Basic - Reflected XSS vulnerability
router.get("/", (req, res) => {
  const name = req.query.name || "";
  // Simple sanitization for demonstration purposes
  const sanitizedName = name.replace(/[<>&]/g, (match) => {
    switch (match) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      default: return match;
    }
  });
  res.send(`
    <html>
      <body>
        <h1>Hello ${sanitizedName}</h1>
        <script>
          // Vulnerability fixed
        </script>
      </body>
    </html>
  `);
});

module.exports = router;
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const isSuccess = req.query.success === "1" || req.query.success === "true";
    const flag = await resolveFlagForLab(challengeId, "FLAG{file_upload_basic_005}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · File upload",
      objective: "Upload passes straight to disk with no extension or content checks — abuse that trust boundary.",
    });

    let verificationToken = null;
    if (isSuccess && userId && challengeId) {
      try {
        verificationToken = generateVerificationToken(userId, challengeId);
      } catch (err) {
        console.error("Error generating verification token:", err);
      }
    }

    const fj = flagJsString(flag);
    const cj = flagJsString(challengeId);
    const tj = flagJsString(verificationToken || "");

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(skin.docTitle)}</title>
      ${skin.fontLink}
      <style>
        ${skin.globalCss}
        .lab-skin .container { max-width: 720px; }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Upload endpoint</h2>
        <div class="lab-info-box">Server stores files under the original filename — predict where it lands.</div>
        <form method="POST" enctype="multipart/form-data">
          <input type="file" name="file" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Upload</button>
        </form>
        ${
          isSuccess
            ? `
          <p class="success lab-success-text" style="margin-top:14px">Upload accepted. Flag: ${escapeHtml(flag)}</p>
          <script>
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({
                type: 'CHALLENGE_SOLVED',
                challengeId: ${cj},
                flag: ${fj},
                answer: ${fj},
                verificationToken: ${tj}
              }, '*');
            }
          </script>
        `
            : ""
        }
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[File Upload Basic]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/", upload.single("file"), (req, res) => {
  const challengeId = req.body.challengeId || "";
  const userId = req.body.userId || "";
  if (req.file) {
    return res.redirect(
      `/lab/file-upload-basic?success=1&challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`
    );
  }
  res.redirect(
    `/lab/file-upload-basic?challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`
  );
});

module.exports = router;

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

const blacklistedExtensions = [".php", ".jsp", ".asp", ".exe", ".sh"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (blacklistedExtensions.includes(fileExt)) {
      cb(new Error("File type not allowed"));
    } else {
      cb(null, true);
    }
  },
});

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const isSuccess = req.query.success === "1" || req.query.success === "true";
    const flag = await resolveFlagForLab(challengeId, "FLAG{polyglot_upload_hard_018}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · Upload (extension bypass)",
      objective: "Trailing extension filters miss polyglots and double extensions — land a shell anyway.",
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
      <style>${skin.globalCss} .lab-skin .container { max-width: 800px; }</style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Hardened uploader</h2>
        <div class="lab-info-box">Blocked suffixes: .php, .jsp, .asp, .exe, .sh — parsers may still disagree with the OS.</div>
        <form method="POST" enctype="multipart/form-data">
          <input type="file" name="file" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Upload</button>
        </form>
        ${
          isSuccess
            ? `
          <p class="lab-success-text" style="margin-top:14px">Bypass accepted. Flag: ${escapeHtml(flag)}</p>
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
        ${req.query.error ? `<p class="lab-error-text">${escapeHtml(req.query.error)}</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[File Upload Hard]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/", (req, res) => {
  const challengeId = req.body.challengeId || "";
  const userId = req.body.userId || "";
  const q = `challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`;
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.redirect(`/lab/file-upload-hard?error=${encodeURIComponent(err.message)}&${q}`);
    }
    if (req.file) {
      const filename = req.file.filename.toLowerCase();
      if (
        filename.includes(".php") ||
        filename.includes("shell") ||
        filename.includes("%00") ||
        filename.includes("php.jpg") ||
        filename.includes("php.png")
      ) {
        return res.redirect(`/lab/file-upload-hard?success=1&${q}`);
      }
      return res.redirect(`/lab/file-upload-hard?success=1&${q}`);
    }
    res.redirect(`/lab/file-upload-hard?${q}`);
  });
});

module.exports = router;

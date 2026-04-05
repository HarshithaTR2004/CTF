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

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.get("/", async (req, res) => {
  try {
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const isSuccess = req.query.success === "1" || req.query.success === "true";
    const flag = await resolveFlagForLab(challengeId, "FLAG{file_upload_medium_012}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · Upload (MIME bypass)",
      objective: "Server trusts Content-Type more than bytes — smuggle an executable under an image label.",
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
        <h2>Media upload</h2>
        <div class="lab-info-box">Allowed MIME classes: JPEG, PNG, GIF only (server-side filter).</div>
        <form method="POST" enctype="multipart/form-data">
          <input type="file" name="file" required />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">Upload</button>
        </form>
        ${
          isSuccess
            ? `
          <p class="lab-success-text" style="margin-top:14px">Stored. Flag: ${escapeHtml(flag)}</p>
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
    console.error("[File Upload Medium]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

router.post("/", (req, res) => {
  const challengeId = req.body.challengeId || "";
  const userId = req.body.userId || "";
  const q = `challengeId=${encodeURIComponent(challengeId)}&userId=${encodeURIComponent(userId)}`;
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.redirect(`/lab/file-upload-medium?error=${encodeURIComponent(err.message)}&${q}`);
    }
    if (req.file) {
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      if (fileExt === ".php" || fileExt === ".jsp" || req.file.originalname.endsWith(".php.jpg")) {
        return res.redirect(`/lab/file-upload-medium?success=1&${q}`);
      }
      return res.redirect(`/lab/file-upload-medium?success=1&${q}`);
    }
    res.redirect(`/lab/file-upload-medium?${q}`);
  });
});

module.exports = router;

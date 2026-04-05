const express = require("express");
const router = express.Router();
const { generateVerificationToken } = require("../utils/challengeVerification");
const { resolveFlagForLab, escapeHtml, flagJsString } = require("./challengeFlag");
const { fetchChallengeForLab, buildLabSkin } = require("./labTheme");

const invoices = {
  1001: { id: 1001, userId: 1, amount: 1000, items: ["Product A"] },
  1002: { id: 1002, userId: 2, amount: 500, items: ["Product B"] },
  1003: { id: 1003, userId: 3, amount: 750, items: ["Product C"] },
  1004: { id: 1004, userId: 1, amount: 2000, items: ["Product D", "Product E"] },
};

router.get("/", async (req, res) => {
  try {
    const invoiceId = req.query.invoiceId || "1002";
    const challengeId = req.query.challengeId || "";
    const userId = req.query.userId || "";
    const flag = await resolveFlagForLab(challengeId, "FLAG{idor_api_medium_011}");
    const ch = await fetchChallengeForLab(challengeId);
    const skin = buildLabSkin(challengeId, ch, {
      routeLabel: "Web · IDOR (API object)",
      objective: "Sequential invoice IDs leak cross-tenant rows — locate the privileged invoice.",
    });

    const base = invoices[invoiceId];
    const invoice = base && String(invoiceId) === "1001" ? { ...base, flag } : base;

    const isExploited = Boolean(invoice && invoice.flag);

    let verificationToken = null;
    if (isExploited && userId && challengeId) {
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
        .lab-skin .container { max-width: 800px; }
        .lab-skin .invoice { padding: 16px; background: color-mix(in srgb, var(--lab-bg) 40%, var(--lab-surface)); margin: 18px 0; border-radius: calc(var(--lab-radius) * 0.55); border: 1px solid var(--lab-border); }
      </style>
    </head>
    <body class="${skin.bodyClass}">
      <div class="lab-wrap">
        ${skin.missionBar}
        <div class="container lab-panel">
        <h2>Billing portal</h2>
        <p style="color:var(--lab-muted)">Session: user <strong>2</strong> — default invoice <strong>1002</strong>.</p>
        <form method="GET">
          <input name="invoiceId" placeholder="Invoice ID" value="${escapeHtml(String(invoiceId))}" />
          <input type="hidden" name="challengeId" value="${challengeId}" />
          <input type="hidden" name="userId" value="${userId}" />
          <button type="submit">View invoice</button>
        </form>
        ${
          invoice
            ? `
          <div class="invoice">
            <h3>Invoice #${invoice.id}</h3>
            <p>User ID: ${invoice.userId}</p>
            <p>Amount: $${invoice.amount}</p>
            <p>Items: ${escapeHtml(invoice.items.join(", "))}</p>
            ${
              isExploited
                ? `
              <p class="lab-success-text" style="margin-top:12px">Flag: ${escapeHtml(invoice.flag)}</p>
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
        `
            : "<p style=\"color:var(--lab-muted)\">Invoice not found.</p>"
        }
        </div>
      </div>
    </body>
    </html>
  `);
  } catch (err) {
    console.error("[IDOR Medium]", err);
    res.status(500).send("Lab temporarily unavailable.");
  }
});

module.exports = router;

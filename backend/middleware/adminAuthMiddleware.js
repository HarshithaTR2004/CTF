const auth = require("./authMiddleware");

module.exports = function (req, res, next) {
  auth(req, res, () => {
    if (req.user && req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({ msg: "Access denied: Not an administrator" });
    }
  });
};
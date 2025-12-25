const jwt = require("jsonwebtoken");

module.exports = function jwtTenantContext(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "testsecret");

    if (!decoded.companyId) {
      return res.status(403).json({
        success: false,
        message: "Company context required",
      });
    }

    req.user = {
      companyId: decoded.companyId,
      role: decoded.role || "user",
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

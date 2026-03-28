import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "superxbet_secret";

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
};

export const adminOrAgent = (req, res, next) => {
  if (!req.user || !["admin", "agent"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
};
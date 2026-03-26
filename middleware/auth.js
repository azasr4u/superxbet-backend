import jwt from "jsonwebtoken";

const JWT_SECRET = "superxbet_secret";

export const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
};

export const adminOrAgent = (req, res, next) => {
  if (
    req.user.role !== "admin" &&
    req.user.role !== "agent"
  ) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
};
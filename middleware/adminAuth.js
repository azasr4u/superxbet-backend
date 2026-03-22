import jwt from "jsonwebtoken";

export default function (req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, "superxbet_secret");

    req.user = decoded;

    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
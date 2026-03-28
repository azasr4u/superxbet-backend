// ================= ROLE MIDDLEWARE =================

// ADMIN ONLY
export const adminOnly = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin only access" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ADMIN + AGENT
export const agentOrAdmin = (req, res, next) => {
  try {
    if (!req.user || !["admin", "agent"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
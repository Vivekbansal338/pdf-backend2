import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export const getToken = (req, res) => {
  try {
    const userId = uuidv4();

    const token = jwt.sign({ userId }, process.env.JWT_SECRET);

    return res.json({
      token,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const verifyToken = (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return res.json({
      valid: true,
      userId: decoded.userId,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      valid: false,
      error: error.message,
    });
  }
};

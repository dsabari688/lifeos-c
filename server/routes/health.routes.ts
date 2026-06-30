import express from "express";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "UP", timestamp: new Date().toISOString() });
});

router.get("/ready", (req, res) => {
  res.json({ status: "READY", timestamp: new Date().toISOString() });
});

export default router;

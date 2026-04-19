import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import { discoverRouter } from "./routes/discover.js";
import { runDiscoveryBot } from "./bot/runner.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "coldreach-pro-backend" });
});

app.use("/discover", discoverRouter);

// Every 12 hours.
cron.schedule("0 */12 * * *", async () => {
  console.log("[scheduler] Starting 12-hour discovery bot run...");
  await runDiscoveryBot();
});

const port = Number(process.env.DISCOVERY_PORT || 8787);
app.listen(port, () => {
  console.log(`ColdReach-Pro backend listening at http://localhost:${port}`);
});

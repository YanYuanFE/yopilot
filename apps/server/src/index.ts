import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { chatRoute } from "./routes/chat";
import { vaultsRoute } from "./routes/vaults";

const app = new Hono();

app.use("/*", cors({
  origin: process.env.NODE_ENV === "production"
    ? "*"
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type"],
}));

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/api", chatRoute);
app.route("/api", vaultsRoute);

const port = parseInt(process.env.PORT || "3001");
console.log(`YoPilot server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

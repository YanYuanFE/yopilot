import { Hono } from "hono";
import { handleToolCall } from "../tools/vault-tools.js";

export const vaultsRoute = new Hono();

vaultsRoute.get("/vaults", async (c) => {
  try {
    const data = await handleToolCall("get_all_vault_snapshots", {});
    return c.json(data);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

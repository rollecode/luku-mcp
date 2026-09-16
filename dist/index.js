#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// Luku over stdio, for Claude Code. Luku serves the MCP itself at /mcp, so this
// is a bridge rather than a second implementation: the tool list and every call
// come from the app, and the tools can never drift out of step with it.
//
//   LUKU_API_URL    where Luku lives, https://luku.app unless self-hosted
//   LUKU_API_TOKEN  a personal access token from Settings > API
const API_URL = (process.env.LUKU_API_URL || "https://luku.app").replace(/\/+$/, "");
const API_TOKEN = process.env.LUKU_API_TOKEN || "";
if (!API_TOKEN) {
    console.error("luku-mcp: LUKU_API_TOKEN is required. Mint one in Luku under Settings > API.");
    process.exit(1);
}
let nextId = 1;
async function call(method, params) {
    const response = await fetch(`${API_URL}/mcp`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    });
    const text = await response.text();
    if (response.status === 401) {
        throw new Error("Luku rejected the token. Check LUKU_API_TOKEN, or mint a new one.");
    }
    if (!response.ok) {
        throw new Error(`Luku returned ${response.status}: ${text.slice(0, 300)}`);
    }
    const body = JSON.parse(text);
    if (body.error) {
        throw new Error(body.error.message);
    }
    return body.result;
}
const server = new Server({ name: "luku", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => {
    const result = (await call("tools/list"));
    return { tools: result.tools };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        return (await call("tools/call", {
            name: request.params.name,
            arguments: request.params.arguments ?? {},
        }));
    }
    catch (thrown) {
        const message = thrown instanceof Error ? thrown.message : String(thrown);
        return { content: [{ type: "text", text: message }], isError: true };
    }
});
// Fail at startup rather than on the first tool call, so a bad token or a
// server that is down is reported where it can be read.
await call("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "luku-mcp", version: "1.0.0" },
});
await server.connect(new StdioServerTransport());

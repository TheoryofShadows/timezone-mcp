#!/usr/bin/env node
/**
 * @mcpx-digital/timezone — MCP server for IANA timezone conversion & meeting overlap.
 * Pure date-fns-tz / Intl — no external APIs.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { convertTimezone, whatTimeWhen, meetingOverlap, listCommonZones } from "./lib.js";

const NOTICE = "Uses local date-fns-tz / Intl only — no external time APIs.";

const TOOLS = [
  {
    name: "convert_timezone",
    description: "Convert a moment between IANA timezones. " + NOTICE,
    inputSchema: {
      type: "object",
      properties: {
        when: { type: "string", description: "ISO time, or 'now'. Naive local times interpreted in fromZone." },
        fromZone: { type: "string", description: "Source IANA zone (default UTC)." },
        toZone: { type: "string", description: "Target IANA zone." },
        from: { type: "string", description: "Alias for fromZone." },
        to: { type: "string", description: "Alias for toZone." },
      },
      required: ["toZone"],
    },
  },
  {
    name: "what_time_when",
    description:
      "Answer: what time is it in targetZone when it is localTime in sourceZone. " + NOTICE,
    inputSchema: {
      type: "object",
      properties: {
        sourceZone: { type: "string", description: "Zone where localTime applies." },
        targetZone: { type: "string", description: "Zone to convert into." },
        localTime: { type: "string", description: "HH:mm or YYYY-MM-DDTHH:mm[:ss]" },
        date: { type: "string", description: "YYYY-MM-DD if localTime is HH:mm only." },
      },
      required: ["sourceZone", "targetZone", "localTime"],
    },
  },
  {
    name: "meeting_overlap",
    description:
      "Find overlapping meeting slots for N participants with local work hours on a date. " + NOTICE,
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD (default: today UTC)." },
        durationMinutes: { type: "number", description: "Meeting length (default 30)." },
        stepMinutes: { type: "number", description: "Slot step (default 15)." },
        maxSlots: { type: "number", description: "Cap returned slots (default 50)." },
        participants: {
          type: "array",
          description: "[{ zone, workStart, workEnd, name? }]",
          items: {
            type: "object",
            properties: {
              zone: { type: "string" },
              workStart: { type: "string" },
              workEnd: { type: "string" },
              name: { type: "string" },
            },
          },
        },
      },
      required: ["participants"],
    },
  },
  {
    name: "list_common_zones",
    description: "List a curated set of common IANA timezones. " + NOTICE,
    inputSchema: { type: "object", properties: {} },
  },
];

const handlers = {
  convert_timezone: convertTimezone,
  what_time_when: whatTimeWhen,
  meeting_overlap: meetingOverlap,
  list_common_zones: () => ({ zones: listCommonZones() }),
};

const server = new Server(
  { name: "timezone", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments ?? {};
  const handler = handlers[name];
  if (!handler) {
    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }
  try {
    const result = await handler(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: JSON.stringify({ error: message }, null, 2) }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

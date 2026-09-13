# @mcpx-digital/timezone

**MCP server for IANA timezone conversion, cross-zone “what time when”, and meeting overlap windows.**

Pure **date-fns-tz / Intl** — no external time APIs, no network calls.

## Install (MCPX / npx)

```bash
npx -y @mcpx-digital/timezone
```

> Prepared for npm as `@mcpx-digital/timezone`. Until published, run from a local clone.

## Cursor `mcp.json` example

```json
{
  "mcpServers": {
    "timezone": {
      "command": "npx",
      "args": ["-y", "@mcpx-digital/timezone"]
    }
  }
}
```

Local clone:

```json
{
  "mcpServers": {
    "timezone": {
      "command": "node",
      "args": ["/absolute/path/to/timezone-mcp/index.js"]
    }
  }
}
```

## Tools

| Tool | What it does |
|------|----------------|
| `convert_timezone` | Convert a moment between IANA zones |
| `what_time_when` | “What time is it in X when it’s Y in Z?” |
| `meeting_overlap` | Overlapping slots for N participants’ work hours |
| `list_common_zones` | Curated common IANA zone list |

## Example prompts

- “Convert 3pm UTC to America/Los_Angeles”
- “When it’s 9:00 in Tokyo, what time is it in New York on 2026-09-12?”
- “Find 30-minute meeting slots for NY 9–17 and London 9–17 on 2026-03-10”

## Development

```bash
git clone https://github.com/TheoryofShadows/timezone-mcp.git
cd timezone-mcp
npm install
npm test
node index.js
```

## Sell / list on MCPX

Suggested listing price: **$5**.

Install command: `npx -y @mcpx-digital/timezone`

## License

MIT © TheoryofShadows

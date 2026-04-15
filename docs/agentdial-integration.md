# WikiMem + AgentDial Integration

Give your wiki an agent identity. Users can email articles in, ask questions via Slack DM, or SMS a question and get a summarized answer — all routed through the existing ingest/query pipeline.

## How It Works

WikiMem exposes two webhook endpoints that AgentDial routes to:

| Channel | Endpoint | Action |
|---------|----------|--------|
| Email | `POST /api/agentdial/email` | Ingest email body into wiki |
| Slack | `POST /api/agentdial/slack` | Answer questions from wiki |

The endpoints accept the webhook payload from AgentDial's gateway, call the existing ingest/query pipeline, and return a `reply` field. AgentDial's gateway delivers that reply back to the channel. WikiMem never calls Slack or AgentMail APIs directly.

## Privacy Model

All data stays in the user's vault:
- Email bodies are written to `raw/_agentdial_tmp/` and ingested like any other source
- Slack questions are answered from local wiki pages only — no data leaves the vault
- No telemetry is sent to AgentDial beyond the webhook response

## Setup

### 1. Run WikiMem Server

```bash
wikimem serve --vault ~/my-wiki --port 3456
```

### 2. Set Up AgentDial Identity

```bash
agentdial setup   # creates IDENTITY.md, name your agent "wikimem"
```

Point the agent URL at your wikimem server:

```
agent_url: http://localhost:3456
```

### 3. Add Channels

**Email (AgentMail)**

```bash
agentdial channels add email
```

AgentDial will provision `wikimem@user.agentdial.com`. Incoming emails POST to:
```
POST /api/agentdial/email
{
  "subject": "Article title",
  "body": "Full email text",
  "from": "sender@example.com",
  "attachments": []   // optional text/plain or text/html attachments
}
```

Response includes `reply` with what was ingested — AgentDial emails it back to the sender.

**Slack (DM or mention)**

```bash
agentdial channels add slack
```

Configure the Slack event webhook URL to:
```
POST /api/agentdial/slack
```

The endpoint handles:
- `url_verification` handshake automatically (returns `{"challenge": "..."}`)
- DMs and `@wikimem what do I know about X?` mentions
- Strips the `<@UXXXXX>` mention prefix before querying

Response includes `reply` with the answer and source page names — AgentDial posts it to the channel.

**SMS**

SMS questions arrive as flat text. Route AgentDial's SMS webhook to `/api/agentdial/slack` with the body `{"text": "<question>", "channel": "<number>"}` — the endpoint handles flat shape identically.

## Testing

```bash
# Email ingest
curl -X POST localhost:3456/api/agentdial/email \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test","body":"TypeScript is a typed superset of JS.","from":"user@example.com"}'

# Slack URL verification
curl -X POST localhost:3456/api/agentdial/slack \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"abc123"}'

# Slack question
curl -X POST localhost:3456/api/agentdial/slack \
  -H "Content-Type: application/json" \
  -d '{"text":"<@U12345> what do I know about TypeScript?","channel":"C12345"}'
```

## Response Shapes

**Email endpoint**

```json
{
  "ingested": true,
  "titles": ["TypeScript Overview"],
  "pagesUpdated": 2,
  "reply": "Ingested into your wiki:\n- TypeScript Overview\n\n2 pages updated."
}
```

**Slack endpoint**

```json
{
  "answer": "TypeScript is a typed superset...",
  "sources": ["TypeScript Overview", "JavaScript Basics"],
  "channel": "C12345",
  "reply": "TypeScript is a typed superset...\n\nSources: *TypeScript Overview*, *JavaScript Basics*"
}
```

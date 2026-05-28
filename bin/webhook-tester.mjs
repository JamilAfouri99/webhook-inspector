#!/usr/bin/env node
// Webhook Tester CLI — forward events from a remote channel to a local URL.
// Usage: webhook-tester forward --channel <slug> --to <url> [--base http://localhost:4100]

const HOP_BY_HOP = new Set([
  'host', 'connection', 'content-length', 'keep-alive',
  'transfer-encoding', 'upgrade', 'proxy-connection', 'te', 'trailer',
])

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) { out[key] = true }
      else { out[key] = next; i++ }
    } else {
      out._.push(a)
    }
  }
  return out
}

function usage() {
  console.log(`webhook-tester — forward remote channel events to a local URL

  webhook-tester forward --channel <slug> --to <url> [--base <baseUrl>]

Options
  --channel  Channel slug to subscribe to (required)
  --to       Local URL that receives forwarded webhooks (required)
  --base     Base URL of the webhook-tester server (default: http://localhost:4100)
  --quiet    Suppress per-event log lines
  --help     Show this help

Examples
  webhook-tester forward --channel smoke-test --to http://localhost:3000/webhook
  webhook-tester forward --channel payments-staging --to http://localhost:3000/api/stripe --base https://hooks.acme.dev
`)
}

async function forward({ channel, to, base, quiet }) {
  const url = `${base.replace(/\/$/, '')}/api/channels/${channel}/events`
  if (!quiet) console.log(`webhook-tester · subscribing to ${url}`)
  if (!quiet) console.log(`webhook-tester · forwarding to ${to}`)

  while (true) {
    try {
      const res = await fetch(url, { headers: { Accept: 'text/event-stream' } })
      if (!res.ok || !res.body) {
        console.error(`webhook-tester · upstream error ${res.status}; retrying in 3s`)
        await new Promise((r) => setTimeout(r, 3000))
        continue
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          await handleBlock(block, to, quiet)
        }
      }
    } catch (e) {
      console.error(`webhook-tester · connection lost (${e.message}); retrying in 3s`)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}

async function handleBlock(block, to, quiet) {
  const lines = block.split('\n')
  let event = ''
  const dataLines = []
  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7).trim()
    else if (line.startsWith('data: ')) dataLines.push(line.slice(6))
  }
  if (event !== 'webhook' || dataLines.length === 0) return

  let webhook
  try {
    webhook = JSON.parse(dataLines.join('\n'))
  } catch {
    return
  }

  const headers = {}
  for (const [k, v] of Object.entries(webhook.headers || {})) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue
    if (Array.isArray(v)) headers[k] = v.join(', ')
    else if (typeof v === 'string') headers[k] = v
  }
  if (!headers['content-type']) headers['content-type'] = 'application/json'
  headers['X-Webhook-Tester-Forwarded-By'] = 'cli'

  const startMs = Date.now()
  try {
    const r = await fetch(to, {
      method: webhook.method || 'POST',
      headers,
      body: webhook.body == null ? undefined : JSON.stringify(webhook.body),
      redirect: 'manual',
    })
    if (!quiet) {
      const ms = Date.now() - startMs
      const evt = webhook.body?.event ?? '(no event)'
      console.log(`forwarded · #${webhook.index} · ${evt} · ${r.status} · ${ms}ms`)
    }
  } catch (e) {
    console.error(`forward failed · #${webhook.index} · ${e.message}`)
  }
}

const args = parseArgs(process.argv.slice(2))
if (args.help || args._[0] === 'help') { usage(); process.exit(0) }

if (args._[0] !== 'forward') {
  usage()
  process.exit(args._[0] ? 1 : 0)
}

if (!args.channel || !args.to) {
  console.error('webhook-tester · --channel and --to are required\n')
  usage()
  process.exit(1)
}

const base = typeof args.base === 'string' ? args.base : 'http://localhost:4100'
forward({ channel: args.channel, to: args.to, base, quiet: !!args.quiet })
  .catch((e) => { console.error(e); process.exit(1) })

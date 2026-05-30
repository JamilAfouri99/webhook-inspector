import { route, requireChannel } from '@/lib/api/handler'
import { addListener } from '@/lib/channel-events'

export const dynamic = 'force-dynamic'

const HEARTBEAT_MS = 15_000

export const GET = route<{ slug: string }>(async (request, { slug }) => {
  await requireChannel(slug)

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      let closed = false

      function teardown() {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        removeListener()
      }

      function send(event: string, data: unknown) {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Client went away mid-write — stop listening so we don't leak.
          teardown()
        }
      }

      const heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          teardown()
        }
      }, HEARTBEAT_MS)

      const removeListener = addListener(slug, (event, data) => send(event, data))

      request.signal.addEventListener('abort', teardown)

      send('connected', { channel: slug })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
})

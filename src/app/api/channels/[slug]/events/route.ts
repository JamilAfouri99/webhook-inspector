import { NextRequest } from 'next/server'
import { addListener, getChannel } from '@/lib/webhook-state'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const channel = await getChannel(slug)
  if (!channel) {
    return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      send('connected', { channel: slug })

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')) } catch { clearInterval(heartbeat) }
      }, 15000)

      const removeListener = addListener(slug, (event, data) => {
        try { send(event, data) } catch { /* client disconnected */ }
      })

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        removeListener()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

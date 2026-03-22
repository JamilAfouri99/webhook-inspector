'use client'

import { useState, useEffect } from 'react'

type WebhookEventDef = {
  value: string
  label: string
  category: 'order' | 'payment' | 'test'
  payload: object
  context: Record<string, string>
}

const webhookEvents: WebhookEventDef[] = [
  // Order lifecycle
  { value: 'order.created', label: 'Created', category: 'order', payload: { orderId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', totalAmount: 14999, currency: 'USD' }, context: { orderId: 'test-order-001' } },
  { value: 'order.confirmed', label: 'Confirmed', category: 'order', payload: {}, context: { orderId: 'test-order-001' } },
  { value: 'order.cancelled', label: 'Cancelled', category: 'order', payload: { reason: { code: 'CUSTOMER_REQUEST', message: 'Customer requested cancellation' } }, context: { orderId: 'test-order-001' } },
  { value: 'order.updated', label: 'Updated', category: 'order', payload: { changes: [{ field: 'shipping_address', reason: 'Customer updated their delivery address' }] }, context: { orderId: 'test-order-001' } },
  { value: 'order.refunded', label: 'Refunded', category: 'order', payload: { previousStatus: 'confirmed', reason: 'Item out of stock' }, context: { orderId: 'test-order-001' } },
  { value: 'order.fulfilled', label: 'Fulfilled', category: 'order', payload: { trackingNumber: '1Z999AA10123456784', carrier: 'UPS' }, context: { orderId: 'test-order-001' } },

  // Payment lifecycle
  { value: 'payment.completed', label: 'Completed', category: 'payment', payload: { paymentId: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a' }, context: { paymentId: 'test-payment-001' } },
  { value: 'payment.failed', label: 'Failed', category: 'payment', payload: { paymentId: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a', errorCode: 'CARD_DECLINED' }, context: { paymentId: 'test-payment-001' } },
  { value: 'payment.refunded', label: 'Refunded', category: 'payment', payload: { paymentId: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a', refundAmount: 4999 }, context: { paymentId: 'test-payment-001' } },
  { value: 'invoice.paid', label: 'Invoice Paid', category: 'payment', payload: { invoiceId: 'e4d909c2-90d0-4b05-9c59-f5b21bde4e50', amount: 9900, currency: 'USD' }, context: { invoiceId: 'test-invoice-001' } },
  { value: 'invoice.overdue', label: 'Invoice Overdue', category: 'payment', payload: { invoiceId: 'e4d909c2-90d0-4b05-9c59-f5b21bde4e50', dueDate: '2025-01-15', daysOverdue: 7 }, context: { invoiceId: 'test-invoice-001' } },
  { value: 'subscription.renewed', label: 'Subscription Renewed', category: 'payment', payload: {
    subscriptionId: 'b2d8f636-28a2-4b6e-bc6e-31f58c27a9b3',
    plan: 'pro',
    billingPeriod: 'monthly',
    nextBillingDate: '2025-03-01T00:00:00.000Z',
    lineItems: [
      { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', type: 'SUBSCRIPTION_FEE', amount: 4900, description: 'Pro plan - monthly', status: 'Paid' },
      { id: 'aab3238e-e612-4e3a-b2e5-7c5e2b0c93f1', type: 'PLATFORM_FEE', amount: 500, description: 'Platform usage fee', status: 'Paid' },
    ],
  }, context: { subscriptionId: 'test-sub-001' } },

  // Payment attempt details
  { value: 'payment.initial_attempt', label: 'Initial Attempt', category: 'payment', payload: {
    orderId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    totalAmount: 15000,
    status: 'succeeded',
    successfulPayments: [
      { paymentId: '7c9e6679-7425-40de-944b-e07fc1f90ae7', amount: 12000, paymentType: 'ORDER_PAYMENT', clearedAt: '2025-01-15T10:30:00.000Z' },
      { paymentId: 'aab3238e-e612-4e3a-b2e5-7c5e2b0c93f1', amount: 3000, paymentType: 'SERVICE_FEE', clearedAt: '2025-01-15T10:30:00.000Z' },
    ],
    failedPayments: [],
  }, context: { orderId: 'test-order-001', paymentId: 'test-payment-001' } },
  { value: 'payment.retry_attempt', label: 'Retry Attempt', category: 'payment', payload: {
    orderId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    totalAmount: 5000,
    status: 'succeeded',
    type: 'retry',
    payments: [
      { paymentId: '7c9e6679-7425-40de-944b-e07fc1f90ae7', amount: 5000, paymentType: 'ORDER_PAYMENT', from: 'customer', to: 'merchant', status: 'succeeded', clearedAt: '2025-02-01T09:00:00.000Z' },
    ],
  }, context: { orderId: 'test-order-001', paymentId: 'test-payment-001' } },

  // Test
  { value: 'test.ping', label: 'Test Ping', category: 'test', payload: { message: 'This is a test webhook event' }, context: {} },
]

const DEFAULT_EVENT_INDEX = Math.max(0, webhookEvents.findIndex(e => e.value === 'test.ping'))

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function TestTriggerPanel({ channelSlug }: { channelSlug: string }) {
  const [selectedEvent, setSelectedEvent] = useState(webhookEvents[DEFAULT_EVENT_INDEX])
  const [customPayload, setCustomPayload] = useState('')
  const [payloadError, setPayloadError] = useState<string | null>(null)
  const [targetUrl, setTargetUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [placeholderUrl, setPlaceholderUrl] = useState('')

  // Avoid hydration mismatch by setting placeholder after mount
  useEffect(() => {
    setPlaceholderUrl(`${window.location.origin}/api/webhook/${channelSlug}`)
  }, [])

  async function sendTestWebhook() {
    setPayloadError(null)
    setSending(true)
    setResult(null)

    let payload: any
    if (customPayload) {
      try {
        payload = JSON.parse(customPayload)
      } catch (e) {
        setPayloadError(`Invalid JSON: ${(e as Error).message}`)
        setSending(false)
        return
      }
    } else {
      payload = { ...selectedEvent.payload }
      if (selectedEvent.value === 'test.ping') {
        payload.testTimestamp = new Date().toISOString()
      }
    }

    try {
      const url = targetUrl || `${window.location.origin}/api/webhook/${channelSlug}`

      const envelope = {
        apiVersion: 'v1',
        event: selectedEvent.value,
        eventId: generateId(),
        timestamp: new Date().toISOString(),
        partner: { externalUserId: 'test-user-001' },
        context: selectedEvent.context,
        data: payload,
      }

      const startTime = Date.now()
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Webhook-Tester/1.0',
          'X-Webhook-Signature': 'test-no-signature',
        },
        body: JSON.stringify(envelope),
      })

      const responseTime = Date.now() - startTime
      let responseBody
      const responseText = await response.text()
      try {
        responseBody = JSON.parse(responseText)
      } catch {
        responseBody = responseText || undefined
      }

      setResult({
        success: response.ok,
        statusCode: response.status,
        responseTime,
        responseBody,
        requestPayload: envelope,
      })
    } catch (e) {
      setResult({
        success: false,
        error: (e as Error).message,
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-semibold mb-4">Test Trigger</h2>
      <p className="text-xs text-[var(--muted)] mb-6">
        Send test webhook payloads to this server (or any URL) to observe the delivery lifecycle.
      </p>

      <div className="space-y-4">
        {/* Target URL */}
        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 block">Target URL (leave empty for this server)</label>
          <input
            type="text"
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder={placeholderUrl || '/api/webhook'}
            className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Event type */}
        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 block">Event Type</label>
          {(['order', 'payment', 'test'] as const).map(category => {
            const categoryEvents = webhookEvents.filter(e => e.category === category)
            const categoryLabel = { order: 'Order', payment: 'Payment', test: 'Test' }[category]
            return (
              <div key={category} className="mb-3">
                <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">{categoryLabel}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {categoryEvents.map(evt => (
                    <button
                      key={evt.value}
                      onClick={() => {
                        setSelectedEvent(evt)
                        setCustomPayload('')
                        setPayloadError(null)
                      }}
                      className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                        selectedEvent.value === evt.value
                          ? 'bg-[var(--accent-dim)]/30 border border-[var(--accent)]'
                          : 'bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--muted)]/40'
                      }`}
                    >
                      <div className="font-medium">{evt.label}</div>
                      <div className="text-[10px] text-[var(--muted)] font-mono">{evt.value}</div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Payload */}
        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 block">
            Payload (leave empty for default)
          </label>
          <textarea
            value={customPayload}
            onChange={e => {
              setCustomPayload(e.target.value)
              setPayloadError(null)
            }}
            placeholder={JSON.stringify(selectedEvent.payload, null, 2)}
            rows={5}
            className={`w-full bg-[var(--background)] border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none resize-y ${
              payloadError ? 'border-[var(--error)]' : 'border-[var(--card-border)] focus:border-[var(--accent)]'
            }`}
          />
          {payloadError && (
            <div className="text-[var(--error)] text-[10px] mt-1">{payloadError}</div>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={sendTestWebhook}
          disabled={sending}
          className="px-6 py-2.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send Webhook'}
        </button>

        {/* Result */}
        {result && (
          <div className={`rounded-lg border p-4 ${
            result.success
              ? 'border-[var(--success)]/30 bg-[var(--success)]/5'
              : 'border-[var(--error)]/30 bg-[var(--error)]/5'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-medium ${result.success ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                {result.success ? 'Success' : 'Failed'}
              </span>
              {result.statusCode !== undefined && (
                <span className="text-xs text-[var(--muted)]">Status: {result.statusCode}</span>
              )}
              {result.responseTime !== undefined && (
                <span className="text-xs text-[var(--muted)]">{result.responseTime}ms</span>
              )}
            </div>
            {result.error && (
              <div className="text-xs text-[var(--error)]">{result.error}</div>
            )}
            {result.responseBody && (
              <pre className="text-[10px] font-mono text-[var(--muted)] mt-2 overflow-auto max-h-40">
                {typeof result.responseBody === 'string' ? result.responseBody : JSON.stringify(result.responseBody, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

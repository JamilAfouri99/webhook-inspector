'use client'

import { useState, useEffect } from 'react'

type WebhookEventDef = {
  value: string
  label: string
  category: 'application' | 'tenancy' | 'test'
  payload: object
  context: Record<string, string>
}

const webhookEvents: WebhookEventDef[] = [
  // Application lifecycle
  { value: 'application.qualified', label: 'Qualified', category: 'application', payload: { annualRentalPower: 144000 }, context: { applicationId: 'test-app-001' } },
  { value: 'application.approved', label: 'Approved', category: 'application', payload: {}, context: { applicationId: 'test-app-001' } },
  { value: 'application.rejected', label: 'Rejected', category: 'application', payload: { reason: { code: 'INSUFFICIENT_INCOME', message: 'Insufficient income documentation' } }, context: { applicationId: 'test-app-001' } },
  { value: 'application.change_requested', label: 'Change Requested', category: 'application', payload: { requestedDocuments: [{ action: 'reupload', documentType: 'general', reason: 'Please re-upload the tenancy contract with valid signatures' }] }, context: { applicationId: 'test-app-001' } },
  { value: 'application.withdrawn', label: 'Withdrawn', category: 'application', payload: { previousStatus: 'document_submitted', reason: 'Tenant chose a different property' }, context: { applicationId: 'test-app-001' } },
  { value: 'application.documents_submitted', label: 'Documents Submitted', category: 'application', payload: {}, context: { applicationId: 'test-app-001' } },

  // Tenancy signing lifecycle
  { value: 'tenancy.in_signing', label: 'In Signing', category: 'tenancy', payload: { tenancyId: 'a0B7Q000001XXXXYY' }, context: { tenancyId: 'test-tenancy-001' } },
  { value: 'tenancy.rent_confirmed', label: 'Rent Confirmed', category: 'tenancy', payload: { tenancyId: 'a0B7Q000001XXXXYY' }, context: { tenancyId: 'test-tenancy-001' } },
  { value: 'tenancy.payment_plan_confirmed', label: 'Payment Plan Confirmed', category: 'tenancy', payload: { tenancyId: 'a0B7Q000001XXXXYY' }, context: { tenancyId: 'test-tenancy-001' } },
  { value: 'tenancy.tpma_tenant_signed', label: 'Tenant Signed', category: 'tenancy', payload: { tenancyId: 'a0B7Q000001XXXXYY' }, context: { tenancyId: 'test-tenancy-001' } },
  { value: 'tenancy.tpma_tenant_declined', label: 'Tenant Declined', category: 'tenancy', payload: { tenancyId: 'a0B7Q000001XXXXYY' }, context: { tenancyId: 'test-tenancy-001' } },
  { value: 'tenancy.tpma_keyper_signed', label: 'Keyper Signed', category: 'tenancy', payload: { tenancyId: 'a0B7Q000001XXXXYY' }, context: { tenancyId: 'test-tenancy-001' } },
  { value: 'tenancy.tpma_keyper_declined', label: 'Keyper Declined', category: 'tenancy', payload: { tenancyId: 'a0B7Q000001XXXXYY' }, context: { tenancyId: 'test-tenancy-001' } },
  { value: 'tenancy.published', label: 'Published', category: 'tenancy', payload: {
    tenancyId: 'a0B7Q000001XXXXYY',
    firstPayments: [
      { id: 'a0C7Q000001XXXXYY', type: 'RENT_RNPL', amount: 12000, from: 'tenant', to: 'keyper', status: 'Paid' },
      { id: 'a0C7Q000001XXXXYZ', type: 'RENT', amount: 5000, from: 'keyper', to: 'landlord', status: 'Pending' },
    ],
    payments: [
      { id: 'a0C7Q000001XXXXZZ', type: 'RENT_RNPL', amount: 5000, from: 'tenant', to: 'keyper', status: 'Pending' },
    ],
  }, context: { tenancyId: 'test-tenancy-001' } },

  // Tenancy payment lifecycle
  { value: 'tenancy.tpma_first_payment_attempt', label: 'First Payment Attempt', category: 'tenancy', payload: {
    tenancyId: 'a0B7Q000001XXXXYY',
    totalAmount: 15000,
    status: 'succeeded',
    successfulPayments: [
      { paymentId: 'a0C7Q000001XXXXYY', amount: 12000, paymentType: 'RENT_RNPL', clearedAt: '2024-06-15T10:30:00.000Z' },
      { paymentId: 'a0C7Q000001XXXXYZ', amount: 3000, paymentType: 'DIGITAL_MANAGEMENT_FEE', clearedAt: '2024-06-15T10:30:00.000Z' },
    ],
    failedPayments: [],
  }, context: { tenancyId: 'test-tenancy-001', paymentId: 'test-payment-001' } },
  { value: 'tenancy.payment_attempt', label: 'Payment Attempt', category: 'tenancy', payload: {
    tenancyId: 'a0B7Q000001XXXXYY',
    totalAmount: 5000,
    status: 'succeeded',
    type: 'user',
    payments: [
      { paymentId: 'a0C7Q000001XXXXYY', amount: 5000, paymentType: 'RENT_RNPL', from: 'tenant', to: 'keyper', status: 'succeeded', clearedAt: '2024-07-01T09:00:00.000Z' },
    ],
  }, context: { tenancyId: 'test-tenancy-001', paymentId: 'test-payment-001' } },

  // Test
  { value: 'test.ping', label: 'Test Ping', category: 'test', payload: { message: 'This is a test webhook from Keyper' }, context: {} },
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
          {(['application', 'tenancy', 'test'] as const).map(category => {
            const categoryEvents = webhookEvents.filter(e => e.category === category)
            const categoryLabel = { application: 'Application', tenancy: 'Tenancy', test: 'Test' }[category]
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

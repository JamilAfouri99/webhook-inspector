export type ProviderSample = {
  id: string
  provider: ProviderId
  providerLabel: string
  event: string
  description: string
  headers: Record<string, string>
  payload: unknown
}

export type ProviderId =
  | 'stripe' | 'github' | 'shopify' | 'slack' | 'twilio'
  | 'discord' | 'linear' | 'sentry' | 'pagerduty' | 'square'
  | 'hubspot' | 'mailgun' | 'sendgrid' | 'intercom' | 'zoom' | 'okta'

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  stripe: 'Stripe',
  github: 'GitHub',
  shopify: 'Shopify',
  slack: 'Slack',
  twilio: 'Twilio',
  discord: 'Discord',
  linear: 'Linear',
  sentry: 'Sentry',
  pagerduty: 'PagerDuty',
  square: 'Square',
  hubspot: 'HubSpot',
  mailgun: 'Mailgun',
  sendgrid: 'SendGrid',
  intercom: 'Intercom',
  zoom: 'Zoom',
  okta: 'Okta',
}

const stripeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 16)}`
const isoNow = () => new Date().toISOString()
const epochSec = () => Math.floor(Date.now() / 1000)

export const PROVIDER_SAMPLES: ProviderSample[] = [
  {
    id: 'stripe:payment_intent.succeeded',
    provider: 'stripe',
    providerLabel: 'Stripe',
    event: 'payment_intent.succeeded',
    description: 'A PaymentIntent was successfully captured.',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
      'Stripe-Signature': 't=1727625600,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd,v0=63f3a72b3b00c8...',
    },
    payload: {
      id: stripeId('evt'),
      object: 'event',
      api_version: '2024-09-30.acacia',
      created: epochSec(),
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: stripeId('pi'),
          object: 'payment_intent',
          amount: 14999,
          amount_capturable: 0,
          amount_received: 14999,
          currency: 'usd',
          customer: stripeId('cus'),
          payment_method: stripeId('pm'),
          status: 'succeeded',
          metadata: { order_id: 'ord_42', tier: 'pro' },
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: stripeId('req'), idempotency_key: null },
    },
  },
  {
    id: 'stripe:charge.refunded',
    provider: 'stripe',
    providerLabel: 'Stripe',
    event: 'charge.refunded',
    description: 'A charge was fully or partially refunded.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)', 'Stripe-Signature': 't=1727625600,v1=…' },
    payload: {
      id: stripeId('evt'),
      type: 'charge.refunded',
      created: epochSec(),
      data: {
        object: {
          id: stripeId('ch'),
          object: 'charge',
          amount: 14999,
          amount_refunded: 14999,
          currency: 'usd',
          refunded: true,
          status: 'succeeded',
        },
      },
      livemode: false,
    },
  },
  {
    id: 'stripe:invoice.payment_failed',
    provider: 'stripe',
    providerLabel: 'Stripe',
    event: 'invoice.payment_failed',
    description: 'An invoice payment attempt failed.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)', 'Stripe-Signature': 't=1727625600,v1=…' },
    payload: {
      id: stripeId('evt'),
      type: 'invoice.payment_failed',
      created: epochSec(),
      data: {
        object: {
          id: stripeId('in'),
          object: 'invoice',
          amount_due: 4900,
          attempt_count: 2,
          attempted: true,
          currency: 'usd',
          customer: stripeId('cus'),
          status: 'open',
          last_finalization_error: { code: 'payment_intent_authentication_failure', message: 'The provided PaymentMethod has failed authentication.' },
        },
      },
    },
  },
  {
    id: 'stripe:checkout.session.completed',
    provider: 'stripe',
    providerLabel: 'Stripe',
    event: 'checkout.session.completed',
    description: 'A Checkout Session completed successfully.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)', 'Stripe-Signature': 't=1727625600,v1=…' },
    payload: {
      id: stripeId('evt'),
      type: 'checkout.session.completed',
      created: epochSec(),
      data: {
        object: {
          id: stripeId('cs'),
          object: 'checkout.session',
          amount_total: 14999,
          currency: 'usd',
          customer: stripeId('cus'),
          customer_email: 'jane@example.com',
          mode: 'payment',
          payment_status: 'paid',
          status: 'complete',
        },
      },
    },
  },
  {
    id: 'stripe:customer.subscription.created',
    provider: 'stripe',
    providerLabel: 'Stripe',
    event: 'customer.subscription.created',
    description: 'A new subscription was created.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)', 'Stripe-Signature': 't=1727625600,v1=…' },
    payload: {
      id: stripeId('evt'),
      type: 'customer.subscription.created',
      created: epochSec(),
      data: {
        object: {
          id: stripeId('sub'),
          object: 'subscription',
          customer: stripeId('cus'),
          status: 'active',
          current_period_end: epochSec() + 30 * 86400,
          items: { data: [{ price: { id: stripeId('price'), product: stripeId('prod'), unit_amount: 4900, currency: 'usd' }, quantity: 1 }] },
        },
      },
    },
  },

  {
    id: 'github:push',
    provider: 'github',
    providerLabel: 'GitHub',
    event: 'push',
    description: 'A push was made to a repository branch.',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'GitHub-Hookshot/abc1234',
      'X-GitHub-Event': 'push',
      'X-GitHub-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
      'X-Hub-Signature-256': 'sha256=292c25f6d8a4b9e7b5cf6c44a4b1d8a4e5f8c1e2b6d8a9f4c2b5e8d4c7a9e5b3',
    },
    payload: {
      ref: 'refs/heads/main',
      before: '6113728f27ae82c7b1a177c8d03f9e96e0adf246',
      after: '0d1a26e67d8f5eaf1f6ba5c57fc3c7d4cf7b8a30',
      repository: { id: 35129377, name: 'webhook-tester', full_name: 'acme/webhook-tester', private: false },
      pusher: { name: 'octocat', email: 'octocat@github.com' },
      sender: { login: 'octocat', id: 583231, type: 'User' },
      commits: [
        { id: '0d1a26e67d8f5eaf1f6ba5c57fc3c7d4cf7b8a30', message: 'Fix typo in README', author: { name: 'octocat', email: 'octocat@github.com' }, added: [], removed: [], modified: ['README.md'] },
      ],
    },
  },
  {
    id: 'github:pull_request.opened',
    provider: 'github',
    providerLabel: 'GitHub',
    event: 'pull_request.opened',
    description: 'A pull request was opened.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'GitHub-Hookshot/abc1234', 'X-GitHub-Event': 'pull_request', 'X-GitHub-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958', 'X-Hub-Signature-256': 'sha256=…' },
    payload: {
      action: 'opened',
      number: 42,
      pull_request: {
        id: 1064013250,
        number: 42,
        state: 'open',
        title: 'Add webhook replay endpoint',
        user: { login: 'octocat', id: 583231 },
        head: { ref: 'feat/replay', sha: '0d1a26e' },
        base: { ref: 'main', sha: '6113728' },
        merged: false,
      },
      repository: { id: 35129377, name: 'webhook-tester', full_name: 'acme/webhook-tester' },
    },
  },
  {
    id: 'github:issues.opened',
    provider: 'github',
    providerLabel: 'GitHub',
    event: 'issues.opened',
    description: 'A new issue was opened.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'GitHub-Hookshot/abc1234', 'X-GitHub-Event': 'issues', 'X-Hub-Signature-256': 'sha256=…' },
    payload: {
      action: 'opened',
      issue: { id: 1, number: 13, title: 'Replay button is broken on Safari', state: 'open', user: { login: 'octocat' }, labels: [{ name: 'bug' }] },
      repository: { name: 'webhook-tester', full_name: 'acme/webhook-tester' },
    },
  },

  {
    id: 'shopify:orders/create',
    provider: 'shopify',
    providerLabel: 'Shopify',
    event: 'orders/create',
    description: 'A new order was placed.',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Topic': 'orders/create',
      'X-Shopify-Shop-Domain': 'acme-store.myshopify.com',
      'X-Shopify-API-Version': '2024-10',
      'X-Shopify-Webhook-Id': 'd1b1ad13-3b06-4d63-9d6e-5c84e9f23a0b',
      'X-Shopify-Hmac-Sha256': 'XWmqd0HX1cv8Wfk1kmRMfovBjLuI4Z3WLqDpx2j9PqU=',
    },
    payload: {
      id: 820982911946154508,
      admin_graphql_api_id: 'gid://shopify/Order/820982911946154508',
      app_id: null,
      browser_ip: '0.0.0.0',
      buyer_accepts_marketing: true,
      cart_token: null,
      checkout_id: 901414060,
      checkout_token: 'b9b1ad13-3b06-4d63-9d6e-5c84e9f23a0b',
      currency: 'USD',
      customer_locale: 'en',
      email: 'jane@example.com',
      financial_status: 'paid',
      total_price: '149.99',
      line_items: [
        { id: 866550311766439020, title: 'Pro Hoodie', quantity: 1, price: '149.99', sku: 'HOOD-PRO-L' },
      ],
    },
  },
  {
    id: 'shopify:refunds/create',
    provider: 'shopify',
    providerLabel: 'Shopify',
    event: 'refunds/create',
    description: 'A refund was created.',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Topic': 'refunds/create', 'X-Shopify-Shop-Domain': 'acme-store.myshopify.com', 'X-Shopify-Hmac-Sha256': 'XWmqd0HX1cv8Wfk1kmRMfovBjLuI4Z3WLqDpx2j9PqU=' },
    payload: {
      id: 929361462,
      order_id: 820982911946154508,
      created_at: isoNow(),
      processed_at: isoNow(),
      note: 'Customer requested',
      transactions: [{ id: 1068278508, amount: '149.99', kind: 'refund', status: 'success' }],
    },
  },

  {
    id: 'slack:event_callback.app_mention',
    provider: 'slack',
    providerLabel: 'Slack',
    event: 'event_callback.app_mention',
    description: 'A user mentioned your Slack app.',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Slackbot 1.0 (+https://api.slack.com/robots)',
      'X-Slack-Request-Timestamp': String(epochSec()),
      'X-Slack-Signature': 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
    },
    payload: {
      token: 'XXYYZZ',
      team_id: 'T1234567',
      api_app_id: 'A1234567',
      event: {
        type: 'app_mention',
        user: 'U99999',
        text: '<@U0LAN0Z89> deploy production please',
        ts: `${epochSec()}.000200`,
        channel: 'C0123ABC',
        event_ts: `${epochSec()}.000200`,
      },
      type: 'event_callback',
      event_id: 'Ev0PV52K21',
      event_time: epochSec(),
      authorizations: [{ enterprise_id: null, team_id: 'T1234567', user_id: 'U0LAN0Z89', is_bot: true }],
    },
  },
  {
    id: 'slack:slash_command',
    provider: 'slack',
    providerLabel: 'Slack',
    event: 'slash_command',
    description: 'A user invoked a slash command.',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Slackbot 1.0', 'X-Slack-Request-Timestamp': String(epochSec()), 'X-Slack-Signature': 'v0=…' },
    payload: {
      token: 'XXYYZZ',
      team_id: 'T1234567',
      team_domain: 'acme',
      channel_id: 'C0123ABC',
      channel_name: 'engineering',
      user_id: 'U99999',
      user_name: 'octocat',
      command: '/deploy',
      text: 'production v1.4.2',
      response_url: 'https://hooks.slack.com/commands/1234/5678',
    },
  },

  {
    id: 'twilio:message.received',
    provider: 'twilio',
    providerLabel: 'Twilio',
    event: 'message.received',
    description: 'An inbound SMS was received.',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'TwilioProxy/1.1',
      'X-Twilio-Signature': 'GvWf1ZTLF6T3WtdLwYqRcZJyMxA=',
    },
    payload: {
      ToCountry: 'US',
      ToState: 'CA',
      SmsMessageSid: 'SMabcdef1234567890',
      NumMedia: '0',
      Body: 'STOP',
      FromZip: '94110',
      FromCity: 'SAN FRANCISCO',
      From: '+14155550123',
      To: '+14155557788',
      MessagingServiceSid: 'MGabcdef1234567890',
    },
  },

  {
    id: 'discord:message_create',
    provider: 'discord',
    providerLabel: 'Discord',
    event: 'INTERACTION_CREATE',
    description: 'A slash command was invoked.',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordBot (https://discord.com, 1.0)',
      'X-Signature-Ed25519': 'abcd1234',
      'X-Signature-Timestamp': String(epochSec()),
    },
    payload: {
      id: '786008729715212338',
      type: 2,
      data: { id: '786008729715212337', name: 'status', options: [{ name: 'service', type: 3, value: 'api' }] },
      guild_id: '290926798626357999',
      channel_id: '645027906669510667',
      member: { user: { id: '53908232506183680', username: 'octocat' } },
      version: 1,
    },
  },

  {
    id: 'linear:issue.created',
    provider: 'linear',
    providerLabel: 'Linear',
    event: 'Issue.create',
    description: 'A new Linear issue was created.',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Linear-Webhook/1.0',
      'Linear-Delivery': 'd5b3fbe6-9c41-4d9d-9f06-7e7a4f8bf123',
      'Linear-Event': 'Issue',
      'Linear-Signature': 'sha256=…',
    },
    payload: {
      action: 'create',
      type: 'Issue',
      data: {
        id: 'b3e7a1d3-9fc1-4cf3-90c0-9eebda7e6d5d',
        title: 'Fix flaky retry test',
        priority: 2,
        state: { name: 'Todo' },
        assignee: { name: 'Octocat' },
        labels: [{ name: 'bug' }],
      },
      url: 'https://linear.app/acme/issue/ENG-42',
    },
  },

  {
    id: 'sentry:issue.alert',
    provider: 'sentry',
    providerLabel: 'Sentry',
    event: 'issue.alert',
    description: 'A Sentry issue triggered an alert rule.',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Sentry/v1',
      'Sentry-Hook-Resource': 'event_alert',
      'Sentry-Hook-Timestamp': String(epochSec()),
      'Sentry-Hook-Signature': 'a4f5b6c7d8e9…',
    },
    payload: {
      action: 'triggered',
      data: {
        event: {
          event_id: 'a4f5b6c7d8e9f1a2b3c4d5e6f7a8b9c0',
          level: 'error',
          message: 'TypeError: Cannot read properties of undefined (reading \'map\')',
          platform: 'javascript',
          environment: 'production',
          release: 'web@v1.4.2',
          url: 'https://acme.com/dashboard',
        },
      },
    },
  },

  {
    id: 'pagerduty:incident.triggered',
    provider: 'pagerduty',
    providerLabel: 'PagerDuty',
    event: 'incident.triggered',
    description: 'A PagerDuty incident was triggered.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'PagerDuty-Webhook/1.0', 'X-PagerDuty-Signature': 'v1=…' },
    payload: {
      event: {
        id: 'a4f5b6c7-d8e9-f1a2-b3c4-d5e6f7a8b9c0',
        event_type: 'incident.triggered',
        occurred_at: isoNow(),
        data: { id: 'P3CV7QY', type: 'incident', urgency: 'high', title: 'API latency p99 > 2s', status: 'triggered' },
      },
    },
  },

  {
    id: 'square:payment.updated',
    provider: 'square',
    providerLabel: 'Square',
    event: 'payment.updated',
    description: 'A payment was updated.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Square-Connect-Webhooks-2.0', 'Square-Signature': '1k9bjCnVMyhTKvOaSyJJqfgD9XzExJ8e1bn8TIzlGRY=' },
    payload: {
      merchant_id: 'JQ7KZ7VQ8YQZQ',
      type: 'payment.updated',
      event_id: 'b5b09a9a-3f8c-4d4f-a8f3-3d3d8f8e3f8c',
      created_at: isoNow(),
      data: {
        type: 'payment',
        id: 'KkAkhdMsgzn59SM8A89WgKwekxLZY',
        object: { payment: { amount_money: { amount: 14999, currency: 'USD' }, status: 'COMPLETED' } },
      },
    },
  },

  {
    id: 'hubspot:contact.creation',
    provider: 'hubspot',
    providerLabel: 'HubSpot',
    event: 'contact.creation',
    description: 'A new HubSpot contact was created.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'HubSpot Webhooks 1.0', 'X-HubSpot-Signature-V3': '0aa…' },
    payload: [{ eventId: 1, subscriptionId: 25, portalId: 33, occurredAt: Date.now(), subscriptionType: 'contact.creation', objectId: 1234, propertyName: 'lifecyclestage', propertyValue: 'lead' }],
  },

  {
    id: 'sendgrid:bounce',
    provider: 'sendgrid',
    providerLabel: 'SendGrid',
    event: 'bounce',
    description: 'An email bounced.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'SendGrid Event API', 'X-Twilio-Email-Event-Webhook-Signature': '…' },
    payload: [{ email: 'invalid@example.com', timestamp: epochSec(), event: 'bounce', reason: '550 5.1.1 The email account that you tried to reach does not exist.', sg_event_id: 'sg_evt_abc123', sg_message_id: 'msg.1234' }],
  },

  {
    id: 'intercom:conversation.user.replied',
    provider: 'intercom',
    providerLabel: 'Intercom',
    event: 'conversation.user.replied',
    description: 'A user replied in an Intercom conversation.',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Intercom-Webhook/1.0', 'X-Hub-Signature': 'sha1=…' },
    payload: {
      type: 'notification_event',
      app_id: 'abcd1234',
      data: { item: { type: 'conversation', id: '12345', conversation_message: { body: '<p>Thanks!</p>' }, user: { type: 'user', id: 'u_678', email: 'jane@example.com' } } },
      topic: 'conversation.user.replied',
      delivery_attempts: 1,
    },
  },
]

export function samplesByProvider(): Array<{ provider: ProviderId; label: string; samples: ProviderSample[] }> {
  const groups = new Map<ProviderId, ProviderSample[]>()
  for (const s of PROVIDER_SAMPLES) {
    if (!groups.has(s.provider)) groups.set(s.provider, [])
    groups.get(s.provider)!.push(s)
  }
  return Array.from(groups.entries())
    .map(([provider, samples]) => ({ provider, label: PROVIDER_LABELS[provider], samples }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export type BehaviorName =
  | 'success'
  | 'server-error'
  | 'timeout'
  | 'slow'
  | 'client-error'
  | 'unauthorized'
  | 'not-found'
  | 'rate-limited'
  | 'redirect'
  | 'large-response'
  | 'large-body'
  | 'empty-response'
  | 'non-json-response'
  | 'custom'

export type RespondCtx = {
  requestBody: unknown
  delayMs: number
  statusCodeOverride: number
}

export type ResponseResult =
  | { kind: 'json'; status: number; body: unknown }
  | { kind: 'text'; status: number; body: string; contentType: string }
  | { kind: 'redirect'; status: 301 | 302 | 307 | 308; to: string }
  | { kind: 'empty'; status: number }

export type ResponseSpec = {
  delayMs: number
  result: ResponseResult
}

export interface Behavior {
  name: BehaviorName
  defaultStatusCode: number
  respond(ctx: RespondCtx): ResponseSpec
}

/** API 오류 계약 초안. 내부 오류·SQL·스택은 노출하지 않는다. */
export type ErrorCode =
  | 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'SLOT_CONFLICT' | 'SLOT_UNAVAILABLE' | 'VERSION_CONFLICT'
  | 'IDEMPOTENCY_MISMATCH' | 'REQUEST_EXPIRED' | 'RATE_LIMITED' | 'RETRY_LATER';

export interface ApiError {
  error: { code: ErrorCode; message: string; requestId: string };
}

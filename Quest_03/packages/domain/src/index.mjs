export class AppError extends Error {
  constructor(status, code, message) { super(message); Object.assign(this, { status, code }); }
}
export function requireValue(ok, message, status = 400, code = 'VALIDATION_ERROR') {
  if (!ok) throw new AppError(status, code, message);
}
export function title(value, max = 160) {
  requireValue(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, `1~${max}자의 내용을 입력하세요.`);
  return value.trim();
}
export function interval(start, end) {
  const a = Date.parse(start), b = Date.parse(end);
  requireValue(typeof start === 'string' && typeof end === 'string' && start.endsWith('Z') && end.endsWith('Z') && Number.isFinite(a) && Number.isFinite(b) && a < b, '시작·종료 시간을 확인하세요.');
  return [a, b];
}
export const overlaps = (a, b) => a.start < b.end && b.start < a.end;

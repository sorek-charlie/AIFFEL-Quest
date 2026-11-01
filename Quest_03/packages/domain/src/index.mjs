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
export function settings(input) {
  const phone = title(input.senderPhone, 20);
  requireValue(/^01[016789]-\d{3,4}-\d{4}$/.test(phone), '발신 번호 형식을 확인하세요.');
  const { startHour, endHour, duration, buffer, weekdays } = input;
  requireValue([startHour,endHour,duration,buffer].every(Number.isInteger) && startHour >= 0 && endHour <= 24 && startHour < endHour && duration >= 15 && duration <= 180 && buffer >= 0 && buffer <= 60, '공개 시간 설정을 확인하세요.');
  requireValue(Array.isArray(weekdays) && weekdays.every(d => Number.isInteger(d) && d >= 0 && d <= 6), '요일을 확인하세요.');
  requireValue(typeof input.enabled === 'boolean', '공개 여부를 확인하세요.');
  return {displayName:title(input.displayName,60),senderPhone:phone,enabled:input.enabled,startHour,endHour,duration,buffer,weekdays:[...new Set(weekdays)],timeZone:'Asia/Seoul'};
}
export function slots(config, events, date, now, requestedDuration=config.duration) {
  requireValue(Number.isInteger(requestedDuration)&&requestedDuration>=30&&requestedDuration<=180&&requestedDuration%30===0,'미팅 길이는 30~180분, 30분 단위로 선택하세요.');
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(date), '날짜를 확인하세요.');
  const midnight = Date.parse(`${date}T00:00:00+09:00`);
  requireValue(Number.isFinite(midnight) && new Date(midnight+9*3600000).toISOString().slice(0,10) === date, '날짜를 확인하세요.');
  const result = [];
  if (!config.enabled || !config.weekdays.includes(new Date(midnight+9*3600000).getUTCDay())) return result;
  for(let min=config.startHour*60+config.buffer; min+requestedDuration+config.buffer<=config.endHour*60; min+=30) {
    const start=midnight+min*60000, end=start+requestedDuration*60000;
    if(start < now+2*3600000 || start > now+30*86400000) continue;
    if(events.some(e=>overlaps({start:start-config.buffer*60000,end:end+config.buffer*60000},e))) continue;
    result.push({startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),timeZone:'Asia/Seoul'});
  }
  return result;
}

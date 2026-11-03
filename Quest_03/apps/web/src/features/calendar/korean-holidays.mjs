// Verified 2026-11-03 against KASA/KASI published calendar data.
export const holidayYears=[2026,2027];
const fixed={'01-01':'신정','03-01':'삼일절','05-01':'노동절','05-05':'어린이날','06-06':'현충일','07-17':'제헌절','08-15':'광복절','10-03':'개천절','10-09':'한글날','12-25':'성탄절'};
const special={
 2026:{'02-16':'설날 연휴','02-17':'설날','02-18':'설날 연휴','03-02':'삼일절 대체공휴일','05-24':'부처님오신날','05-25':'부처님오신날 대체공휴일','06-03':'전국동시지방선거','08-17':'광복절 대체공휴일','09-24':'추석 연휴','09-25':'추석','09-26':'추석 연휴','10-05':'개천절 대체공휴일'},
 2027:{'02-06':'설날 연휴','02-07':'설날','02-08':'설날 연휴','02-09':'설날 대체공휴일','05-03':'노동절 대체공휴일','05-13':'부처님오신날','07-19':'제헌절 대체공휴일','08-16':'광복절 대체공휴일','09-14':'추석 연휴','09-15':'추석','09-16':'추석 연휴','10-04':'개천절 대체공휴일','10-11':'한글날 대체공휴일','12-27':'성탄절 대체공휴일'}
};
export function dayInfo(date){const year=Number(date.slice(0,4)),known=holidayYears.includes(year),holiday=known?(special[year]?.[date.slice(5)]||fixed[date.slice(5)]||''):'',weekday=new Date(date+'T12:00:00Z').getUTCDay();return {holiday,known,weekday,color:holiday||weekday===0?'holiday-red':weekday===6?'saturday-blue':''};}

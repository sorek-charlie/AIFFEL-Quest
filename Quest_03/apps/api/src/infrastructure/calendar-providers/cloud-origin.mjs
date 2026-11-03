export const CLOUD_ORIGIN='https://charlie-schedule.cherrysocute9.chatgpt.site';
const LEGACY_ORIGIN='https://orbit-appointments-quest03.cherrysocute9.chatgpt.site';
export function cloudOrigin(value){
 if(value===CLOUD_ORIGIN||value===LEGACY_ORIGIN)return CLOUD_ORIGIN;
 throw new Error('허용된 개인 화면 서버 주소가 아닙니다.');
}

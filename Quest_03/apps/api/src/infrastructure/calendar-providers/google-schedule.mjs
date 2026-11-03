export const googleSyncTimes=['08:00','12:00','18:00','24:00'];
export function nextGoogleSync(now){const local=new Date(now+9*3600000),midnight=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-9*3600000;for(const hour of [0,8,12,18,24]){const at=midnight+hour*3600000;if(at>=now){const key=new Date(at+9*3600000).toISOString().slice(0,13)+':00';return {at,key};}}}

export function latestGoogleSync(now){const local=new Date(now+9*3600000),midnight=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-9*3600000;const hour=[18,12,8,0].find(h=>midnight+h*3600000<=now);const at=midnight+hour*3600000;return {at,key:new Date(at+9*3600000).toISOString().slice(0,13)+':00'};}

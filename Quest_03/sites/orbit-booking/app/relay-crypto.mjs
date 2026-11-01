// Web Crypto format shared with the hosted relay; only ciphertext is persisted in D1.
const enc=new TextEncoder(),dec=new TextDecoder();
async function key(secret){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode('orbit-owner-relay-v1:'+secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
const b64=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function seal(secret,id,value){const iv=crypto.getRandomValues(new Uint8Array(12)),data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(id)},await key(secret),enc.encode(JSON.stringify(value)));return {iv:b64(iv),data:b64(new Uint8Array(data))};}
export async function open(secret,id,value){return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(value.iv),additionalData:enc.encode(id)},await key(secret),bytes(value.data))));}

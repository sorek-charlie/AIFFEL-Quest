import {viewerHandle} from './viewer-api.mjs';
import {ownerRelay} from './owner-relay.ts';
export async function handle(request:Request,env:any){return await viewerHandle(request,env)||await ownerRelay(request,env)||Response.json({error:{code:'NOT_FOUND',message:'찾을 수 없습니다.'}},{status:404});}

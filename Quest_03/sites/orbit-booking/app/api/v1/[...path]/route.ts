import {env} from 'cloudflare:workers';
import {handle} from '../../../cloud-api';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>handle(request,env);
export const POST=(request:Request)=>handle(request,env);
export const PUT=POST;
export const PATCH=POST;
export const DELETE=POST;

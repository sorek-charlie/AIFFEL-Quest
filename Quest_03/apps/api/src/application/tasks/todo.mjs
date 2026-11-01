import {title,requireValue} from '../../../../../packages/domain/src/index.mjs';
export function createTodoService(port){return {
 list:()=>port.list(),
 create:b=>{requireValue(b.completed===undefined||typeof b.completed==='boolean','완료 상태를 확인하세요.');return port.create({title:title(b.title),completed:b.completed??false});},
 update:(id,b)=>{requireValue(Number.isInteger(b.expectedVersion)&&b.expectedVersion>0,'버전을 확인하세요.');requireValue(typeof b.completed==='boolean','완료 상태를 확인하세요.');return port.update(id,{title:title(b.title),completed:b.completed,expectedVersion:b.expectedVersion});},
 remove:(id,b)=>{requireValue(Number.isInteger(b.expectedVersion)&&b.expectedVersion>0,'버전을 확인하세요.');return port.remove(id,b);}
};}

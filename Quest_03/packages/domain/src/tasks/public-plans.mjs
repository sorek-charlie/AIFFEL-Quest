// Public DTO allowlist. Never serialize database rows, sourceEmail or configuration.
export function publicPlans(state,updatedAt){
 const text=value=>typeof value==='string'?value:'';
 const common=item=>({id:text(item.id),title:text(item.title),projectId:text(item.projectId)||null,details:text(item.details),location:text(item.location),participants:text(item.participants)});
 return {mode:'read-only',live:true,updatedAt:text(updatedAt),events:(state.events||[]).map(item=>({...common(item),startsAt:text(item.startsAt),endsAt:text(item.endsAt)})),tasks:(state.tasks||[]).map(item=>({...common(item),dueDate:text(item.dueDate)||null,completed:item.completed===true})),projects:(state.projects||[]).map(item=>({id:text(item.id),title:text(item.title),startsOn:text(item.startsOn),endsOn:text(item.endsOn),status:text(item.status),progress:Number.isInteger(item.progress)?item.progress:null,notes:text(item.notes),details:text(item.details),location:text(item.location),participants:text(item.participants)}))};
}

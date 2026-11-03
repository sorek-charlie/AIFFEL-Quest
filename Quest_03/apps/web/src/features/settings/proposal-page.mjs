export function proposalPage(rows,requested=1){
 const size=20,pages=Math.max(1,Math.ceil(rows.length/size));
 const page=Math.min(pages,Math.max(1,Math.floor(Number(requested)||1)));
 return {page,pages,total:rows.length,rows:rows.slice((page-1)*size,page*size)};
}

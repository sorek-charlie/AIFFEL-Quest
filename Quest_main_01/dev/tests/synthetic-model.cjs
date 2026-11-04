/* Entirely invented numeric fixtures. Never copy a customer's ledger here. */
module.exports=()=>{
 const years=[2020,2021,2022,2023,2024,2025],totals=[2,2,4,4,3,5],youth=[1,1,2,2,1,3];
 const annual=Object.fromEntries(years.map((year,i)=>[year,{total:totals[i],youth:youth[i]}]));
 const taxes=Object.fromEntries(years.slice(1).map(year=>[year,{year,companyId:'0000000000',base:100000000,calculated:9000000,applied:0,burden:9000000,minimum:7000000,source:'synthetic-return.pdf',page:1,existingEmploymentApplied:0,existingEmploymentGenerated:0}]));
 return {company:'테스트 법인',companyId:'0000000000',employment:{records:5,annual,integrated:structuredClone(annual)},taxes};
};

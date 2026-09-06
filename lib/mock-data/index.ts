export type Confidence = 'Verified'|'Configured'|'Estimated';
export type Node = { id:string; name:string; type:string; confidence:Confidence; risk:number; x:number; y:number; cves:string[] };
export const nodes:Node[]=[
 {id:'pay',name:'Payment Gateway Server',type:'Critical asset',confidence:'Verified',risk:8200000,x:49,y:39,cves:['CVE-2024-21410']},
 {id:'core',name:'Core Banking DB',type:'Data store',confidence:'Verified',risk:7600000,x:70,y:53,cves:['CVE-2023-34362']},
 {id:'sso',name:'Employee SSO Provider',type:'Identity',confidence:'Configured',risk:6500000,x:25,y:35,cves:['CVE-2024-49112']},
 {id:'api',name:'Customer API Gateway',type:'Internet-facing',confidence:'Configured',risk:5400000,x:35,y:62,cves:['CVE-2024-6387']},
 {id:'vendor',name:'Collections Vendor VPN',type:'Third party',confidence:'Estimated',risk:4100000,x:76,y:25,cves:['CVE-2023-4966']},
 {id:'backup',name:'Immutable Backup Vault',type:'Resilience',confidence:'Verified',risk:1900000,x:84,y:72,cves:[]},
 {id:'staff',name:'Branch Workforce',type:'User group',confidence:'Estimated',risk:3200000,x:15,y:68,cves:[]},
 {id:'siem',name:'SOC / SIEM Cluster',type:'Detection',confidence:'Configured',risk:1200000,x:57,y:76,cves:[]},
 {id:'mobile',name:'Mobile Banking App',type:'Application',confidence:'Estimated',risk:2800000,x:20,y:18,cves:['CVE-2024-3094']},
 {id:'admin',name:'Privileged Admin Console',type:'Identity',confidence:'Verified',risk:3700000,x:47,y:18,cves:[]},
];
export const eal=42800000;
export type Scenario={factor:number;verified:number;configured:number;estimated:number;criticalPaths:number;refreshDays:number;trendShift:number};
export const scenarios:Record<string,Scenario>={
 'Asteria Finance':{factor:1,verified:62,configured:25,estimated:13,criticalPaths:7,refreshDays:3,trendShift:0},
 'Northstar Microcredit':{factor:.58,verified:34,configured:28,estimated:38,criticalPaths:11,refreshDays:9,trendShift:6},
 'Pragati Bank':{factor:1.18,verified:76,configured:17,estimated:7,criticalPaths:4,refreshDays:2,trendShift:-3},
};
export const getScenario=(org:string)=>scenarios[org]||scenarios['Asteria Finance'];
export const controls=[
 {name:'Enforce MFA on privileged accounts',category:'Identity',impact:6200000,cost:1800000,on:true},
 {name:'Segment payment processing network',category:'Network',impact:5400000,cost:2600000,on:false},
 {name:'EDR on branch endpoints',category:'Endpoint',impact:3100000,cost:1200000,on:false},
 {name:'Encrypt customer data at rest',category:'Data',impact:2700000,cost:900000,on:true},
 {name:'Privileged access just-in-time',category:'Identity',impact:4200000,cost:1500000,on:false},
 {name:'24×7 managed detection response',category:'Endpoint',impact:3600000,cost:2200000,on:false},
];
export const trend=[{month:'Oct',eal:51.2},{month:'Nov',eal:49.8},{month:'Dec',eal:48.4},{month:'Jan',eal:46.1},{month:'Feb',eal:44.8},{month:'Mar',eal:45.3},{month:'Apr',eal:42.8},{month:'May',eal:41.9}];
export const trendFor=(org:string)=>{const s=getScenario(org);return trend.map((point,i)=>({month:point.month,eal:Number((point.eal*s.factor+s.trendShift+(i===trend.length-1?s.trendShift*-1:0)).toFixed(1))}))};
export const frameworks=['ISO 27001','NIST CSF','CIS Controls','RBI 2026','SEBI CSCRF'];
export const compliance=controls.map((c,i)=>({control:c.name,values:frameworks.map((_,j)=>(i+j)%3!==1)}));
export const formatCr=(n:number)=>`₹${(n/10000000).toFixed(2)} Cr`;

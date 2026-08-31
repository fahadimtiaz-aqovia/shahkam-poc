const D = {
  orderFocus:{id:'SO-10482',customer:'Global Fashion Co.',style:'SH-2026-084',quantity:25000,value:185000,orderDate:'26 Aug 2026',required:'18 Sep 2026',predicted:'21 Sep 2026',status:'In production',material:'Partial — 18,500 / 25,000',line:'L-07 / L-03',capacity:94,probability:61,risk:'HIGH'},
  lines:[['L-01',92,89,88,7,'Low'],['L-02',87,84,86,11,'Medium'],['L-03',79,82,76,6,'Low'],['L-04',89,83,91,19,'High'],['L-05',90,88,87,9,'Low'],['L-06',85,80,89,14,'Medium'],['L-07',94,79,96,42,'High'],['L-08',82,80,81,8,'Low'],['L-09',88,86,84,11,'Medium'],['L-10',91,89,90,6,'Low']].map((x,i)=>({id:x[0],target:x[1]*1000,actual:x[2]*1000,util:x[3],downtime:x[4],risk:x[5],backlog:x[0]==='L-07'?82000:Math.round(25000+x[1]*310),delay:x[0]==='L-07'?14:Math.max(0,Math.round((x[3]-88)/2)),eff:Math.round(x[2]/x[1]*100),smv:+(14+(i%5)*1.8).toFixed(1),operators:38+(i%6)*4,dhu:x[0]==='L-07'?7.4:+(2.2+(i%5)*0.9).toFixed(1),hourlyTarget:Math.round(x[1]*1000/48),hourlyActual:Math.round(x[2]*1000/48)})),
  customers:['Global Fashion Co.','Textile House','Northstar Apparel','Meridian Retail','Eclipse Brands','Atlas Uniforms','Velvet & Co.','Westbridge'],
  products:['SH-2026-084','DT-2219','LN-4610','UR-8214','PR-9012','FT-1412'],
  suppliers:['Supplier A','CottonWorks Ltd','Pak Fibres','Threadline','Prime Dyes','Union Textile'],
  materials:['Cotton','Polyester Yarn','Dye Indigo','Zippers','Labels','Elastic'],
  capacity:[86,87,89,91,93,96,94,92,90,89,88,87,89,91,93,95,94,91,88,86,84,85,87,89,90,88,86,84,83,85]
};
D.orders=Array.from({length:40},(_,i)=>{let high=i<11, id=i===0?'SO-10482':`SO-${10482+i}`, value=i===0?185000:Math.round(55000+(i*12750)%145000), prob=i===0?61:high?66+(i*3)%9:76+(i*5)%20; return {id,customer:i===0?D.orderFocus.customer:D.customers[i%D.customers.length],style:i===0?D.orderFocus.style:D.products[i%D.products.length],quantity:i===0?25000:5000+(i*1250)%27000,value,orderDate:`${String(1+(i*3)%27).padStart(2,'0')} Aug 2026`,required:i===0?'18 Sep 2026':`${10+(i%19)} Sep 2026`,predicted:i===0?'21 Sep 2026':`${10+(i%19)+(prob<75?3:0)} Sep 2026`,line:i===0?'L-07 / L-03':`L-${String((i%10)+1).padStart(2,'0')}`,probability:prob,risk:prob<75?'HIGH':prob<84?'MEDIUM':'LOW',material:prob<75?'Partial':'Ready',status:prob<75?'At risk':'In production',stageIdx:i===0?3:[6,6,5,5,4,4,3,3,2,1,0,2,4,5,6,3,2,1,0,6][i%20]}});
D.stages=['Received','Materials','Cutting','Sewing','Finishing','Packing','Dispatched'];
D.procurement=Array.from({length:110},(_,i)=>{let anomaly=i===0?87:Math.max(8,Math.round((i*29)%84));let price=i===0?3.85:+(2.6+(i%6)*.32).toFixed(2), expected=i===0?3.20:+(price*(.92+(i%5)*.02)).toFixed(2);return{po:i===0?'PO-48291':`PO-${48291+i}`,supplier:i===0?'Supplier A':D.suppliers[i%D.suppliers.length],material:i===0?'Cotton':D.materials[i%D.materials.length],quantity:i===0?50000:5000+(i%9)*5000,price,expected,variance:+((price/expected-1)*100).toFixed(1),anomaly,status:anomaly>75?'HIGH':anomaly>50?'REVIEW':'NORMAL'}});
D.daily={delivery:[93.2,92.7,92.3,92.5,92.1,91.9,91.6,91.4,90.8,90.1,89.8,89.1,88.6,88.2,87.8],throughput:[98,97,96,97,95,95,94,94,93,92,91,90,89,88,87],backlog:[70,72,71,74,76,78,82,85,89,93,97,101,105,108,110],risk:[.8,.9,1,1.05,1.1,1.2,1.42,1.48,1.55,1.62,1.7,1.78,1.86,1.94,2.04]};
D.deliveryLedger=Array.from({length:34},(_,i)=>{let order=D.orders[(i+12)%D.orders.length],day=1+(i*5)%28,rate=.84+(i%6)*.025,units=Math.round(order.quantity*(.42+(i%4)*.13)),revenue=Math.round(order.value*(units/order.quantity)),collected=Math.round(revenue*rate);return{date:`2026-08-${String(day).padStart(2,'0')}`,orderId:order.id,customer:order.customer,units,revenue,collected}}).sort((a,b)=>a.date.localeCompare(b.date));
// Garment-specific context for the flagship order (style + colour + size curve).
D.orderFocus.sizeCurve=[['S',15,'Ready'],['M',35,'Ready'],['L',30,'Short'],['XL',20,'Short']];
D.orderFocus.colours=['Navy','White'];
D.orderFocus.materialLead={source:'Imported fabric (LC #IMP-2291)',eta:'12 Sep 2026',note:'Fabric for L/XL cut delayed at customs clearance'};
// Garment critical path (order → export), status per stage.
D.critPath=[
  ['Sampling','Barcode','Approved','done'],
  ['Cutting / Fabrication','Barcode','18,500 / 25,000 bundles cut','warn'],
  ['Sewing','JACK (machine-level)','L-07 behind schedule · 79% eff','warn'],
  ['Finishing','Barcode','Not started','wait'],
  ['Packing','RFID','Not started','wait'],
  ['Warehouse / Export','RFID','Committed 18 Sep','wait']
];
/* Currency: illustrative figures are held in USD and rendered in PKR at a
   fixed illustrative rate so magnitudes read realistically for Shahkam. */
const FX_PKR=280;
function money(n){const v=Math.abs(n)*FX_PKR,s=n<0?'-':'';return 'PKR '+s+(v>=1e9?(v/1e9).toFixed(2)+'B':v>=1e6?(v/1e6).toFixed(v>=1e8?0:1)+'M':v>=1e3?Math.round(v/1e3)+'K':Math.round(v).toLocaleString())}
function pkr(n){return 'PKR '+Math.round(n*FX_PKR).toLocaleString()}
function riskClass(r){return r==='HIGH'?'risk-high':r==='MEDIUM'?'risk-med':'risk-low'}

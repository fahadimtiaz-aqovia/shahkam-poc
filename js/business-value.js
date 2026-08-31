/* ============================================================================
   Business Value / ROI — CTO-level economics. Every figure is derived from an
   explicit, adjustable benefit model (no hardcoded ROI). Includes payback,
   3-year NPV, a profit-bridge waterfall, value-realisation timeline and
   sensitivity. All illustrative until baselined on Shahkam data in the PoV.
   ========================================================================== */

const BV_FACTORS = {
  lateReduction: 0.30, lossOnLate: 0.20, opsCostPct: 0.015, opsImprove: 0.35,
  anomalyRate: 0.02, anomalyCatch: 0.50, grossMargin: 0.22, utilGain: 0.03,
  productivityPool: 2.5, productivityCut: 0.32, netMargin: 0.08, discount: 0.12
};

function computeROI(inp){
  const F = BV_FACTORS;
  const A = inp.revenue, L = inp.lateRate/100, proc = inp.procSpend, C = inp.cost;
  const revProt   = A * L * F.lateReduction * F.lossOnLate;
  const costAvoid = A * F.opsCostPct * F.opsImprove;
  const procSav   = proc * F.anomalyRate * F.anomalyCatch;
  const capGain   = A * F.grossMargin * F.utilGain;
  const product   = F.productivityPool * F.productivityCut;
  const benefits = { 'Revenue protection':revProt, 'Cost avoidance':costAvoid, 'Procurement savings':procSav, 'Capacity / throughput':capGain, 'Management productivity':product };
  const B = revProt + costAvoid + procSav + capGain + product;
  const net = B - C;
  const roi = C>0 ? net / C : 0;
  const payback = B>0 ? C / (B/12) : 99;
  const npv = net * (0.6/1.12 + 1/1.2544 + 1.05/1.404928);
  const curProfit = A * F.netMargin;
  const newProfit = curProfit + net;
  return { A, L, proc, C, benefits, B, net, roi, payback, npv, curProfit, newProfit,
           profitUplift: curProfit>0 ? net/curProfit : 0 };
}

/* Inputs are held in USD millions; rendered in PKR at the illustrative FX rate. */
function fmtM(v){ const m=v*FX_PKR, s=v<0?'-':'', a=Math.abs(m); return 'PKR '+s+(a>=1000?(a/1000).toFixed(2)+'B':a.toFixed(a<10?2:0)+'M'); }

function renderWaterfall(r){
  const steps = [
    { label:'Current profit', val:r.curProfit, type:'total' },
    ...Object.entries(r.benefits).map(([k,v])=>({label:k, val:v, type:'pos'})),
    { label:'Solution cost', val:-r.C, type:'neg' },
    { label:'New profit', val:r.newProfit, type:'total' }
  ];
  let level = 0, maxL = 0;
  const laid = steps.map(s=>{
    if(s.type==='total'){ const o={bottom:0, height:s.val, ...s}; maxL=Math.max(maxL,s.val); return o; }
    const start = level; level += s.val; maxL=Math.max(maxL, level, start);
    return { bottom: Math.min(start,level), height: Math.abs(s.val), ...s };
  });
  const H = 180, scale = H / (maxL*1.1 || 1);
  return `<div class="waterfall">${laid.map(s=>`<div class="wf-col"><div class="wf-val" style="color:${s.type==='neg'?'#b45':'#134f4c'}">${s.val>=0?'':'−'}${fmtM(Math.abs(s.val)).replace('$','$')}</div><div style="height:${H}px;display:flex;flex-direction:column;justify-content:flex-end;width:100%"><div class="wf-bar ${s.type}" style="height:${Math.max(3,s.height*scale)}px;margin-bottom:${s.bottom*scale}px"></div></div><div class="wf-lbl">${s.label}</div></div>`).join('')}</div>`;
}

let bvTimeline;
function businessValuePage(){
  app.innerHTML = head('Business Value & ROI','From AI spend to profit — an explicit, adjustable benefit model with payback, NPV and profit visibility','Executive economics')
  + `<div class="grid-2"><div><div id="bvKpis" class="kpi-grid" style="grid-template-columns:repeat(2,1fr)"></div></div>
     <div class="card panel"><div class="panel-head"><div><h3>Model assumptions</h3><p>Adjust to Shahkam’s numbers — every output recomputes live.</p></div><span class="badge sim">Illustrative</span></div>
       <div class="control"><label>Annual order value <b id="bvA">PKR 70B</b></label><input type="range" id="bvRev" min="50" max="500" step="10" value="250"></div>
       <div class="control"><label>Current late-order rate <b id="bvL">8%</b></label><input type="range" id="bvLate" min="2" max="20" value="8"></div>
       <div class="control"><label>Annual procurement spend <b id="bvP">PKR 16.8B</b></label><input type="range" id="bvProc" min="10" max="150" step="5" value="60"></div>
       <div class="control"><label>Annual solution cost <b id="bvC">PKR 336M</b></label><input type="range" id="bvCost" min="0.4" max="4" step="0.1" value="1.2"></div>
       <div class="formula" id="bvFormula" style="font-size:10.5px"></div>
     </div></div>
     <div class="grid-2"><div class="card panel"><div class="panel-head"><div><h3>Profit bridge</h3><p>How AI converts operational improvements into profit.</p></div></div><div id="bvWaterfall"></div></div>
       <div class="card panel"><h3>Benefit breakdown</h3><div id="bvBenefits"></div></div></div>
     <div class="grid-2"><div class="card panel"><h3>Value realisation timeline</h3><p>Benefits ramp as capabilities go live; cost is broadly flat. Payback shown where cumulative benefit overtakes cost.</p><div class="chart-wrap" style="height:200px"><canvas id="bvTimelineC"></canvas></div></div>
       <div class="card panel"><h3>Sensitivity</h3><p>ROI under conservative, base and optimistic benefit realisation.</p><div id="bvSensitivity"></div>
         <p class="notice" style="margin-top:10px">All values illustrative. Net ROI = (annual benefits − annual cost) / annual cost. Baselined on Shahkam’s data during the Proof of Value.</p></div></div>`;
  bindCommon();
  const upd=()=>{
    const inp={ revenue:+document.getElementById('bvRev').value, lateRate:+document.getElementById('bvLate').value, procSpend:+document.getElementById('bvProc').value, cost:+document.getElementById('bvCost').value };
    document.getElementById('bvA').textContent=fmtM(inp.revenue); document.getElementById('bvL').textContent=inp.lateRate+'%';
    document.getElementById('bvP').textContent=fmtM(inp.procSpend); document.getElementById('bvC').textContent=fmtM(inp.cost);
    const r=computeROI(inp);
    document.getElementById('bvKpis').innerHTML =
      kpiPlain('Net annual benefit', fmtM(r.net), 'After solution cost','up')
    + kpiPlain('Net ROI', Math.round(r.roi*100)+'%', 'Return on annual cost','up')
    + kpiPlain('Payback period', r.payback.toFixed(1)+' mo', 'Cumulative benefit &gt; cost','up')
    + kpiPlain('3-year NPV', fmtM(r.npv), `@ ${Math.round(BV_FACTORS.discount*100)}% discount`,'up')
    + kpiPlain('Annual profit uplift', '+'+Math.round(r.profitUplift*100)+'%', `${fmtM(r.curProfit)} → ${fmtM(r.newProfit)}`,'up')
    + kpiPlain('Gross annual benefit', fmtM(r.B), 'Before solution cost','up');
    document.getElementById('bvWaterfall').innerHTML = renderWaterfall(r);
    const maxb = Math.max(...Object.values(r.benefits));
    document.getElementById('bvBenefits').innerHTML = Object.entries(r.benefits).map(([k,v])=>`<div class="driver-row"><span>${k} <b>${fmtM(v)}</b></span><div class="bar"><i style="width:${v/maxb*100}%"></i></div></div>`).join('') + `<div class="interpret">Total gross benefit <b>${fmtM(r.B)}</b> across five value streams — no single dependency.</div>`;
    document.getElementById('bvFormula').innerHTML = `net_benefit = Σ(revenue_protection + cost_avoidance + procurement + capacity + productivity) − cost<br>= ${fmtM(r.B)} − ${fmtM(r.C)} = <b>${fmtM(r.net)}</b> &nbsp;·&nbsp; ROI = ${fmtM(r.net)} / ${fmtM(r.C)} = <b>${Math.round(r.roi*100)}%</b>`;
    const scen=[['Conservative',0.6,'risk-med'],['Base',1,'risk-low'],['Optimistic',1.3,'risk-low']];
    document.getElementById('bvSensitivity').innerHTML = scen.map(s=>{const net=r.B*s[1]-r.C, roi=r.C>0?net/r.C:0; return `<div class="statline"><span>${s[0]} <span class="chip ${s[2]}">${(s[1]*100).toFixed(0)}% of benefits</span></span><b>${Math.round(roi*100)}% ROI · ${fmtM(net)}</b></div>`;}).join('');
    if(window.Chart){ bvTimeline?.destroy(); const c=document.getElementById('bvTimelineC');
      const ramp=[0,0.1,0.25,0.45,0.7,0.9,1,1.05]; let cum=0; const benCum=ramp.map(x=>{cum+= r.B/4*x; return +cum.toFixed(2);}); const costCum=ramp.map((_,i)=>+(r.C/4*(i+1)).toFixed(2));
      bvTimeline=new Chart(c,{type:'line',data:{labels:['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8'],datasets:[{label:'Cumulative benefit',data:benCum,borderColor:'#0f766e',backgroundColor:'#0f766e18',fill:true,tension:.3,borderWidth:2.5},{label:'Cumulative cost',data:costCum,borderColor:'#c9736f',borderDash:[5,4],pointRadius:0,borderWidth:2}]},options:barOpts('','',true)}); }
  };
  ['bvRev','bvLate','bvProc','bvCost'].forEach(id=>document.getElementById(id).oninput=upd);
  upd();
}

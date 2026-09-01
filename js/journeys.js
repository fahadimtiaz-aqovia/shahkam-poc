/* ============================================================================
   Business-module journeys — the 5 modules the business actually uses. Each is
   a guided flow (journey stepper), rich in graphs and live AI, composed from
   the existing engine + pages. Platform capabilities sit underneath.
   ========================================================================== */

function riskColor(r){ return r==='HIGH'?'#bd5353':r==='MEDIUM'?'#c07a1e':'#287453'; }

/* Doughnut gauge with a centred number. */
function gaugeWrap(id,pct,label){ return `<div class="gauge-wrap"><canvas id="${id}"></canvas><div class="gauge-c"><b>${pct}%</b><small>${label||''}</small></div></div>`; }
function drawGauge(id,pct,color){ if(!window.Chart)return; const cv=document.getElementById(id); if(!cv)return; Chart.getChart(cv)?.destroy();
  new Chart(cv,{type:'doughnut',data:{datasets:[{data:[pct,100-pct],backgroundColor:[color,'#eef2f2'],borderWidth:0}]},options:{cutout:'74%',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}}}}); }

/* Journey stepper. */
function journeySteps(steps,active){ return `<div class="journey">${steps.map((s,i)=>`<div class="jstep ${i<active?'done':i===active?'now':''}"><span class="js-n">${i<active?'✓':i+1}</span><b>${s}</b></div>${i<steps.length-1?'<span class="js-arr">→</span>':''}`).join('')}</div>`; }
function insertJourney(steps,active){ const ph=app.querySelector('.page-head'); if(ph) ph.insertAdjacentHTML('afterend', journeySteps(steps,active)); }

/* Order-tracking board — every order by its live stage. */
function trackingBoard(){
  return `<div class="track-board">${D.stages.map((s,si)=>{
    const all=D.orders.filter(o=>o.stageIdx===si);
    const shown=all.slice(0,5);
    return `<div class="track-col"><div class="track-h">${s}<span>${all.length}</span></div>${shown.map(o=>`<div class="track-card ${riskClass(o.risk)}" data-find="${o.id}" title="${o.customer} · ${o.probability}% on-time">${o.id}<small>${o.probability}%</small></div>`).join('')||'<div style="font-size:9.5px;color:#a9bab8">—</div>'}</div>`;
  }).join('')}</div>`;
}
function bindTracking(){
  document.getElementById('simOrder')?.addEventListener('click',()=>{
    const col=document.querySelector('.track-col');
    if(col){ const id='SO-'+(10522+Math.floor(Math.random()*70)); col.insertAdjacentHTML('beforeend',`<div class="track-card risk-med">${id}<small>new</small></div>`);
      const c=col.querySelector('.track-h span'); if(c)c.textContent=+c.textContent+1; }
    toast('New order '+ 'received — scored by the delivery model and tracked live.');
  });
  document.querySelectorAll('.track-card[data-find]').forEach(c=>c.onclick=()=>render('orders'));
}

/* ---------- 1 · ORDER DECISION — the flagship decision story ---------- */
function recoHTML(accepted){
  if(accepted) return `<div class="reco"><h3>✓ Recovery plan activated</h3><p style="font-size:12.5px;color:#33534f;margin:0 0 4px">The recommended plan is running: production reallocated to <b>L-03</b>, limited overtime approved, and the L/XL material expedited. On-time probability is now <b>91%</b>.</p><div class="button-row"><button class="primary" data-page="journey">Track Order →</button></div></div>`;
  return `<div class="reco" id="tour-recommendation"><h3>✦ Recommended Recovery Plan</h3>
    <ul><li>Shift 35% of the sewing load from L-07 to L-03</li><li>Add 2 hours of overtime for 3 days on L-03</li><li>Expedite the missing L/XL material replenishment</li></ul>
    <div class="reco-out"><div><div class="ro-l">Delivery probability</div><div class="ro-v"><span class="from">61%</span><span class="arr">→</span><span class="to">91%</span></div></div><div><div class="ro-l">Estimated added cost</div><div class="ro-v">${money(6200)}</div></div><div><div class="ro-l">Required date</div><div class="ro-v">Maintained</div></div></div>
    <div class="button-row"><button class="primary" id="tour-simulate" data-page="scenarios">Simulate Plan</button><button class="secondary" id="acceptFromOrder">Accept Order</button><button class="secondary" id="holdFromOrder">Hold for Review</button><button class="secondary" data-page="scenarios">Modify Scenario</button></div>
    <p style="font-size:11px;color:var(--muted);margin:10px 0 0">The AI recommends — a person decides. <b>Accept</b> commits with the plan, <b>Hold for Review</b> routes to Operations, or <b>Simulate</b> to test other options first.</p></div>`;
}
function feasibilityHTML(){
  return `<div class="card panel"><div class="panel-head"><div><h3>New-order feasibility</h3><p>Enter a prospective order; the delivery-risk model scores it live from engineered features.</p></div><span class="badge sim">Live model</span></div><div class="scenario-grid"><div class="control-panel" style="padding:2px"><div class="control"><label>Quantity <b id="fq">25,000</b></label><input type="range" id="feasQty" min="2000" max="60000" step="1000" value="25000"></div><div class="control"><label>Required in <b id="fd">23 days</b></label><input type="range" id="feasDays" min="7" max="60" value="23"></div><div class="control"><label>Material readiness <b id="fm">74%</b></label><input type="range" id="feasMat" min="30" max="100" value="74"></div><div class="control"><label>Similar-order on-time <b id="fh">71%</b></label><input type="range" id="feasHist" min="50" max="99" value="71"></div><div class="control"><label>Assigned line</label><select class="input" id="feasLine">${D.lines.map(l=>`<option ${l.id==='L-07'?'selected':''}>${l.id}</option>`).join('')}</select></div></div><div class="decision-hero" id="feasResult" style="margin:0;grid-template-columns:minmax(240px,1fr) minmax(240px,1.1fr)"></div></div></div>`;
}
/* Stepped, one-screen-per-stage flow. Each stage reuses existing components. */
let orderStage = 0;
const ORDER_STEPS = ['New order arrives','AI verdict','Why','Recommendation','Simulate','Commit','Track'];
function interactiveStepper(steps, active){
  return `<div class="journey stepper" id="stageNav">${steps.map((s,i)=>`<button class="jstep ${i<active?'done':i===active?'now':''}" data-stage="${i}"><span class="js-n">${i<active?'✓':i+1}</span><b>${s}</b></button>${i<steps.length-1?'<span class="js-arr">→</span>':''}`).join('')}</div>`;
}
function stageFooter(hasPrev, nextLabel, nextId){
  return `<div class="stage-footer">${hasPrev?'<button class="secondary" id="stagePrev">← Previous</button>':'<span></span>'}${nextLabel?`<button class="primary" id="${nextId||'stageNext'}">${nextLabel}</button>`:'<span></span>'}</div>`;
}
function goOrderStage(n){ orderStage=Math.max(0,Math.min(6,n)); document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='orders')); orderModule(); window.scrollTo({top:0,behavior:'smooth'}); }
function riskBarsHTML(){ const f=FLAGSHIP;
  return `<div class="panel-head"><div><h3>Risk drivers</h3><p>What is pulling the on-time probability down, ranked by contribution.</p></div><span class="src-chip">Delivery-risk model</span></div>`
   + f.drivers.slice(0,4).map(d=>`<div class="rank-bar"><div class="rb-top"><span>${d.label}</span><b>${d.pct}%</b></div><div class="track"><i class="${d.contribution<0?'warn':''}" style="width:${Math.min(100,Math.max(6,d.pct*2.6))}%"></i></div></div>`).join('');
}
function journeyBody(){
  const accepted=orderState.accepted;
  const stages=[['Received','done','26 Aug'],['Materials','done','ETA 12 Sep'],['Cutting','done','74% cut'],['Sewing','now','in progress'],['Finishing','wait',''],['Packing','wait',''],['Dispatched','wait','18 Sep']];
  return `<div class="card panel"><div class="panel-head"><div><h3>Production journey</h3><p>Received → Materials → Cutting → Sewing → Finishing → Packing → Dispatched</p></div><span class="src-chip jack">BARCODE · JACK · RFID</span></div>
      <div class="otrack" id="tour-order-tracking">${stages.map(s=>`<div class="ot-stage ${s[1]}"><div class="ot-dot">${s[1]==='done'?'✓':s[1]==='now'?'●':'○'}</div><b>${s[0]}</b><small>${s[2]}</small></div>`).join('')}</div>
      <div class="ot-detail"><div style="font:700 13px Manrope;display:flex;align-items:center;gap:8px;flex-wrap:wrap">Current stage · Sewing ${statusTag('MEDIUM','Slightly behind plan')}</div>
        <div class="odt-grid"><div><div class="l">Progress</div><div class="v">43%</div></div><div><div class="l">Planned</div><div class="v">48%</div></div><div><div class="l">Variance</div><div class="v" style="color:var(--red)">−5%</div></div><div><div class="l">Sewing lines</div><div class="v">L-07 / L-03</div></div><div><div class="l">Predicted completion</div><div class="v">${accepted?'17 Sep':'21 Sep'}</div></div><div><div class="l">Required</div><div class="v">18 Sep</div></div></div></div></div>
    <div class="card panel" id="tour-production-alert" style="margin-top:14px;border-left:4px solid var(--amber)"><div class="panel-head"><div><h3>🟠 Production alert — detected while tracking</h3><p>L-07 (part of this order's sewing split) is starting to slip — early warning, while there is still time to act.</p></div><span class="stag med">🟠 Needs Attention</span></div>
      <p style="font-size:12.5px;color:#3d4f54;line-height:1.55;margin:0 0 6px">L-07 is predicting a <b>~14h delay</b> from changeover and throughput decline. The AI recommends moving <b>800 units to L-03</b> to recover ~5h and protect the 18 Sep date.</p>
      <div class="button-row"><button class="primary" id="jrnL07">Review AI recommendation</button><button class="secondary" data-page="production">Open Production</button></div></div>
    <div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Shop-floor events</h3><p>Automatic status updates from Barcode, JACK and RFID into Oracle.</p></div></div>${critPathHTML()}</div>`;
}
function commitRecordedHTML(){
  const ts=new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return `<div class="grid-2"><div class="reco"><h3 id="tour-decision-recorded">✓ Decision Recorded</h3><p style="font-size:12.5px;color:#33534f;line-height:1.6;margin:0 0 10px">SO-10482 has been <b>accepted</b> for production with the recovery plan activated. The AI advised; you decided.</p>
    <div class="reco-out"><div><div class="ro-l">Expected on-time</div><div class="ro-v"><span class="to">91%</span></div></div><div><div class="ro-l">Recovery plan</div><div class="ro-v" style="font-size:14px">Activated</div></div><div><div class="ro-l">Required date</div><div class="ro-v" style="font-size:14px">Maintained</div></div></div></div>
    <div class="card panel"><h3>Governed record</h3><div class="kv"><dt>Decision</dt><dd>Accept order</dd><dt>Decided by</dt><dd>Fahad I. (Executive)</dd><dt>Timestamp</dt><dd>${ts}</dd><dt>Scenario</dt><dd>Reallocate L-03 + overtime + expedite</dd><dt>AI recommendation</dt><dd>Followed</dd></div><div class="interpret">Stored as a governed, labelled example for future model learning.</div></div></div>`;
}
function orderModule(){
  const f=FLAGSHIP, accepted=orderState.accepted, prob=accepted?orderState.prob:f.probPct, risk=accepted?'LOW':f.risk;
  const st=orderStage, O=D.orderFocus;
  let body='', footer='', after=()=>{};
  if(st===0){
    body = `<p class="stage-intro">A new customer order has just entered <b>Oracle ERP</b>. Before Shahkam commits to a delivery date, the platform assesses whether it can realistically be delivered on time.</p>`
      + orderStripHTML()
      + `<div class="grid-2" style="margin-top:14px"><div class="card panel"><div class="panel-head"><div><h3>Order make-up — style & size curve</h3><p>Style ${O.style} · ${O.colours.join(' / ')} · 25,000 units</p></div><span class="src-chip">Oracle ERP</span></div>${sizeCurveHTML()}<div class="interpret">The risk isn't total quantity — it is concentrated in the <b>L / XL</b> sizes, whose fabric is short.</div></div>
        <div class="card panel"><div class="panel-head"><div><h3>Material / import readiness</h3><p>Why the shortfall exists</p></div><span class="src-chip">Import · LC</span></div><div class="kv"><dt>Source</dt><dd>${O.materialLead.source}</dd><dt>Fabric ETA</dt><dd>${O.materialLead.eta}</dd><dt>Confirmed</dt><dd>18,500 / 25,000</dd></div><div class="interpret">${O.materialLead.note}.</div></div></div>`;
    footer = stageFooter(false,'Run AI assessment →');
  } else if(st===1){
    body = verdictHTML(prob,risk,accepted)
      + `<p class="stage-intro" style="margin-top:14px">This is a <b>forward-looking prediction</b> from the delivery-risk model — not a historical KPI. The question it answers: <b>can we safely accept this order?</b></p>`
      + `<details class="feas-details"><summary>🧮 Score a different prospective order with this model</summary>${feasibilityHTML()}</details>`;
    footer = stageFooter(true,'Why is it at risk? →');
    after=()=>{ bindFeas(); };
  } else if(st===2){
    body = `<div class="grid-2"><div class="card panel" id="tour-risk-drivers">${riskBarsHTML()}<div class="interpret"><b>Primary risk.</b> ${O.materialLead.note} — the imported L/XL fabric may arrive too late for the planned cutting window.</div><div class="button-row"><button class="secondary" id="evidenceBtn">View Evidence</button>${howBtn('delivery','How is this calculated?')}</div></div>
      <div class="card panel"><div class="panel-head"><div><h3>Where the risk sits</h3><p>The shortfall is concentrated in the L / XL sizes.</p></div><span class="src-chip">Oracle ERP · LC</span></div>${sizeCurveHTML()}<div class="kv" style="margin-top:8px"><dt>Material confirmed</dt><dd>18,500 / 25,000</dd><dt>Fabric ETA</dt><dd>${O.materialLead.eta}</dd><dt>Source</dt><dd>${O.materialLead.source}</dd></div></div></div>`;
    footer = stageFooter(true,'What can we do? →');
    after=()=>{ document.getElementById('evidenceBtn')?.addEventListener('click',evidenceModal); };
  } else if(st===3){
    body = recoHTML(accepted);
    footer = stageFooter(true, accepted?'Continue →':'Simulate the plan →');
    after=()=>{ document.getElementById('acceptFromOrder')?.addEventListener('click',()=>goOrderStage(5)); document.getElementById('holdFromOrder')?.addEventListener('click',holdOrder); };
  } else if(st===4){
    body = `<p class="stage-intro">Test the recovery plan before committing. Change the operational assumptions and the model recalculates the business outcome.</p>${scenarioSimulatorHTML()}`;
    footer = stageFooter(true,'Proceed to decision →');
    after=()=>{ bindScenarioSim(()=>goOrderStage(4)); };
  } else if(st===5){
    if(accepted){
      body = commitRecordedHTML();
      footer = stageFooter(true,'Track the order →');
    } else {
      body = `<div class="grid-2"><div class="reco"><h3>✦ The decision is yours</h3><p style="font-size:12.5px;color:#33534f;line-height:1.6;margin:0 0 10px">AI recommends the recovery plan that lifts on-time probability from <b>61% to 91%</b>. The platform will <b>not</b> accept or reject the order automatically — a person decides.</p>
        <div class="reco-out"><div><div class="ro-l">With plan</div><div class="ro-v"><span class="to">91%</span></div></div><div><div class="ro-l">Added cost</div><div class="ro-v">${money(6200)}</div></div><div><div class="ro-l">Required date</div><div class="ro-v">Maintained</div></div></div>
        <div class="button-row"><button class="primary" id="tour-accept-order">Accept Order</button><button class="secondary" id="commitHold">Hold for Review</button></div></div>
        <div class="card panel"><h3>Human-in-the-loop</h3><div class="interpret">The decision is captured with the selected scenario, the user and a timestamp — a <b>governed record</b>, and the feedback that improves future models.</div><div class="kv" style="margin-top:8px"><dt>Recommended by</dt><dd>Delivery-risk model</dd><dt>Decides</dt><dd>Fahad I. (Executive)</dd><dt>Options</dt><dd>Accept · Hold · Reject</dd></div></div></div>`;
      footer = stageFooter(true,'');
      after=()=>{
        document.getElementById('tour-accept-order')?.addEventListener('click',()=>{ orderState.accepted=true; orderState.prob=91; if(window.Feedback)Feedback.capture({type:'Order commitment',ref:'SO-10482',detail:'91% on-time · recovery plan',decision:'Accepted (recovery plan)'}); const n=document.getElementById('navAtRisk'); if(n)n.textContent='2'; goOrderStage(5); });
        document.getElementById('commitHold')?.addEventListener('click',holdOrder);
      };
    }
  } else { /* st===6 Track */
    body = journeyBody()
      + `<div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Order tracking — where every order is now</h3><p>New orders enter at Received and are tracked live via Barcode → JACK → RFID.</p></div><button class="secondary" id="simOrder">▶ Simulate a new order arriving</button></div>${trackingBoard()}</div>
      <div class="grid-2"><div class="card panel"><div class="panel-head"><div><h3>Delivery outlook</h3><p>Portfolio on-time %, 30-day forecast with a 95% band.</p></div>${howBtn('forecast','How?')}</div><div class="chart-wrap"><canvas id="ordFc"></canvas></div></div>
      <div class="card panel"><h3>Orders most at risk</h3><p>Prioritised by predicted on-time probability.</p><div class="table-wrap">${table(D.orders.filter(o=>o.risk==='HIGH').slice(0,7),['id','customer','value','required','probability','risk'],['Order','Customer','Value','Required','On-time','Risk'])}</div></div></div>`;
    footer = stageFooter(true,'Open Production →','stageProd');
    after=()=>{ makeForecastChart('delivery','ordFc'); document.getElementById('jrnL07')?.addEventListener('click',()=>lineDetailModal(D.lines.find(l=>l.id==='L-07'))); bindTracking(); document.getElementById('stageProd')?.addEventListener('click',()=>render('production')); };
  }
  app.innerHTML = head('Order Decision — SO-10482','Can Shahkam safely accept this order and meet the delivery date?','Order intelligence','orders')
    + `<div class="stage-top">${interactiveStepper(ORDER_STEPS, st)}${footer}</div>` + `<div id="mstage">${body}</div>`;
  document.body.classList.add('order-flow');
  bindCommon();
  document.querySelectorAll('#stageNav .jstep').forEach(b=>b.onclick=()=>goOrderStage(+b.dataset.stage));
  document.getElementById('stagePrev')?.addEventListener('click',()=>goOrderStage(st-1));
  const nx=document.getElementById('stageNext'); if(nx) nx.onclick=()=>goOrderStage(st+1);
  after();
}

/* ---------- 2 · PRODUCTION INTELLIGENCE ---------- */
function lineDetailModal(line){
  const pd=ML.productionDelay(line.id);
  const lvl=pd.probPct>=60?'HIGH':pd.probPct>=35?'MEDIUM':'LOW';
  const move=line.id==='L-07'?'L-03':'a line below 80% utilisation';
  const units=line.id==='L-07'?'800':Math.max(300,Math.round((line.target-line.actual)/1000)*100).toLocaleString();
  const recover=(pd.hours*0.34).toFixed(1);
  document.getElementById('modal').innerHTML=`<div class="modal-content"><button class="close">×</button>
    <span class="label">Production line · delay prediction</span>
    <h2 style="margin:4px 0 2px">${line.id} — Delay Prediction</h2>
    <div style="margin:6px 0 14px">${statusTag(lvl)}</div>
    <div class="ba" style="grid-template-columns:1fr;text-align:left;gap:0"><div><div class="label">Predicted delay</div><div style="font:800 34px Manrope;color:#b23b3b;letter-spacing:-1px">${pd.hours} h <span style="font-size:14px;color:#8a9a9a">· ${pd.probPct}% probability</span></div></div></div>
    <div class="sec-head" style="margin:14px 0 6px"><h2 style="font-size:14px">Why</h2></div>
    ${pd.drivers.map(d=>`<div class="rank-bar"><div class="rb-top"><span>${d.label} <small style="color:#8a9a9a">(${d.raw})</small></span><b>${d.pct}%</b></div><div class="track"><i class="warn" style="width:${Math.min(100,Math.max(6,d.pct*2.6))}%"></i></div></div>`).join('')}
    <div class="reco" style="margin-top:14px"><h3>✦ Recommended intervention</h3><ul><li>Move ${units} units from ${line.id} to ${move}</li><li>Prioritise the changeover to recover hourly output</li></ul>
      <div class="reco-out"><div><div class="ro-l">Potential recovery</div><div class="ro-v"><span class="to">${recover} h</span></div></div><div><div class="ro-l">Residual delay</div><div class="ro-v">${(pd.hours-recover).toFixed(1)} h</div></div><div><div class="ro-l">Required date</div><div class="ro-v">Protected</div></div></div>
      <div class="button-row"><button class="primary" data-page="capacity">Open capacity planner</button>${howBtn('production','How is this predicted?')}</div></div></div>`;
  openModal();
  document.querySelector('#modal .close').onclick=closeModal;
  document.querySelectorAll('#modal [data-page]').forEach(b=>b.onclick=()=>{closeModal();render(b.dataset.page)});
}
/* ---- shared stepped-module infrastructure + chart helpers ---- */
function bindStageNav(goFn, st){
  document.querySelectorAll('#stageNav .jstep').forEach(b=>b.onclick=()=>goFn(+b.dataset.stage));
  document.getElementById('stagePrev')?.addEventListener('click',()=>goFn(st-1));
  const nx=document.getElementById('stageNext'); if(nx) nx.onclick=()=>goFn(st+1);
}
function chartSafe(id,cfg){ if(!window.Chart)return; const cv=document.getElementById(id); if(!cv)return; Chart.getChart(cv)?.destroy(); try{ return new Chart(cv,cfg); }catch(e){ console.warn('chart',id,e); } }
/* Production charts */
function prodHourlyChart(id){ const tgt=D.lines.find(x=>x.id==='L-07').hourlyTarget; const hrs=Array.from({length:12},(_,i)=>'H'+(i+1));
  const actual=hrs.map((_,i)=>Math.round(tgt*(i<4?0.99:i<7?0.9:i<9?0.8:0.73))-(i%2?55:0));
  return chartSafe(id,{data:{labels:hrs,datasets:[
    {type:'bar',label:'Actual (JACK)',data:actual,backgroundColor:actual.map(v=>v<tgt*0.85?'#c66b47':'#4fa89f'),borderRadius:3,order:2},
    {type:'line',label:'Hourly target',data:hrs.map(()=>tgt),borderColor:'#134f4c',borderDash:[5,4],pointRadius:0,borderWidth:2,order:1}]},options:barOpts('','L-07 hourly output vs target',true)}); }
function prodPolar(id){ return chartSafe(id,{type:'polarArea',data:{labels:D.lines.map(l=>l.id),datasets:[{data:D.lines.map(l=>l.eff),backgroundColor:D.lines.map(l=>l.eff>=90?'rgba(79,168,159,.55)':l.eff>=82?'rgba(226,183,106,.6)':'rgba(201,100,100,.6)')}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.label+': '+c.raw+'% eff'}}},scales:{r:{ticks:{display:false},grid:{color:'#e6eeec'}}}}}); }
function delayContribChart(id){ const pd=ML.productionDelay('L-07'); const cols=['#bd5353','#c98a3f','#347aab','#7a9a99'];
  return chartSafe(id,{type:'bar',data:{labels:['L-07 predicted delay'],datasets:pd.drivers.map((d,i)=>({label:d.label,data:[d.hours],backgroundColor:cols[i]||'#999'}))},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:8,font:{size:9}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.raw+'h'}}},scales:{x:{stacked:true,grid:{color:'#eef2f2'},ticks:{callback:v=>v+'h',font:{size:9}}},y:{stacked:true,grid:{display:false}}}}}); }
function l07TrendChart(id){ const shifts=['S-6','S-5','S-4','S-3','S-2','S-1','Now','+1','+2'];
  return chartSafe(id,{data:{labels:shifts,datasets:[
    {type:'line',label:'Plan',data:shifts.map(()=>1958),borderColor:'#d1a146',borderDash:[5,4],pointRadius:0,borderWidth:1.5},
    {type:'line',label:'Actual output',data:[1900,1880,1840,1790,1760,1710,1670,null,null],borderColor:'#134f4c',backgroundColor:'#134f4c12',fill:true,tension:.3,borderWidth:2.5,pointRadius:2},
    {type:'line',label:'Predicted',data:[null,null,null,null,null,null,1670,1600,1540],borderColor:'#bd5353',borderDash:[4,3],tension:.3,borderWidth:2,pointRadius:2}]},options:barOpts('','L-07 hourly throughput — declining vs plan',true)}); }
function reallocBarChart(id){ return chartSafe(id,{type:'bar',data:{labels:['L-07','L-03'],datasets:[
    {label:'Before',data:[96,77],backgroundColor:'rgba(201,100,100,.6)'},
    {label:'After reallocation',data:[88,86],backgroundColor:'#4fa89f'}]},options:barOpts('%','Line utilisation — before vs after moving 800 units',true)}); }

let prodStage=0;
const PROD_STEPS=['Live floor capture','Line efficiency','Delay prediction','Alert','Intervene'];
function goProd(n){ prodStage=Math.max(0,Math.min(4,n)); productionModule(); document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='production')); window.scrollTo({top:0,behavior:'smooth'}); }
function productionModule(){
  const st=prodStage, linesAtRisk=D.lines.filter(l=>l.risk==='High').length, pd=ML.productionDelay('L-07');
  let body='',footer='',after=()=>{};
  if(st===0){
    body=`<div class="kpi-grid">${kpi('Overall Efficiency','87.3%','↓ 3.4% this week','down')}${kpi('Active Lines','10','all reporting to JACK','')}${kpi('Lines at Risk',linesAtRisk,'need intervention','down')}${kpi('Output vs Plan','92%','840K / 877K units','down')}</div>`
      +`<div class="grid-2" style="margin-top:14px"><div class="card panel"><div class="panel-head"><div><h3>Live floor capture — L-07 hourly output</h3><p>Every machine reports output to JACK in real time — and it is dropping through the shift.</p></div><span class="src-chip jack">SOURCE · JACK</span></div><div class="chart-wrap"><canvas id="prodHourly"></canvas></div></div>
        <div class="card panel"><div class="panel-head"><div><h3>Garment critical path — SO-10482</h3><p>Barcode · JACK · RFID → Oracle</p></div><span class="src-chip jack">B·J·RFID</span></div>${critPathHTML()}</div></div>`;
    footer=stageFooter(false,'Line efficiency →'); after=()=>prodHourlyChart('prodHourly');
  } else if(st===1){
    const rows=D.lines.map(l=>`<tr data-line="${l.id}"${l.id==='L-07'?' id="tour-l07"':''}><td><b>${l.id}</b></td><td class="num">${l.eff}%</td><td class="num">${(l.target/1000).toFixed(0)}K</td><td class="num">${(l.actual/1000).toFixed(0)}K</td><td>${statusTag(l.risk==='High'?'HIGH':l.risk==='Medium'?'MEDIUM':'LOW')}</td></tr>`).join('');
    body=`<div class="grid-2"><div class="card panel"><div class="panel-head"><div><h3>Line status — click a line to see why</h3><p>🟢 Healthy · 🟠 Watch · 🔴 Intervention required.</p></div><span class="src-chip jack">JACK</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Line</th><th>Efficiency</th><th>Plan</th><th>Actual</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><div class="interpret"><b>L-07</b> is the line to act on — 79% efficiency and high rework.</div></div>
      <div class="card panel"><div class="panel-head"><div><h3>Efficiency by line</h3><p>Relative efficiency across all 10 lines.</p></div></div><div class="chart-wrap" style="height:250px"><canvas id="prodPolar"></canvas></div></div></div>
      <div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Line efficiency — last 6 shifts</h3><p>L-07 running red.</p></div><span class="src-chip jack">JACK</span></div>${effHeatmap()}</div>`;
    footer=stageFooter(true,'Delay prediction →');
    after=()=>{ prodPolar('prodPolar'); document.querySelectorAll('[data-line]').forEach(r=>r.onclick=()=>lineDetailModal(D.lines.find(l=>l.id===r.dataset.line))); };
  } else if(st===2){
    body=`<div class="grid-2"><div class="card panel"><h3>Line L-07 — delay prediction</h3>${gaugeWrap('prodGauge',pd.probPct,'delay probability')}<p style="text-align:center;font-size:11.5px;color:#43555a;margin:6px 0"><b>${pd.hours}h predicted delay</b> · gradient-boosted model on live JACK signals.</p><div style="text-align:center">${howBtn('production','How is this predicted?')}</div></div>
      <div class="card panel"><div class="panel-head"><div><h3>What is driving the delay</h3><p>Each signal's contribution to the predicted hours.</p></div><span class="badge sim">GBT</span></div><div class="chart-wrap" style="height:130px"><canvas id="delayContrib"></canvas></div><div style="margin-top:10px">${pd.drivers.map(d=>`<div class="driver-row"><span>${d.label} <b>${d.pct}%</b></span><div class="bar"><i style="width:${Math.min(100,d.pct*2.5)}%"></i></div></div>`).join('')}</div></div></div>`;
    footer=stageFooter(true,'See the alert →');
    after=()=>{ drawGauge('prodGauge',pd.probPct,'#bd5353'); delayContribChart('delayContrib'); };
  } else if(st===3){
    body=`<div class="card panel" style="border-left:4px solid var(--amber)"><div class="panel-head"><div><h3>🟠 Alert — L-07 predicted to lose ${pd.hours}h</h3><p>Detected early, while there is still time to intervene.</p></div>${statusTag('HIGH','Intervention required')}</div>
      <p style="font-size:12.5px;color:#3d4f54;margin:0">Throughput on L-07 is falling below plan and the model projects the trend into the next shifts — the compounding effect is a ~${pd.hours}h delay.</p></div>
      <div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Throughput trend & projection</h3><p>Actual output vs plan, with the model's forward projection.</p></div><span class="src-chip jack">JACK</span></div><div class="chart-wrap"><canvas id="l07Trend"></canvas></div></div>`;
    footer=stageFooter(true,'Recommended intervention →');
    after=()=>l07TrendChart('l07Trend');
  } else {
    const recover=(pd.hours*0.34).toFixed(1);
    body=`<div class="reco" id="tour-production-recommendation"><h3>✦ Recommended intervention</h3><ul><li>Move <b>800 units</b> from L-07 to L-03</li><li>Prioritise the changeover to recover hourly output</li></ul>
      <div class="reco-out"><div><div class="ro-l">Potential recovery</div><div class="ro-v"><span class="to">~${recover} h</span></div></div><div><div class="ro-l">Residual delay</div><div class="ro-v">~${(pd.hours-recover).toFixed(1)} h</div></div><div><div class="ro-l">Required date</div><div class="ro-v">Protected</div></div></div></div>
      <div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Impact of reallocation</h3><p>Line utilisation before vs after moving 800 units to L-03.</p></div></div><div class="chart-wrap" style="height:220px"><canvas id="realloc"></canvas></div></div>`;
    footer=stageFooter(true,'Open Capacity →','stageCap');
    after=()=>{ reallocBarChart('realloc'); document.getElementById('stageCap')?.addEventListener('click',()=>render('capacity')); };
  }
  app.innerHTML=head('Production Intelligence','Which production lines require intervention today?','Operations intelligence','production')
    + `<div class="stage-top">${interactiveStepper(PROD_STEPS,st)}${footer}</div>` + `<div id="mstage">${body}</div>`;
  bindCommon(); bindStageNav(goProd,st); after();
}

/* ---------- 3 · CAPACITY & PLANNING INTELLIGENCE ---------- */
function capWeeksChart(id){ const wk=['This week','Week 2','Week 3','Week 4'],used=[86,88,94,90];
  return chartSafe(id,{type:'bar',data:{labels:wk,datasets:[
    {label:'Committed',data:used,backgroundColor:'#347aab'},
    {label:'Available headroom',data:used.map(u=>100-u),backgroundColor:'#bfe0da'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:8,font:{size:9}}},title:{display:true,text:'Capacity utilisation by week — Week 3 is tight',font:{size:10},color:'#6a7a7a'}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,max:100,grid:{color:'#eef2f2'},ticks:{callback:v=>v+'%',font:{size:9}}}}}}); }
function capAllocChart(id,plan){ if(!plan||!plan.length)return; return chartSafe(id,{type:'bar',data:{labels:plan.map(p=>p.id),datasets:[
    {label:'Current load',data:plan.map(p=>p.fromUtil),backgroundColor:'#8ccbc5'},
    {label:'After new units',data:plan.map(p=>p.toUtil),backgroundColor:'#0f766e'}]},options:barOpts('%','Where the extra units are placed',true)}); }
function capUtilBar(id){ return chartSafe(id,{type:'bar',data:{labels:D.lines.map(l=>l.id),datasets:[{label:'Forecast utilisation',data:D.lines.map(l=>l.util),backgroundColor:D.lines.map(l=>l.util>=95?'#b84242':l.util>=90?'#c66b47':'#30877f')}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},title:{display:true,text:'Forecast utilisation by line (100% = full)',font:{size:10},color:'#6a7a7a'}},scales:{x:{max:100,grid:{color:'#eef2f2'},ticks:{callback:v=>v+'%',font:{size:9}}},y:{grid:{display:false}}}}}); }

let capStage=0, capOpt={units:5000,ot:2};
const CAP_STEPS=['Capacity status','Test new order','Optimise','What-if','Plan'];
function goCap(n){ capStage=Math.max(0,Math.min(4,n)); capacityModule(); document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='capacity')); window.scrollTo({top:0,behavior:'smooth'}); }
function bindCapTest(){
  const upd=()=>{ capOpt.units=+document.getElementById('optUnits').value; capOpt.ot=+document.getElementById('optOt').value;
    document.getElementById('optVal').textContent=capOpt.units.toLocaleString(); document.getElementById('otVal').textContent=capOpt.ot+' hrs';
    const c=ML.optimiseCapacity(capOpt.units,{overtimeHrs:capOpt.ot});
    document.getElementById('optResult').innerHTML=gaugeWrap('capGauge',c.projOnTime,'proj. on-time');
    drawGauge('capGauge',c.projOnTime,c.projOnTime>=85?'#287453':c.projOnTime>=75?'#c07a1e':'#bd5353');
    document.getElementById('capVerdict').innerHTML=`<div style="font:800 24px Manrope;color:${c.feasible?'#1f8558':'#b23b3b'}">${c.feasible?'YES':'NO'} — ${c.feasible?'with reallocation':'over capacity'}</div><div style="font-size:11.5px;color:#6a7a7a;margin:4px 0 10px">Placing ${capOpt.units.toLocaleString()} units · projected on-time <b>${c.projOnTime}%</b></div><div class="metric-list" style="grid-template-columns:repeat(3,1fr)"><div><span class="label">Feasible</span><h2 class="${c.feasible?'up':'down'}">${c.feasible?'Yes':'No'}</h2></div><div><span class="label">Units placed</span><h2>${(c.placed/1000).toFixed(0)}K</h2></div><div><span class="label">Binding</span><h2 style="font-size:12px">${c.binding.split('(')[0].trim()}</h2></div></div>`;
  };
  ['optUnits','optOt'].forEach(id=>document.getElementById(id).oninput=upd); upd();
}
function capacityModule(){
  const st=capStage; let body='',footer='',after=()=>{};
  if(st===0){
    body=`<div class="verdict risk-low-bg" id="tour-capacity"><div class="v-num"><div class="big" style="font-size:44px">Yes</div><div class="cap">with reallocation</div></div><div class="v-main"><span class="v-status">🟢 LIMITED HEADROOM</span><h2>~18,400 units available over the next 4 weeks</h2><p>Current utilisation is <b>86%</b>. There is room for more work, but this week is tight — L-07 and L-04 are near capacity. Test a specific order next.</p></div></div>
      <div class="kpi-grid" style="margin-top:14px">${kpi('Current Utilisation','86%','of 1.04M / month','')}${kpi('Available (4 wks)','18,400','units of headroom','up')}${kpi('At-risk Week','Week 3','L-07, L-04 near max','down')}${kpi('On-Time if Balanced','94%','with reallocation','up')}</div>
      <div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Capacity utilisation by week</h3><p>Committed load vs available headroom — Week 3 is the constraint.</p></div><span class="notice">Illustrative</span></div><div class="chart-wrap" style="height:230px"><canvas id="capWeeks"></canvas></div></div>`;
    footer=stageFooter(false,'Test a new order →'); after=()=>capWeeksChart('capWeeks');
  } else if(st===1){
    body=`<p class="stage-intro">Ask “can we place N extra units?” The solver checks capacity + overtime limits and answers with conditions.</p>
      <div class="grid-2"><div class="card panel"><div class="panel-head"><div><h3>Test a new order</h3><p>Adjust the order size and overtime budget.</p></div><span class="badge sim">Optimiser</span></div>
        <div class="control"><label>Extra units to place <b id="optVal">${capOpt.units.toLocaleString()}</b></label><input type="range" id="optUnits" min="1000" max="30000" step="1000" value="${capOpt.units}"></div>
        <div class="control"><label>Overtime budget <b id="otVal">${capOpt.ot} hrs</b></label><input type="range" id="optOt" min="0" max="24" value="${capOpt.ot}"></div>
        <div id="optResult"></div></div>
        <div class="card panel"><h3>Can we accept it?</h3><div id="capVerdict"></div><div style="margin-top:6px">${howBtn('capacity','How is this optimised?')}</div></div></div>`;
    footer=stageFooter(true,'Optimise the allocation →'); after=()=>bindCapTest();
  } else if(st===2){
    const c=ML.optimiseCapacity(capOpt.units,{overtimeHrs:capOpt.ot});
    body=`<div class="grid-2"><div class="card panel"><div class="panel-head"><div><h3>Recommended allocation</h3><p>Placing ${capOpt.units.toLocaleString()} extra units across lines with spare capacity.</p></div><span class="badge sim">Solver</span></div>${c.plan.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Line</th><th>From</th><th>+ Units</th><th>To</th></tr></thead><tbody>${c.plan.map(p=>`<tr><td>${p.id}</td><td>${p.fromUtil}%</td><td>+${p.addUnits.toLocaleString()}</td><td>${p.toUtil}%</td></tr>`).join('')}</tbody></table></div>`:'<p style="font-size:12px;color:var(--muted)">No feasible allocation at this size — reduce units or add overtime.</p>'}<div class="interpret"><b>Binding constraint:</b> ${c.binding}.</div></div>
      <div class="card panel"><div class="panel-head"><div><h3>Where the units land</h3><p>Line load before vs after placement.</p></div></div><div class="chart-wrap" style="height:230px"><canvas id="capAlloc"></canvas></div></div></div>`;
    footer=stageFooter(true,'What-if →'); after=()=>capAllocChart('capAlloc',c.plan);
  } else if(st===3){
    body=`<div class="grid-2"><div class="card panel"><div class="panel-head"><div><h3>Capacity forecast</h3><p>Backlog trajectory with a 95% band — where load is heading.</p></div>${howBtn('forecast','How?')}</div><div class="chart-wrap"><canvas id="capFc"></canvas></div></div>
      <div class="card panel"><h3>Scenario comparison</h3><p>Current plan vs mitigations.</p><div class="scenario-cards"><div class="card scenario-card"><h4>CURRENT</h4><div class="score">86%</div><span class="risk-pill risk-med">TIGHT</span></div><div class="card scenario-card"><h4>+ REALLOCATE</h4><div class="score">89%</div><span class="risk-pill risk-med">OK</span></div><div class="card scenario-card recommended"><h4>+ OVERTIME</h4><div class="score">94%</div><span class="risk-pill risk-low">HEALTHY</span></div></div></div></div>`;
    footer=stageFooter(true,'Finalise the plan →'); after=()=>makeForecastChart('backlog','capFc');
  } else {
    body=`<div class="grid-2"><div class="card panel"><h3>Constraint watchlist</h3><div class="timeline"><div><time>L-07</time>96% forecast utilisation · 14h predicted delay</div><div><time>L-04</time>94% forecast utilisation · elevated backlog</div><div><time>L-03</time>77% forecast utilisation · reallocation opportunity</div></div></div>
      <div class="card panel"><div class="panel-head"><div><h3>Forecast utilisation by line</h3><p>Against the 100% constraint.</p></div></div><div class="chart-wrap" style="height:250px"><canvas id="capUtil"></canvas></div></div></div>
      <div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Capacity heatmap — next 6 days</h3><p>Bottlenecks highlighted.</p></div><span class="notice">Illustrative</span></div>${capacityHeatmapHTML()}</div>`;
    footer=stageFooter(true,''); after=()=>capUtilBar('capUtil');
  }
  app.innerHTML=head('Capacity Intelligence','Can we take on more work — and where would it go?','Capacity intelligence','capacity')
    + `<div class="stage-top">${interactiveStepper(CAP_STEPS,st)}${footer}</div>` + `<div id="mstage">${body}</div>`;
  bindCommon(); bindStageNav(goCap,st); after();
}
function capacityHeatmapHTML(){
  const days=['Today','Tomorrow','+2 Days','+3 Days','+4 Days','+5 Days'];
  const vals=[[83,86,87,90,88,84],[88,90,92,93,90,88],[76,78,80,82,79,77],[91,93,95,94,92,89],[86,85,87,88,86,84],[89,91,92,94,91,89],[94,96,95,94,92,90],[81,82,83,84,85,84],[83,84,86,87,88,86],[89,90,91,92,90,88]];
  return `<div class="heatmap"><span></span>${days.map(d=>`<span class="day">${d}</span>`).join('')}${D.lines.map((l,i)=>`<span class="line-name">${l.id}</span>${vals[i].map(v=>`<button class="heat h${v>=95?5:v>=91?4:v>=87?3:v>=82?2:1}" title="${l.id} · ${v}% forecast utilisation" data-page="production">${v}%</button>`).join('')}`).join('')}</div>`;
}

/* ---------- 4 · PROCUREMENT INTELLIGENCE ---------- */
function reviewCardHTML(x){
  const lvl=x.status==='HIGH'?'HIGH':'MEDIUM';
  return `<div class="review-card sev-${lvl==='HIGH'?'high':'med'}"><div class="rc-head"><div><b>${x.po}</b> ${statusTag(lvl, lvl==='HIGH'?'Unusual — High confidence':'Worth a review')}<div style="font-size:11px;color:var(--muted);margin-top:4px">${x.supplier} · ${x.material} · ${money(Math.round(x.price*x.quantity))}</div></div><div style="text-align:right"><div style="font:800 20px Manrope;color:${lvl==='HIGH'?'#b23b3b':'#8e5e11'}">+${x.variance}%</div><div class="label">vs supplier range</div></div></div>
    <div class="rc-obs"><b>AI observation.</b> Unit price is ${x.variance}% above this supplier’s historical range for ${x.material}.</div>
    <div style="font-size:10px;font-weight:700;letter-spacing:.4px;color:var(--subtle);text-transform:uppercase">Why flagged</div>
    <ul><li>Price deviation from supplier average</li><li>Unusual order quantity</li><li>Supplier pattern deviation</li></ul>
    <div class="button-row"><button class="primary" data-po="${x.po}">Investigate</button><button class="secondary" data-valid="${x.po}">Mark Valid</button></div></div>`;
}
function procDistChart(id){ return chartSafe(id,{type:'bar',data:{labels:['0-20','20-40','40-60','60-80','80-100'],datasets:[{label:'Transactions',data:[62,24,14,6,4],backgroundColor:['#cfe6e2','#8ccbc5','#4fa89f','#c66b47','#b84242']}]},options:barOpts('','Anomaly score distribution (110 transactions)')}); }
function procScatter(id){ const norm=D.procurement.filter(p=>p.status==='NORMAL').slice(0,60).map(p=>({x:p.quantity,y:p.price})); const flag=D.procurement.filter(p=>p.status!=='NORMAL').map(p=>({x:p.quantity,y:p.price}));
  return chartSafe(id,{type:'scatter',data:{datasets:[
    {label:'Normal',data:norm,backgroundColor:'#9ecfc9'},
    {label:'Flagged',data:flag,backgroundColor:'#bd5353',pointRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:8,font:{size:9}}},title:{display:true,text:'Unit price vs quantity — flagged transactions stand out',font:{size:10},color:'#6a7a7a'}},scales:{x:{title:{display:true,text:'Quantity',font:{size:9}},grid:{color:'#eef2f2'},ticks:{font:{size:9}}},y:{title:{display:true,text:'Unit price (PKR)',font:{size:9}},grid:{color:'#eef2f2'},ticks:{font:{size:9},callback:v=>Math.round(v*280)}}}}}); }
function anomFeatureRadar(id){ const a=ML.anomalyScore({});
  return chartSafe(id,{type:'radar',data:{labels:a.feats.map(f=>f.label.split(' ').slice(0,2).join(' ')),datasets:[{label:'Deviation (σ)',data:a.feats.map(f=>Math.abs(f.z)),borderColor:'#bd5353',backgroundColor:'rgba(189,83,83,.15)',pointBackgroundColor:'#bd5353',borderWidth:2,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{beginAtZero:true,grid:{color:'#e6eeec'},angleLines:{color:'#e6eeec'},pointLabels:{font:{size:9},color:'#5d7174'},ticks:{display:false}}}}}); }
function procOutcomeChart(id){ return chartSafe(id,{type:'doughnut',data:{labels:['Confirmed unusual','False positive','Pending'],datasets:[{data:[7,6,5],backgroundColor:['#bd5353','#3f9d8f','#d29a45'],borderWidth:0}]},options:{cutout:'58%',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:9,font:{size:10},padding:10}}}}}); }
function fpRateChart(id){ return chartSafe(id,{data:{labels:['Q1','Q2','Q3','Q4','Q5','Now'],datasets:[
    {type:'line',label:'False-alert rate',data:[19,16,14,11,9,8.3],borderColor:'#0f766e',backgroundColor:'#0f766e18',fill:true,tension:.3,borderWidth:2.5,pointRadius:2},
    {type:'line',label:'Investigator agreement',data:[64,70,74,78,80,81],borderColor:'#347aab',borderDash:[5,4],pointRadius:0,borderWidth:1.5}]},options:barOpts('%','Human feedback improves the model over time',true)}); }

let procStage=0;
const PROC_STEPS=['Transactions','Flag for review','Investigate','Outcome','Feedback'];
function goProc(n){ procStage=Math.max(0,Math.min(4,n)); procurementModule(); document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='procurement')); window.scrollTo({top:0,behavior:'smooth'}); }
function procurementModule(){
  const st=procStage;
  const flagged=D.procurement.filter(p=>p.status!=='NORMAL');
  const top=[...flagged].sort((a,b)=>b.anomaly-a.anomaly).slice(0,3);
  const valAtRisk=flagged.reduce((s,p)=>s+Math.max(0,Math.round((p.price-p.expected)*p.quantity)),0);
  let body='',footer='',after=()=>{};
  if(st===0){
    body=`<div class="kpi-grid">${kpi('Transactions Checked','110','this month','')}${kpi('Flagged for Review',flagged.length,'unusual — not fraud','down')}${kpi('Value to Review',money(valAtRisk),'across flagged POs','down')}${kpi('Cases Pending','4','awaiting investigator','down')}</div>
      <div class="grid-2" style="margin-top:14px"><div class="card panel"><div class="panel-head"><div><h3>All flagged transactions</h3><p>Click a row for the evidence behind its score.</p></div><span class="src-chip">Oracle ERP</span></div><div class="table-wrap">${table(flagged.slice(0,7),['po','supplier','material','price','variance','anomaly','status'],['PO','Supplier','Material','Unit Price','Variance','Score','Status'])}</div></div>
      <div class="card panel"><div class="panel-head"><div><h3>Anomaly score distribution</h3><p>Most transactions are normal; a few stand out.</p></div></div><div class="chart-wrap" style="height:230px"><canvas id="procDist"></canvas></div></div></div>`;
    footer=stageFooter(false,'Flag for review →');
    after=()=>{ procDistChart('procDist'); document.querySelectorAll('#app .data-table tbody tr').forEach((r,i)=>r.onclick=()=>procModal(flagged[i])); };
  } else if(st===1){
    body=`<p class="stage-intro">An anomaly means a transaction is statistically unusual and should be investigated — it is <b>not</b> evidence of fraud.</p>
      <div class="grid-2" style="align-items:start"><div id="tour-procurement">${top.map(reviewCardHTML).join('')}</div>
      <div class="card panel"><div class="panel-head"><div><h3>Price vs quantity</h3><p>Flagged transactions (red) sit away from the normal cluster.</p></div></div><div class="chart-wrap" style="height:320px"><canvas id="procScatter"></canvas></div></div></div>`;
    footer=stageFooter(true,'Investigate →');
    after=()=>{ procScatter('procScatter'); document.querySelectorAll('[data-po]').forEach(b=>b.onclick=()=>procModal(D.procurement.find(p=>p.po===b.dataset.po))); document.querySelectorAll('[data-valid]').forEach(b=>b.onclick=()=>{if(window.Feedback)Feedback.capture({type:'Procurement review',ref:b.dataset.valid,detail:'Reviewed',decision:'Marked valid (false positive)'});toast(`${b.dataset.valid} marked valid.`)}); };
  } else if(st===2){
    const x=D.procurement[0], a=ML.anomalyScore({variance:x.variance});
    body=`<div class="grid-2"><div class="card panel"><div class="panel-head"><div><h3>PO-48291 — investigate</h3><p>${x.supplier} · ${x.material} · ${money(Math.round(x.price*x.quantity))}</p></div><span class="risk-pill risk-high">Score ${x.anomaly}/100</span></div>
      <div class="kv"><dt>Unit price</dt><dd>${pkr(x.price)} vs ${pkr(x.expected)}</dd><dt>Price variance</dt><dd>+${x.variance}%</dd><dt>Quantity</dt><dd>${x.quantity.toLocaleString()}</dd><dt>Potential impact</dt><dd>${money(42000)}</dd></div>
      <div class="interpret"><b>An anomaly is not fraud.</b> Isolation Forest isolates this transaction in few splits (avg path ${a.avgPath}); the radar shows which signals deviate. ${howBtn('anomaly','How the score is built')}</div></div>
      <div class="card panel"><div class="panel-head"><div><h3>Signal deviation profile</h3><p>How far each feature sits from normal (σ).</p></div></div><div class="chart-wrap" style="height:270px"><canvas id="anomRadar"></canvas></div></div></div>`;
    footer=stageFooter(true,'Record outcome →'); after=()=>anomFeatureRadar('anomRadar');
  } else if(st===3){
    body=`<div class="grid-2"><div class="card panel"><h3>Record the outcome — PO-48291</h3><p style="font-size:12px;color:var(--muted)">The investigator decides. The AI only surfaced the transaction for review.</p><div class="button-row"><button class="primary" id="procInvestigate">Investigate</button><button class="secondary" id="procValid">Mark Valid</button><button class="danger" id="procEscalate">Escalate</button></div><div id="procOutcome" class="interpret" style="margin-top:12px">Awaiting decision…</div></div>
      <div class="card panel"><div class="panel-head"><div><h3>Investigation outcomes (this month)</h3><p>How flagged cases resolve.</p></div></div><div class="chart-wrap" style="height:230px"><canvas id="procOutcomeChart"></canvas></div></div></div>`;
    footer=stageFooter(true,'Feedback loop →');
    after=()=>{ procOutcomeChart('procOutcomeChart');
      document.getElementById('procInvestigate').onclick=()=>{ if(window.Feedback)Feedback.capture({type:'Procurement review',ref:'PO-48291',detail:'Score 87',decision:'Investigating'}); document.getElementById('procOutcome').innerHTML='<b>Assigned to Procurement.</b> Investigation opened; supplier history requested.'; toast('Investigation assigned.'); };
      document.getElementById('procValid').onclick=()=>{ if(window.Feedback)Feedback.capture({type:'Procurement review',ref:'PO-48291',detail:'Score 87',decision:'Marked valid (false positive)'}); document.getElementById('procOutcome').innerHTML='<b>Marked valid.</b> Fed back as a false positive to reduce future noise.'; toast('Marked valid — model updated.'); };
      document.getElementById('procEscalate').onclick=()=>{ document.getElementById('procOutcome').innerHTML='<b>Escalated</b> for management review.'; toast('Escalated.'); };
    };
  } else {
    body=`<p class="stage-intro">Every human decision becomes a labelled example — the model learns which flags were real and which were noise, under governance.</p>
      <div class="card panel"><div class="panel-head"><div><h3>Feedback improves the model</h3><p>False-alert rate falls and investigator agreement rises as decisions accumulate.</p></div><span class="badge sim">Governed learning</span></div><div class="chart-wrap"><canvas id="fpRate"></canvas></div></div>
      <div class="card panel" style="margin-top:14px"><h3>Continuous-learning loop</h3><div class="pipeline" style="margin-top:8px">${[['Flag','Anomaly surfaced for review'],['Decide','Investigator confirms or dismisses'],['Label','Outcome stored as training data'],['Retrain','Governed, time-aware retrain'],['Improve','Fewer false positives next cycle']].map((s,i,a)=>`<div class="pipe-step"><div class="n">${i+1}</div><b>${s[0]}</b><p>${s[1]}</p></div>${i<a.length-1?'<span class="pipe-arrow">→</span>':''}`).join('')}</div><div class="button-row"><button class="secondary" data-page="mlops">Open MLOps</button></div></div>`;
    footer=stageFooter(true,''); after=()=>fpRateChart('fpRate');
  }
  app.innerHTML=head('Procurement Intelligence','Which transactions need a human review before we act?','Procurement intelligence','procurement')
    + `<div class="stage-top">${interactiveStepper(PROC_STEPS,st)}${footer}</div>` + `<div id="mstage">${body}</div>`;
  bindCommon(); bindStageNav(goProc,st); after();
}

/* ---------- 5 · AI ASSISTANT ---------- */
let advisorStage=0;
const ADVISOR_STEPS=['Ask in plain language','Governed tool-calls','Grounded, cited answer','Decide & act'];
const ADVISOR_NEXT=['Ask a question →','See the answer →','Decide & act →',''];
const ADVISOR_CAP=[
 'Type a business question below, or pick a common one on the left — plain English, no reports.',
 'The assistant answers by calling <b>approved, read-only tools</b> (shown in the trace) — it never queries ERP tables directly.',
 'The answer is grounded in the same live data as the dashboards, with an <b>evidence &amp; governance</b> note — nothing ungrounded.',
 '<b>AI advises; you decide.</b> The answer links straight back to the relevant screen — open the order or run the scenario.'
];
function advGoStage(n){
  advisorStage=Math.max(0,Math.min(3,n)); const st=advisorStage;
  document.querySelectorAll('#stageNav .jstep').forEach((b,i)=>{ b.classList.toggle('done',i<st); b.classList.toggle('now',i===st); const num=b.querySelector('.js-n'); if(num)num.textContent=i<st?'✓':(i+1); });
  const prev=document.getElementById('stagePrev'); if(prev)prev.style.visibility=st>0?'visible':'hidden';
  const nx=document.getElementById('stageNext'); if(nx){ if(ADVISOR_NEXT[st]){ nx.style.display=''; nx.textContent=ADVISOR_NEXT[st]; } else nx.style.display='none'; }
  const cap=document.getElementById('advCaption'); if(cap)cap.innerHTML=`<b>Step ${st+1} · ${ADVISOR_STEPS[st]}.</b> ${ADVISOR_CAP[st]}`;
  if(st>=1 && typeof advisorTourAsk==='function') advisorTourAsk('Why is SO-10482 at risk?');
  document.querySelectorAll('.adv-hl').forEach(e=>e.classList.remove('adv-hl'));
  if(st>=1){ const t=document.getElementById(['','tour-ai-trace','tour-ai-body','tour-ai-actions'][st]); if(t){ t.classList.add('adv-hl'); t.scrollIntoView({behavior:'smooth',block:'center'}); } }
}
function managementModule(){
  app.innerHTML = head('AI Assistant','Ask the business in plain language — grounded, governed and always advisory','AI Assistant','advisor')
  + `<div class="stage-top">${interactiveStepper(ADVISOR_STEPS, advisorStage)}${stageFooter(true, ADVISOR_NEXT[advisorStage]||'Next →')}</div>`
  + `<div id="advCaption" class="stage-intro"></div>`
  + `<div class="kpi-grid">${kpi('On-Time Delivery','91.4%','↓ Forecast 87.8%','down')}${kpi('Orders at Risk','11','high risk','down')}${kpi('Value at Risk',money(1420000),'illustrative','down')}${kpi('AI-Assisted Impact',money(4360000),'net · illustrative','up')}</div>`
  + `<div class="grid-2" style="grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr)"><div id="tour-ai-assistant">${advisorChatHTML()}</div>
     <div><div class="card panel"><div class="panel-head"><div><h3>AI Daily Brief</h3><p>Today’s position</p></div><span class="chip risk-med">3 ISSUES</span></div><div class="timeline"><div><time>🔴</time><b>SO-10482</b> — 61% on-time probability</div><div><time>🟠</time><b>L-07</b> — 14h predicted delay</div><div><time>🟠</time><b>PO-48291</b> — priced above supplier range</div><div><time>🟢</time><b>Forecast</b> holding at 87.8%</div></div><div class="button-row"><button class="secondary" data-page="orders">Orders</button><button class="secondary" data-page="alerts">Alerts</button><button class="secondary" data-page="roi">Business Value</button></div></div>
     <div class="card panel" style="margin-top:14px"><h3>Complements your stack</h3><div class="interpret">Runs <b>on-prem</b> via Select AI / APEX AI. This answers <i>what to do</i>; your Work-Order Assistant answers <i>what a work order is</i>.</div></div></div></div>`;
  bindCommon(); bindAdvisor();
  document.querySelectorAll('#stageNav .jstep').forEach(b=>b.onclick=()=>advGoStage(+b.dataset.stage));
  document.getElementById('stagePrev')?.addEventListener('click',()=>advGoStage(advisorStage-1));
  document.getElementById('stageNext')?.addEventListener('click',()=>advGoStage(advisorStage+1));
  advGoStage(advisorStage);
}

/* ---------- PLATFORM · AI / ML MODELS ---------- */
function aimlPage(){ methodologyPage(); insertJourney(['Raw Oracle data','Feature engineering','Train / validate','In-database inference','Explain'],3); }

/* ---- extra AI visuals ---- */
function drawRadar(id,r){ if(!window.Chart)return; const cv=document.getElementById(id); if(!cv)return; Chart.getChart(cv)?.destroy();
  new Chart(cv,{type:'radar',data:{labels:r.drivers.map(d=>d.label.replace('Line ','').replace(' rate','')),datasets:[{label:'Risk contribution %',data:r.drivers.map(d=>d.pct),borderColor:'#bd5353',backgroundColor:'rgba(189,83,83,.15)',pointBackgroundColor:'#bd5353',borderWidth:2,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{beginAtZero:true,grid:{color:'#e6eeec'},angleLines:{color:'#e6eeec'},pointLabels:{font:{size:9},color:'#5d7174'},ticks:{display:false}}}}}); }

/* Line-efficiency heatmap — high efficiency = green, low = red (last 6 shifts). */
function effHeatmap(){ const shifts=['S-6','S-5','S-4','S-3','S-2','Now'];
  return `<div class="heatmap">${'<span></span>'+shifts.map(s=>`<span class="day">${s}</span>`).join('')}${D.lines.map((l,i)=>`<span class="line-name">${l.id}</span>${shifts.map((s,si)=>{let v=Math.max(62,Math.min(99,l.eff+(si-4)*2+((i*5+si*3)%7-3)));let h=v>=90?3:v>=85?2:v>=80?1:v>=75?4:5;return `<button class="heat h${h}" title="${l.id} ${s}: ${v}% efficiency">${v}</button>`;}).join('')}`).join('')}</div>`; }

/* Supplier × material anomaly heatmap — where unusual pricing clusters (red = investigate). */
function supplierHeatmap(){ const sup=D.suppliers, mat=D.materials;
  const cell=(s,m)=>{ const rows=D.procurement.filter(p=>p.supplier===s&&p.material===m); if(!rows.length)return null; return Math.round(rows.reduce((a,p)=>a+p.anomaly,0)/rows.length); };
  return `<div class="heatmap" style="grid-template-columns:118px repeat(${mat.length},minmax(46px,1fr))">${'<span></span>'+mat.map(m=>`<span class="day">${m.split(' ')[0]}</span>`).join('')}${sup.map(s=>`<span class="line-name" style="font-size:10px">${s}</span>${mat.map(m=>{const v=cell(s,m);if(v==null)return '<span class="heat" style="background:#f4f7f7"></span>';const h=v>=80?5:v>=60?4:v>=40?3:v>=20?2:1;return `<button class="heat h${h}" title="${s} · ${m}: avg anomaly ${v}/100">${v}</button>`;}).join('')}`).join('')}</div>`; }

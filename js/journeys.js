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
function orderModule(){
  const f=FLAGSHIP, accepted=orderState.accepted, prob=accepted?orderState.prob:f.probPct, risk=accepted?'LOW':f.risk;
  const riskBars=`<div class="panel-head"><div><h3>Risk drivers</h3><p>What is pulling the on-time probability down, ranked by contribution.</p></div><span class="src-chip">Delivery-risk model</span></div>`
    + f.drivers.slice(0,4).map(d=>`<div class="rank-bar"><div class="rb-top"><span>${d.label}</span><b>${d.pct}%</b></div><div class="track"><i class="${d.contribution<0?'warn':''}" style="width:${Math.min(100,Math.max(6,d.pct*2.6))}%"></i></div></div>`).join('');
  app.innerHTML = head('Order Decision — SO-10482','Can Shahkam safely accept this order and meet the delivery date?','Order intelligence')
  + journeySteps(['New order arrives','AI verdict','Why','Recommendation','Simulate','Commit','Track'],accepted?6:1)
  + orderStripHTML()
  + verdictHTML(prob,risk,accepted)
  + `<div class="sec-head"><h2>Why is this order at risk?</h2><p>The factors behind the prediction — and the evidence underneath them.</p></div>`
  + `<div class="grid-2"><div class="card panel" id="tour-risk-drivers">${riskBars}<div class="interpret"><b>Primary risk.</b> ${D.orderFocus.materialLead.note} — the imported L/XL fabric may arrive too late for the planned cutting window.</div><div class="button-row"><button class="secondary" id="evidenceBtn">View Evidence</button>${howBtn('delivery','How is this calculated?')}</div></div>
     <div class="card panel"><div class="panel-head"><div><h3>Where the risk sits</h3><p>The shortfall is concentrated in the L / XL sizes.</p></div><span class="src-chip">Oracle ERP · LC</span></div>${sizeCurveHTML()}<div class="kv" style="margin-top:8px"><dt>Material confirmed</dt><dd>18,500 / 25,000</dd><dt>Fabric ETA</dt><dd>${D.orderFocus.materialLead.eta}</dd><dt>Source</dt><dd>${D.orderFocus.materialLead.source}</dd></div></div></div>`
  + `<div class="sec-head"><h2>What can we do?</h2><p>The AI recommends a recovery plan — you decide whether to run it.</p></div>`
  + recoHTML(accepted)
  + `<div class="sec-head"><h2>Assess a different order</h2><p>Score any prospective order live — change an input and the model re-predicts instantly.</p></div>`
  + feasibilityHTML()
  + `<div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Order tracking — where every order is now</h3><p>New orders enter at Received and are tracked live via Barcode → JACK → RFID.</p></div><button class="secondary" id="simOrder">▶ Simulate a new order arriving</button></div>${trackingBoard()}</div>
    <div class="grid-2"><div class="card panel"><div class="panel-head"><div><h3>Delivery outlook</h3><p>Portfolio on-time %, 30-day forecast with a 95% confidence band.</p></div>${howBtn('forecast','How?')}</div><div class="chart-wrap"><canvas id="ordFc"></canvas></div></div>
    <div class="card panel"><h3>Orders most at risk</h3><p>Prioritised by predicted on-time probability.</p><div class="table-wrap">${table(D.orders.filter(o=>o.risk==='HIGH').slice(0,7),['id','customer','value','required','probability','risk'],['Order','Customer','Value','Required','On-time','Risk'])}</div></div></div>`;
  makeForecastChart('delivery','ordFc');
  bindCommon(); bindFeas(); bindTracking();
  document.getElementById('evidenceBtn')?.addEventListener('click',evidenceModal);
  document.getElementById('acceptFromOrder')?.addEventListener('click',()=>acceptOrder(91));
  document.getElementById('holdFromOrder')?.addEventListener('click',holdOrder);
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
    <div class="reco" id="tour-production-recommendation" style="margin-top:14px"><h3>✦ Recommended intervention</h3><ul><li>Move ${units} units from ${line.id} to ${move}</li><li>Prioritise the changeover to recover hourly output</li></ul>
      <div class="reco-out"><div><div class="ro-l">Potential recovery</div><div class="ro-v"><span class="to">${recover} h</span></div></div><div><div class="ro-l">Residual delay</div><div class="ro-v">${(pd.hours-recover).toFixed(1)} h</div></div><div><div class="ro-l">Required date</div><div class="ro-v">Protected</div></div></div>
      <div class="button-row"><button class="primary" data-page="capacity">Open capacity planner</button>${howBtn('production','How is this predicted?')}</div></div></div>`;
  openModal();
  document.querySelector('#modal .close').onclick=closeModal;
  document.querySelectorAll('#modal [data-page]').forEach(b=>b.onclick=()=>{closeModal();render(b.dataset.page)});
}
function productionModule(){
  const linesAtRisk=D.lines.filter(l=>l.risk==='High').length;
  const rows=D.lines.map(l=>`<tr data-line="${l.id}"${l.id==='L-07'?' id="tour-l07"':''}><td><b>${l.id}</b></td><td class="num">${l.eff}%</td><td class="num">${(l.target/1000).toFixed(0)}K</td><td class="num">${(l.actual/1000).toFixed(0)}K</td><td>${statusTag(l.risk==='High'?'HIGH':l.risk==='Medium'?'MEDIUM':'LOW')}</td></tr>`).join('');
  app.innerHTML = head('Production Intelligence','Which production lines require intervention today?','Operations intelligence')
  + journeySteps(['Live floor capture','Line efficiency','Delay prediction','Alert','Intervene'],2)
  + `<div class="kpi-grid">${kpi('Overall Efficiency','87.3%','↓ 3.4% this week','down')}${kpi('Active Lines','10','all reporting to JACK','')}${kpi('Lines at Risk',linesAtRisk,'need intervention','down')}${kpi('Output vs Plan','92%','840K / 877K units','down')}</div>`
  + `<div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Line status — click a line to see why</h3><p>🟢 Healthy · 🟠 Watch · 🔴 Intervention required. Colour is a supporting indicator, never the only signal.</p></div><span class="src-chip jack">SOURCE · JACK</span></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Line</th><th>Efficiency</th><th>Plan</th><th>Actual</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="interpret"><b>L-07</b> is the line to act on: 79% efficiency and high rework are eroding output — the driver behind its predicted delay. Click it for the recommended intervention.</div></div>`
  + `<div class="grid-2"><div class="card panel"><div class="panel-head"><div><h3>Production forecast</h3><p>Throughput trend with a 95% confidence band.</p></div>${howBtn('forecast','How?')}</div><div class="chart-wrap"><canvas id="prodFc"></canvas></div></div>
     <div class="card panel"><h3>Line L-07 — delay prediction</h3>${gaugeWrap('prodGauge',ML.productionDelay('L-07').probPct,'delay probability')}<p style="text-align:center;font-size:11.5px;color:#43555a;margin:6px 0">Predicted <b>${ML.productionDelay('L-07').hours}h late</b> · changeover + throughput decline + downtime.</p><div class="button-row" style="justify-content:center"><button class="primary" id="l07detail">Review intervention</button></div></div></div>`
  + `<div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Line efficiency — live heatmap</h3><p>Efficiency by line across the last 6 shifts (JACK). Supporting evidence.</p></div><span class="src-chip jack">SOURCE · JACK</span></div>${effHeatmap()}</div>
    <div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Garment critical path — SO-10482</h3><p>Barcode (cutting) · JACK (sewing) · RFID (packing), live into Oracle.</p></div><span class="src-chip jack">BARCODE · JACK · RFID</span></div>${critPathHTML()}</div>`;
  makeForecastChart('throughput','prodFc');
  drawGauge('prodGauge',ML.productionDelay('L-07').probPct,'#bd5353');
  bindCommon();
  document.querySelectorAll('[data-line]').forEach(r=>r.onclick=()=>lineDetailModal(D.lines.find(l=>l.id===r.dataset.line)));
  document.getElementById('l07detail')?.addEventListener('click',()=>lineDetailModal(D.lines.find(l=>l.id==='L-07')));
}

/* ---------- 3 · CAPACITY & PLANNING INTELLIGENCE ---------- */
function capacityModule(){
  app.innerHTML = head('Capacity Intelligence','Can we take on more work — and where would it go?','Capacity intelligence')
  + journeySteps(['Capacity status','Test new order','Optimise','What-if','Plan'],1)
  + `<div class="verdict risk-low-bg" id="tour-capacity"><div class="v-num"><div class="big" style="font-size:44px">Yes</div><div class="cap">with reallocation</div></div>
     <div class="v-main"><span class="v-status">🟢 LIMITED HEADROOM</span><h2>~18,400 units available over the next 4 weeks</h2><p>Current utilisation is <b>86%</b>. There is room for additional work, but this week is tight — L-07 and L-04 are near capacity. Test a specific order below before committing.</p></div></div>`
  + `<div class="kpi-grid" style="margin-top:14px">${kpi('Current Utilisation','86%','of 1.04M / month','')}${kpi('Available (4 wks)','18,400','units of headroom','up')}${kpi('At-risk Week','This week','L-07, L-04 near max','down')}${kpi('On-Time if Balanced','94%','with reallocation','up')}</div>`
  + `<div class="grid-2" style="margin-top:14px"><div class="card panel"><div class="panel-head"><div><h3>Test a new order</h3><p>Ask “can we place N extra units?” The optimiser allocates within capacity + overtime limits.</p></div><span class="badge sim">Optimiser</span></div><div class="control"><label>Extra units to place <b id="optVal">5,000</b></label><input type="range" id="optUnits" min="1000" max="30000" step="1000" value="5000"></div><div class="control"><label>Overtime budget <b id="otVal">8 hrs</b></label><input type="range" id="optOt" min="0" max="24" value="8"></div><div id="optResult"></div><div class="button-row">${howBtn('capacity','How is this optimised?')}<button class="secondary" data-page="scenarios">Run detailed scenario</button></div></div>
     <div class="card panel"><h3>Constraint watchlist</h3><div class="timeline"><div><time>L-07</time>96% forecast utilisation · 14h predicted delay</div><div><time>L-04</time>94% forecast utilisation · elevated backlog</div><div><time>L-03</time>77% forecast utilisation · reallocation opportunity</div></div><div class="card panel" style="margin-top:12px;padding:14px"><div class="panel-head" style="margin-bottom:8px"><div><h3 style="font-size:13px">Capacity forecast</h3></div>${howBtn('forecast','How?')}</div><div class="chart-wrap" style="height:170px"><canvas id="capFc"></canvas></div></div></div></div>`
  + `<div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Capacity heatmap — supporting evidence</h3><p>Forecast utilisation by line over the next 6 days. Bottlenecks highlighted.</p></div><span class="notice">Illustrative</span></div>${capacityHeatmapHTML()}</div>`;
  bindCommon(); bindCapacityOpt(); makeForecastChart('backlog','capFc');
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
function procurementModule(){
  const flagged=D.procurement.filter(p=>p.status!=='NORMAL');
  const top=[...flagged].sort((a,b)=>b.anomaly-a.anomaly).slice(0,3);
  const valAtRisk=flagged.reduce((s,p)=>s+Math.max(0,Math.round((p.price-p.expected)*p.quantity)),0);
  app.innerHTML = head('Procurement Intelligence','Which transactions need a human review before we act?','Procurement intelligence')
  + journeySteps(['Transactions','Flag for review','Investigate','Outcome','Feedback'],1)
  + `<div class="kpi-grid">${kpi('Transactions Checked','110','this month','')}${kpi('Flagged for Review',flagged.length,'unusual — not fraud','down')}${kpi('Value to Review',money(valAtRisk),'across flagged POs','down')}${kpi('Cases Pending','4','awaiting investigator','down')}</div>`
  + `<div class="sec-head"><h2>Transactions requiring review</h2><p>An anomaly means a transaction is statistically unusual and should be investigated — it is not evidence of fraud.</p></div>`
  + `<div class="priority-list" id="tour-procurement">${top.map(reviewCardHTML).join('')}</div>`
  + `<div class="card panel" style="margin-top:16px"><div class="panel-head"><div><h3>All flagged transactions</h3><p>Click any row for the feature-by-feature evidence behind its score.</p></div><select id="procFilter" class="input"><option>All flagged</option><option>HIGH</option><option>REVIEW</option></select></div><div class="table-wrap">${table(flagged.slice(0,8),['po','supplier','material','price','variance','anomaly','status'],['PO Number','Supplier','Material','Unit Price','Variance','Score','Status'])}</div></div>`
  + `<details style="margin-top:14px"><summary style="cursor:pointer;font:700 13px Manrope;color:#285a59;padding:10px 0">▸ View Analytics — supplier heatmap & score distribution</summary>
      <div class="card panel" style="margin-top:8px"><div class="panel-head"><div><h3>Supplier × material — anomaly heatmap</h3><p>Where unusual pricing clusters. Red = worth investigating.</p></div><span class="src-chip">Oracle ERP</span></div>${supplierHeatmap()}</div>
      <div class="card panel" style="margin-top:14px"><h3>Anomaly score distribution</h3><p>Most transactions are normal; a few stand out for review.</p><div class="chart-wrap" style="height:200px"><canvas id="procDist"></canvas></div></div></details>`;
  bindCommon();
  document.querySelectorAll('#app .data-table tbody tr').forEach((r,i)=>r.onclick=()=>procModal(flagged[i]));
  document.querySelectorAll('[data-po]').forEach(b=>b.onclick=()=>procModal(D.procurement.find(p=>p.po===b.dataset.po)));
  document.querySelectorAll('[data-valid]').forEach(b=>b.onclick=()=>{if(window.Feedback)Feedback.capture({type:'Procurement review',ref:b.dataset.valid,detail:'Reviewed on Procurement page',decision:'Marked valid (false positive)'});toast(`${b.dataset.valid} marked valid — fed back to reduce false positives.`)});
  document.getElementById('procFilter').onchange=e=>toast(`Filtered to ${e.target.value}.`);
  const pd=document.getElementById('procDist');
  document.querySelector('details')?.addEventListener('toggle',function(){if(this.open&&window.Chart&&pd&&!Chart.getChart(pd)){new Chart(pd,{type:'bar',data:{labels:['0-20','20-40','40-60','60-80','80-100'],datasets:[{label:'Transactions',data:[62,24,14,6,4],backgroundColor:['#cfe6e2','#8ccbc5','#4fa89f','#c66b47','#b84242']}]},options:barOpts('','')});}});
}

/* ---------- 5 · AI ASSISTANT ---------- */
function managementModule(){
  app.innerHTML = head('AI Assistant','Ask the business in plain language — grounded, governed and always advisory','AI Assistant')
  + journeySteps(['Ask in plain language','Governed tool-calls','Grounded, cited answer','Decide & act'],0)
  + `<div class="kpi-grid">${kpi('On-Time Delivery','91.4%','↓ Forecast 87.8%','down')}${kpi('Orders at Risk','11','high risk','down')}${kpi('Value at Risk',money(1420000),'illustrative','down')}${kpi('AI-Assisted Impact',money(4360000),'net · illustrative','up')}</div>`
  + `<div class="grid-2" style="grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr)"><div id="tour-ai-assistant">${advisorChatHTML()}</div>
     <div><div class="card panel"><div class="panel-head"><div><h3>AI Daily Brief</h3><p>Today’s position</p></div><span class="chip risk-med">3 ISSUES</span></div><div class="timeline"><div><time>🔴</time><b>SO-10482</b> — 61% on-time probability</div><div><time>🟠</time><b>L-07</b> — 14h predicted delay</div><div><time>🟠</time><b>PO-48291</b> — priced above supplier range</div><div><time>🟢</time><b>Forecast</b> holding at 87.8%</div></div><div class="button-row"><button class="secondary" data-page="orders">Orders</button><button class="secondary" data-page="alerts">Alerts</button><button class="secondary" data-page="roi">Business Value</button></div></div>
     <div class="card panel" style="margin-top:14px"><h3>Complements your stack</h3><div class="interpret">Runs <b>on-prem</b> via Select AI / APEX AI. This answers <i>what to do</i>; your Work-Order Assistant answers <i>what a work order is</i>.</div></div></div></div>`;
  bindCommon(); bindAdvisor();
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

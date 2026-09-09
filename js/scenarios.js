const scenarioState={allocation:22,overtime:8,material:'2026-09-12',priority:'High',line:'L-03',sequence:'Optimised'};
function calculateScenario(){let s=scenarioState, gain=s.allocation*.55+s.overtime*1.05+(s.sequence==='Optimised'?5:0)+(s.priority==='Critical'?3:s.priority==='High'?1:0)+(s.material<='2026-09-12'?3:-4);return {prob:Math.min(96,Math.max(55,Math.round(61+gain))),completion:gain>=25?'17 Sep':gain>=15?'19 Sep':'21 Sep',capacity:Math.max(86,94-s.allocation*.35-s.overtime*.08),protected:gain>=25?185000:Math.round(185000*Math.max(.4,gain/30)),risk:gain>=25?'LOW':gain>=15?'MEDIUM':'HIGH'} }
function scenarioHTML(){let x=calculateScenario();return `<div class="page-head"><div><div class="eyebrow">Decision simulation</div><h1>What-If Simulation</h1><p>What happens if we change the production plan for <b>SO-10482</b>?</p></div><span class="notice">All results are illustrative scenario estimates</span></div><div class="scenario-grid"><div class="card control-panel" id="tour-scenario-controls"><h3>Scenario controls</h3><div class="control"><label>Capacity reallocation <b id="allocVal">${scenarioState.allocation}%</b></label><input type="range" id="allocation" min="0" max="25" value="${scenarioState.allocation}"></div><div class="control"><label>Overtime <b id="overVal">${scenarioState.overtime} hours</b></label><input type="range" id="overtime" min="0" max="20" value="${scenarioState.overtime}"></div><div class="control"><label>Material availability date</label><input class="input" id="materialDate" type="date" value="${scenarioState.material}"></div><div class="control"><label>Production priority</label><select class="input" id="priority"><option>Normal</option><option ${scenarioState.priority==='High'?'selected':''}>High</option><option>Critical</option></select></div><div class="control"><label>Production line</label><select class="input" id="scenarioLine">${D.lines.map(l=>`<option ${l.id===scenarioState.line?'selected':''}>${l.id}</option>`).join('')}</select></div><div class="control"><label>Production sequencing</label><select class="input" id="sequence"><option>Current</option><option ${scenarioState.sequence==='Optimised'?'selected':''}>Optimised</option></select></div><button class="primary" id="recalcScenario">Run simulation</button></div><div><div class="scenario-cards"><div class="card scenario-card"><h4>CURRENT PLAN</h4><div class="score">61%</div><span class="risk-pill risk-high">HIGH RISK</span><div class="statline"><span>Completion</span><b>21 Sep</b></div><div class="statline"><span>Capacity</span><b>94%</b></div></div><div class="card scenario-card"><h4>SCENARIO A</h4><div class="score">78%</div><span class="risk-pill risk-med">MEDIUM RISK</span><div class="statline"><span>Reallocate L-03</span><b>+12%</b></div><div class="statline"><span>Completion</span><b>19 Sep</b></div></div><div class="card scenario-card recommended"><span class="label">Recommended</span><h4>YOUR SCENARIO</h4><div class="score" id="scenarioProb">${x.prob}%</div><span class="risk-pill ${riskClass(x.risk)}" id="scenarioRisk">${x.risk} RISK</span><div class="statline"><span>Completion</span><b id="scenarioDate">${x.completion}</b></div><div class="statline"><span>Capacity</span><b id="scenarioCap">${x.capacity.toFixed(0)}%</b></div></div></div><div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Recommended scenario impact</h3><p>Reallocate one production line and apply limited overtime to achieve a high-confidence delivery outcome.</p></div><span class="risk-pill risk-low">CONDITIONALLY FEASIBLE</span></div><div class="ba" id="tour-scenario-result" style="margin-bottom:14px"><div class="ba-box before"><div class="label">Before</div><div class="p">61%</div><span class="risk-pill risk-high">HIGH RISK</span></div><div class="ba-arr">→</div><div class="ba-box after"><div class="label">After</div><div class="p" id="baAfter">${x.prob}%</div><span class="risk-pill ${riskClass(x.risk)}" id="baRisk">${x.risk} RISK</span></div></div><div class="metric-list"><div><span class="label">Delivery impact</span><h2>+${x.prob-61} pts</h2><small>on-time probability</small></div><div><span class="label">Additional cost</span><h2>${money(scenarioState.overtime*300+scenarioState.allocation*180)}</h2><small>overtime + reallocation · est.</small></div><div><span class="label">Capacity impact</span><h2>94% → ${x.capacity.toFixed(0)}%</h2><small>line load on L-07</small></div></div><div class="statline" style="margin-top:6px"><span>Required date</span><b class="up">Maintained · 18 Sep</b></div><div class="statline"><span>Value protected</span><b>${money(x.protected)}</b></div><div class="button-row"><button class="primary" id="acceptScenario">Accept Order</button><button class="secondary" id="holdScenario">Hold for Review</button><button class="secondary" id="saveScenario">Save Scenario</button><button class="secondary" data-page="orders">View order analysis</button><button class="secondary" id="rejectScenario">Cancel</button></div></div>`+orderScenarioTable(x.prob, scenarioState.overtime*300+scenarioState.allocation*180)+`</div></div>`}
/* Embeddable simulator (controls + before/after result) for the Order flow. */
function scenarioSimulatorHTML(){
  let x=calculateScenario();
  return `<div class="scenario-grid"><div class="card control-panel" id="tour-scenario-controls"><h3>Scenario controls</h3>
    <div class="control"><label>Capacity reallocation <b id="allocVal">${scenarioState.allocation}%</b></label><input type="range" id="allocation" min="0" max="25" value="${scenarioState.allocation}"></div>
    <div class="control"><label>Overtime <b id="overVal">${scenarioState.overtime} hours</b></label><input type="range" id="overtime" min="0" max="20" value="${scenarioState.overtime}"></div>
    <div class="control"><label>Material availability date</label><input class="input" id="materialDate" type="date" value="${scenarioState.material}"></div>
    <div class="control"><label>Production priority</label><select class="input" id="priority"><option>Normal</option><option ${scenarioState.priority==='High'?'selected':''}>High</option><option>Critical</option></select></div>
    <div class="control"><label>Production line</label><select class="input" id="scenarioLine">${D.lines.map(l=>`<option ${l.id===scenarioState.line?'selected':''}>${l.id}</option>`).join('')}</select></div>
    <div class="control"><label>Production sequencing</label><select class="input" id="sequence"><option>Current</option><option ${scenarioState.sequence==='Optimised'?'selected':''}>Optimised</option></select></div>
    <button class="primary" id="recalcScenario">Run simulation</button></div>
   <div><div class="ba" id="tour-scenario-result" style="margin-bottom:14px"><div class="ba-box before"><div class="label">Before</div><div class="p">61%</div><span class="risk-pill risk-high">HIGH RISK</span></div><div class="ba-arr">→</div><div class="ba-box after"><div class="label">After</div><div class="p">${x.prob}%</div><span class="risk-pill ${riskClass(x.risk)}">${x.risk} RISK</span></div></div>
    <div class="card panel" style="margin:0"><div class="panel-head"><div><h3>Scenario impact</h3><p>The trade-off before you commit.</p></div><span class="risk-pill risk-low">CONDITIONALLY FEASIBLE</span></div>
      <div class="metric-list"><div><span class="label">Delivery impact</span><h2>+${x.prob-61} pts</h2><small>on-time probability</small></div><div><span class="label">Additional cost</span><h2>${money(scenarioState.overtime*300+scenarioState.allocation*180)}</h2><small>overtime + reallocation · est.</small></div><div><span class="label">Capacity impact</span><h2>94% → ${x.capacity.toFixed(0)}%</h2><small>line load on L-07</small></div></div>
      <div class="statline" style="margin-top:6px"><span>Required date</span><b class="up">Maintained · 18 Sep</b></div><div class="statline"><span>Value protected</span><b>${money(x.protected)}</b></div>
      <div class="button-row">${howBtn('capacity','How is this optimised?')}</div></div>`+orderScenarioTable(x.prob, scenarioState.overtime*300+scenarioState.allocation*180)+`</div></div>`;
}
function bindScenarioSim(rerender){
  ['allocation','overtime','materialDate','priority','scenarioLine','sequence'].forEach(id=>{let e=document.getElementById(id);if(e)e.oninput=()=>{scenarioState[id==='allocation'?'allocation':id==='overtime'?'overtime':id==='materialDate'?'material':id==='scenarioLine'?'line':id]=e.value;const a=document.getElementById('allocVal');if(a)a.textContent=scenarioState.allocation+'%';const o=document.getElementById('overVal');if(o)o.textContent=scenarioState.overtime+' hours';}});
  document.getElementById('recalcScenario')?.addEventListener('click',()=>rerender&&rerender());
}
function bindScenario(){['allocation','overtime','materialDate','priority','scenarioLine','sequence'].forEach(id=>{let e=document.getElementById(id);if(e)e.oninput=()=>{scenarioState[id==='allocation'?'allocation':id==='overtime'?'overtime':id==='materialDate'?'material':id==='scenarioLine'?'line':id]=e.value;document.getElementById('allocVal').textContent=scenarioState.allocation+'%';document.getElementById('overVal').textContent=scenarioState.overtime+' hours'}});document.getElementById('recalcScenario')?.addEventListener('click',()=>render('scenarios'));document.getElementById('acceptScenario')?.addEventListener('click',()=>{const x=calculateScenario();acceptOrder(x.prob)});document.getElementById('holdScenario')?.addEventListener('click',holdOrder);document.getElementById('saveScenario')?.addEventListener('click',()=>toast('Scenario saved — you can accept the order when ready.'));document.getElementById('rejectScenario')?.addEventListener('click',()=>toast('Cancelled — no changes were made.'))}

/* ---- Scenario comparison tables (cost vs revenue-protected) ----
   Illustrative demo economics. Revenue Protected = Order Value × improvement in
   on-time probability (spec §10); Net Impact = Revenue Protected − Additional Cost. */
const SO_VALUE = (typeof D!=='undefined' && D.orderFocus) ? D.orderFocus.value : 185000;
const SO_BASE_PROB = 61;
function revProtected(fromProb, toProb){ return Math.round(SO_VALUE*Math.max(0,(toProb-fromProb))/100); }
function revAtRisk(prob){ return Math.round(SO_VALUE*(100-prob)/100); }

/* Orders — Current Plan vs AI Recovery. extraCostUSD is the live scenario cost. */
function orderScenarioTable(planProb, extraCostUSD){
  const prot=revProtected(SO_BASE_PROB, planProb), net=prot-extraCostUSD;
  return `<div class="card panel" style="margin-top:14px"><div class="panel-head"><div><h3>Scenario comparison — cost vs revenue protected</h3><p>The trade-off in money, before you commit. Order value ${money(SO_VALUE)}.</p></div><span class="notice">Illustrative demo estimate</span></div>
    <div class="table-wrap"><table class="cmp-table"><thead><tr><th>Scenario</th><th>On-Time Probability</th><th>Extra Cost</th><th>Revenue Protected</th><th>Net Business Impact</th></tr></thead><tbody>
      <tr class="baseline"><td><span class="scn">Current Plan<small>Do nothing — accept as-is</small></span></td><td>${SO_BASE_PROB}%</td><td>${money(0)}</td><td class="muted-cell">—</td><td class="neg">${money(-revAtRisk(SO_BASE_PROB))} at risk</td></tr>
      <tr class="best"><td><span class="scn">AI Recovery<small>Reallocate L-03 + limited overtime + expedite material</small><span class="rec-tag">AI RECOMMENDED</span></span></td><td>${planProb}%</td><td>${money(extraCostUSD)}</td><td class="pos">${money(prot)}</td><td class="pos">${money(net)}</td></tr>
    </tbody></table></div>
    <p class="cmp-note">This action costs <b>${money(extraCostUSD)}</b> but protects <b>${money(prot)}</b> of revenue — a net gain of <b>${money(net)}</b>. Residual revenue at risk falls from ${money(revAtRisk(SO_BASE_PROB))} to ${money(revAtRisk(planProb))}.</p>
    <details class="cmp-note"><summary>🧮 Assumptions & calculation</summary><ul>
      <li>Revenue Protected = Order Value (${money(SO_VALUE)}) × improvement in on-time probability (${planProb-SO_BASE_PROB} pts) = ${money(prot)}</li>
      <li>Extra Cost = overtime hours × hourly rate + reallocation/changeover cost (from the simulator above)</li>
      <li>Net Business Impact = Revenue Protected − Extra Cost = ${money(prot)} − ${money(extraCostUSD)} = ${money(net)}</li>
    </ul></details></div>`;
}

/* Capacity — Scenario A/B/C/D with the full financial column set. */
function capacityScenarioTable(){
  const rows=[
    {k:'A',name:'Current Plan',note:'No intervention',prob:SO_BASE_PROB,cost:0,util:'94%',output:'Baseline'},
    {k:'B',name:'Overtime',note:'Add overtime on the constrained lines',prob:78,cost:4800,util:'91%',output:'+3%'},
    {k:'C',name:'Capacity Reallocation',note:'Move ~800 units L-07 → L-03',prob:84,cost:2300,util:'88%',output:'+2%'},
    {k:'D',name:'Combined AI Recommendation',note:'Reallocation + limited overtime + expedite material',prob:91,cost:6200,util:'88%',output:'+5%',rec:true}
  ].map(r=>{ r.prot=revProtected(SO_BASE_PROB,r.prob); r.net=r.prot-r.cost; return r; });
  const best=rows.reduce((a,b)=>b.net>a.net?b:a);
  return `<div class="card panel"><div class="panel-head"><div><h3>Scenario comparison — capacity plans for the constrained week</h3><p>Four ways to protect the at-risk delivery (flagship SO-10482, value ${money(SO_VALUE)}). Ranked by net financial impact.</p></div><span class="notice">Illustrative demo estimate</span></div>
    <div class="table-wrap"><table class="cmp-table"><thead><tr><th>Scenario</th><th>Expected Output</th><th>Delivery Probability</th><th>Additional Cost</th><th>Revenue Protected</th><th>Utilisation (L-07)</th><th>Net Financial Impact</th></tr></thead><tbody>
    ${rows.map(r=>`<tr class="${r.rec?'best':r.k==='A'?'baseline':''}"><td><span class="scn">Scenario ${r.k} — ${r.name}<small>${r.note}</small>${r.rec?'<span class="rec-tag">AI RECOMMENDED</span>':''}</span></td><td>${r.output}</td><td>${r.prob}%</td><td>${r.cost?money(r.cost):money(0)}</td><td class="${r.prot?'pos':'muted-cell'}">${r.prot?money(r.prot):'—'}</td><td>${r.util}</td><td class="${r.net>0?'pos':r.net<0?'neg':'muted-cell'}">${r.net?money(r.net):'—'}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="interpret"><b>✦ Recommended Plan: Scenario ${best.k} — ${best.name}.</b> Expected delivery improvement <b>+${best.prob-SO_BASE_PROB}%</b> (${SO_BASE_PROB}% → ${best.prob}%). Additional cost <b>${money(best.cost)}</b>, revenue protected <b>${money(best.prot)}</b> — estimated net benefit <b>${money(best.net)}</b>.</div>
    <details class="cmp-note"><summary>🧮 Assumptions & calculation</summary><ul>
      <li>Revenue Protected = Order Value (${money(SO_VALUE)}) × improvement in on-time probability</li>
      <li>Additional Cost = overtime hours × hourly rate + reallocation/changeover cost</li>
      <li>Net Financial Impact = Revenue Protected − Additional Cost</li>
      <li>Scenario D combines B + C, yielding the highest net impact while easing L-07 utilisation to 88%.</li>
    </ul></details></div>`;
}

/* Per-item financial figures for Decision Center priority cards (illustrative).
   Production: downtime cost = daily output shortfall × contribution/unit;
   recoverable share matches the 0.34 fraction used in lineDetailModal. */
const CONTRIB_PER_UNIT = 2; // illustrative $/unit contribution margin
function prodDowntimeCost(lineId){ const l=(typeof D!=='undefined')&&D.lines.find(x=>x.id===lineId); if(!l) return 0; return Math.max(0,(l.target-l.actual))*CONTRIB_PER_UNIT; }
function prodCostAvoided(lineId){ return Math.round(prodDowntimeCost(lineId)*0.34); }
/* Procurement: potential overpayment = (unit price − expected) × quantity. */
function poOverpayment(poId){ const p=(typeof D!=='undefined')&&D.procurement.find(x=>x.po===poId); if(!p) return 0; return Math.max(0,Math.round((p.price-p.expected)*p.quantity)); }

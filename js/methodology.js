/* ============================================================================
   Model methodology & the reusable "How is this calculated?" transparency modal
   ---------------------------------------------------------------------------- */

/* Plain-language, jargon-free explanation shown at the top of each model modal. */
const PLAIN = {
  delivery:'We look at six things about an order — how much material is ready, how busy the line is, the backlog ahead of it, how much time is left, how similar past orders did, and the order size. Each one nudges the odds up or down, and we add them into a single “% chance it ships on time.”',
  production:'We add up the delay coming from machine downtime, slowing output and queue pressure on a line, to estimate how many hours late it will run — and how likely a delay is at all.',
  anomaly:'We compare each purchase with what’s normal for that supplier and item. The more unusual it looks across several checks, the higher the “worth-a-look” score. A high score means investigate — not that anything is wrong.',
  forecast:'We follow the recent trend and project it forward, and draw a shaded band showing the realistic best-to-worst range instead of pretending we know the exact number.',
  capacity:'Given each line’s spare capacity and an overtime budget, we work out the best way to fit extra units in — and tell you exactly what’s stopping us from fitting more.'
};

/* Small inline button used next to any predicted number. */
function howBtn(modelKey, label='How is this calculated?', dark=false){
  return `<button class="pill-how ${dark?'on-dark':''}" data-how="${modelKey}">🧮 ${label}</button>`;
}

function cbar(v, scale){
  const w = Math.min(48, Math.abs(v)/scale*48);
  return `<div class="cbar"><span class="mid"></span><i class="${v<0?'neg':''}" style="${v<0?`right:50%;width:${w}%`:`left:50%;width:${w}%`}"></i></div>`;
}

function calcDelivery(r){
  r = r || ML.deliveryRisk({});
  const scale = Math.max(...r.drivers.map(d=>Math.abs(d.contribution)));
  const fmt = (f)=> f.unit==='%'? (f.raw*100).toFixed(0)+'%' : f.unit==='×'? f.raw.toFixed(2)+'×' : f.unit==='d'? f.raw+' d' : f.unit==='u'? f.raw.toLocaleString() : f.raw;
  const rows = r.drivers.map(f=>`<tr>
    <td>${f.label}<div style="color:#8a9a9a;font-size:9.5px">${f.help}</div></td>
    <td class="num">${fmt(f)}</td>
    <td class="num">${f.z>=0?'+':''}${f.z}</td>
    <td class="num">${f.weight}</td>
    <td class="num" style="color:${f.contribution<0?'#b45':'#268'}">${f.contribution>=0?'+':''}${f.contribution}</td>
    <td>${cbar(f.contribution,scale)}</td></tr>`).join('');
  return `<p>Each order feature is standardised to a <b>z-score</b> (how many standard deviations from the training-population mean), multiplied by its learned <b>coefficient</b> (log-odds weight), and summed with the intercept. The sum (the <b>logit</b>) passes through the <b>sigmoid</b> to give the probability of on-time delivery. This is the exact math — nothing is hardcoded.</p>
  <table class="calc-table"><thead><tr><th>Feature</th><th>Value</th><th>z-score</th><th>Coef.</th><th>Contribution</th><th>+ / −</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="formula">logit <span class="op">=</span> intercept <span class="op">+</span> Σ (coefᵢ <span class="op">×</span> zᵢ)<br>
  logit <span class="op">=</span> ${r.intercept} <span class="op">${r.drivers.map(d=>(d.contribution<0?'− ':'+ ')+Math.abs(d.contribution)).join(' ')}</span> <span class="op">=</span> <b>${r.logit}</b><br>
  P(on-time) <span class="op">=</span> sigmoid(${r.logit}) <span class="op">=</span> 1 / (1 + e^<span class="op">−</span>${r.logit}) <span class="op">=</span> <b>${(r.prob*100).toFixed(1)}%</b></div>
  <p class="badge sim">Simulation</p> <span style="font-size:11px;color:#6a7a7a">In production this is served by a versioned XGBoost model; the logistic form is shown here for full interpretability.</span>`;
}

function calcProduction(){
  const p = ML.productionDelay('L-07');
  const scale = Math.max(...p.drivers.map(d=>Math.abs(d.hours)))||1;
  const rows = p.drivers.map(d=>`<tr><td>${d.label}</td><td class="num">${d.raw}</td><td class="num">+${d.hours} h</td><td>${cbar(d.hours,scale)}</td></tr>`).join('');
  return `<p>Live JACK machine signals are summed into an expected <b>delay in hours</b> (gradient-boosted regression), then converted to a <b>probability</b> via a logistic flag. Both ship with the contributing signals.</p>
  <table class="calc-table"><thead><tr><th>Signal</th><th>Value</th><th>Δ hours</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  <div class="formula">predicted delay <span class="op">=</span> Σ signal contributions <span class="op">=</span> <b>${p.hours} h</b><br>P(delay) <span class="op">=</span> sigmoid((${p.hours} − 8.5) / 4.5) <span class="op">=</span> <b>${p.probPct}%</b></div>
  <p class="badge sim">Simulation</p> <span style="font-size:11px;color:#6a7a7a">Line L-07 · throughput decline ${p.decline}%.</span>`;
}

function calcAnomaly(){
  const a = ML.anomalyScore({});
  const rows = a.feats.map(f=>`<tr>
    <td>${f.label}<div style="color:#8a9a9a;font-size:9.5px">${f.help}</div></td>
    <td class="num">${f.z>=0?'+':''}${f.z}σ</td>
    <td class="num">${f.contribution}%</td>
    <td>${cbar(f.z, Math.max(...a.feats.map(x=>Math.abs(x.z))))}</td></tr>`).join('');
  return `<p>An <b>Isolation Forest</b> repeatedly splits the data at random. Unusual transactions get "isolated" in <b>few splits</b> → a <b>short average path length</b> → a high anomaly score. We ensemble it with per-feature <b>z-scores</b> so every alert carries human-readable evidence.</p>
  <table class="calc-table"><thead><tr><th>Feature</th><th>Deviation</th><th>Weight</th><th>Signal</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="formula">deviation d <span class="op">=</span> √( mean(zᵢ²) ) <span class="op">=</span> <b>${a.deviation}</b><br>
  avg. isolation path length <span class="op">=</span> <b>${a.avgPath}</b> <span class="op">(shorter = more anomalous)</span><br>
  anomaly score <span class="op">=</span> 100 <span class="op">×</span> (1 <span class="op">−</span> e^<span class="op">−</span>1.16·d) <span class="op">=</span> <b>${a.score} / 100</b></div>
  <div class="interpret"><b>An anomaly is not fraud.</b> It flags a transaction as statistically unusual and routes it to a human investigator with the evidence above.</div>`;
}

function calcForecast(){
  const f = ML.forecast(D.daily.delivery, 6);
  return `<p>A <b>Holt linear-trend</b> model tracks the series <b>level</b> and <b>trend</b> with exponential smoothing, then projects forward. The <b>95% confidence interval</b> widens with the horizon using the in-sample error (σ), so management sees a realistic range — not false precision.</p>
  <div class="formula">levelₜ <span class="op">=</span> α·yₜ <span class="op">+</span> (1−α)·(levelₜ₋₁ + trendₜ₋₁)<br>
  trendₜ <span class="op">=</span> β·(levelₜ − levelₜ₋₁) <span class="op">+</span> (1−β)·trendₜ₋₁<br>
  current level <span class="op">=</span> <b>${f.level}</b> · trend/step <span class="op">=</span> <b>${f.trend}</b> · σ <span class="op">=</span> <b>${f.sigma}</b><br>
  ŷₜ₊ₕ <span class="op">=</span> level + trend·h <span class="op">±</span> 1.96·σ·√h</div>
  <table class="calc-table"><thead><tr><th>Step ahead</th><th>Forecast</th><th>Lower 95%</th><th>Upper 95%</th></tr></thead><tbody>
  ${f.future.map((v,i)=>`<tr><td>+${i+1}</td><td class="num">${v}</td><td class="num">${f.lower[i]}</td><td class="num">${f.upper[i]}</td></tr>`).join('')}</tbody></table>
  <p><span class="mchip">Back-test MAPE <b>${f.mape}%</b></span> <span class="badge sim">Simulation</span></p>`;
}

function calcCapacity(){
  const c = ML.optimiseCapacity(5000,{overtimeHrs:8});
  return `<p>Capacity is a <b>constrained optimisation</b>, not a prediction. The solver places extra units to <b>maximise on-time delivery</b> subject to each line staying within its capacity and the overtime budget. It returns a feasible plan and the <b>binding constraint</b>.</p>
  <div class="formula"><b>maximise</b> Σ on-time_units<br>
  <b>subject to</b> utilisationₗ ≤ 100% <span class="op">∀ lines</span> · overtime ≤ budget · material available by date</div>
  <table class="calc-table"><thead><tr><th>Line</th><th>From util.</th><th>+ Units</th><th>To util.</th></tr></thead><tbody>
  ${c.plan.map(p=>`<tr><td>${p.id}</td><td class="num">${p.fromUtil}%</td><td class="num">+${p.addUnits.toLocaleString()}</td><td class="num">${p.toUtil}%</td></tr>`).join('')}</tbody></table>
  <div class="kv"><dt>Units placed</dt><dd>${c.placed.toLocaleString()} of 5,000</dd>
  <dt>Absorbed by overtime</dt><dd>${c.overtimeUnits.toLocaleString()}</dd>
  <dt>Feasible</dt><dd>${c.feasible?'Yes ✓':'No — capacity exceeded'}</dd>
  <dt>Binding constraint</dt><dd>${c.binding}</dd>
  <dt>Projected on-time</dt><dd>${c.projOnTime}%</dd></div>`;
}

const HOW_BODY = { delivery:calcDelivery, production:calcProduction, anomaly:calcAnomaly, forecast:calcForecast, capacity:calcCapacity };

function openHowModal(key, ctx){
  const m = ML.models[key]; if(!m) return;
  const t = m.training;
  const metrics = Object.entries(m.metrics).map(([k,v])=>`<span class="mchip">${k}<b>${v}</b></span>`).join('');
  document.getElementById('modal').innerHTML = `<div class="modal-content"><button class="close">×</button>
    <span class="label">Model transparency</span>
    <h2 style="margin:4px 0 2px">${m.name}</h2>
    <p style="color:#6a7a7a;font-size:12px;margin:0 0 4px">${m.task}</p>
    <div class="how-tabs">
      <button data-htab="algo" class="active">Algorithm</button>
      <button data-htab="calc">Live calculation</button>
      <button data-htab="train">Training &amp; validation</button>
    </div>
    <div class="how-panel active" data-hp="algo">
      ${PLAIN[key]?`<div class="plain">💡 <b>In plain terms:</b> ${PLAIN[key]}</div>`:''}
      <div class="kv"><dt>Algorithm</dt><dd>${m.algo}</dd><dt>Prediction target</dt><dd>${m.target}</dd><dt>Inference</dt><dd>${m.inference}</dd></div>
      <div class="interpret">${m.algoWhy}</div>
      ${m.oracle?`<div class="oracle-note"><span class="ora-chip">◆ ON-PREM · ORACLE-NATIVE</span> ${m.oracle}</div>`:''}
    </div>
    <div class="how-panel" data-hp="calc">${HOW_BODY[key] ? HOW_BODY[key](ctx) : ''}</div>
    <div class="how-panel" data-hp="train">
      <div class="kv"><dt>Training rows</dt><dd>${t.rows}</dd><dt>Features</dt><dd>${t.features}</dd>
      <dt>Train / val / test split</dt><dd>${t.split}</dd><dt>Validation</dt><dd>${t.cv}</dd><dt>Retrain policy</dt><dd>${t.retrain}</dd></div>
      <span class="label">Validation metrics</span><div class="metric-chips">${metrics}</div>
      <span class="label">How the model is trained</span>
      <div class="pipeline" style="margin-top:8px">
        ${['Ingest approved data','Engineer features','Train / benchmark','Time-series validation','Register versioned model','Serve via API + monitor'].map((s,i,a)=>`<div class="pipe-step"><div class="n">${i+1}</div><b>${s}</b></div>${i<a.length-1?'<span class="pipe-arrow">→</span>':''}`).join('')}
      </div>
      <p class="badge sim" style="margin-top:12px">Simulation</p> <span style="font-size:11px;color:#6a7a7a">Metrics shown are illustrative; production metrics are baselined during the Proof of Value on Shahkam’s data.</span>
    </div></div>`;
  openModal();
  document.querySelector('#modal .close').onclick = closeModal;
  document.querySelectorAll('#modal [data-htab]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#modal [data-htab]').forEach(x=>x.classList.toggle('active',x===b));
    document.querySelectorAll('#modal [data-hp]').forEach(p=>p.classList.toggle('active',p.dataset.hp===b.dataset.htab));
  });
}

document.addEventListener('click', e=>{
  const b = e.target.closest('[data-how]');
  if (b){ e.stopPropagation(); openHowModal(b.dataset.how); }
});

/* ======================= AI MODEL METHODOLOGY PAGE ======================= */
let methoChart1, methoChart2, methoState='delivery';

function methodologyPage(){
  const keys = Object.keys(ML.models);
  app.innerHTML = head('AI Models & Methodology','Exactly which algorithms produce each number, how they are trained, and how they are monitored','Under the hood')
  + `<div class="model-picker">${keys.map(k=>`<button class="model-pick ${k===methoState?'active':''}" data-model="${k}"><b>${ML.models[k].name}</b><small>${ML.models[k].algo.split('(')[0].trim()}</small></button>`).join('')}</div>
  <div id="methoBody"></div>`;
  bindCommon();
  document.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>{methoState=b.dataset.model;methodologyPage();});
  renderMethoBody();
}

function renderMethoBody(){
  const m = ML.models[methoState];
  const metrics = Object.entries(m.metrics).map(([k,v])=>`<span class="mchip">${k}<b>${v}</b></span>`).join('');
  document.getElementById('methoBody').innerHTML = `
  <div class="grid-2">
    <div class="card panel">
      <div class="panel-head"><div><h3>${m.name}</h3><p>${m.task}</p></div><span class="badge sim">Simulation</span></div>
      <div class="kv"><dt>Algorithm</dt><dd>${m.algo}</dd><dt>Target</dt><dd>${m.target}</dd><dt>Inference latency</dt><dd>${m.inference}</dd><dt>Retrain</dt><dd>${m.training.retrain}</dd></div>
      <div class="interpret">${m.algoWhy}</div>
      ${m.oracle?`<div class="oracle-note"><span class="ora-chip">◆ ON-PREM · ORACLE-NATIVE</span> ${m.oracle}</div>`:''}
      ${howBtn(methoState,'Show the live calculation')}
    </div>
    <div class="card panel">
      <h3>Validation metrics</h3>
      <div class="metric-chips">${metrics}</div>
      <div class="chart-wrap" style="height:210px"><canvas id="methoC1"></canvas></div>
    </div>
  </div>
  <div class="grid-2">
    <div class="card panel"><h3>${methoState==='delivery'?'Confusion matrix (held-out test)':methoState==='production'?'Predicted delay drivers (L-07)':methoState==='anomaly'?'Anomaly score distribution':methoState==='forecast'?'Forecast vs actual (back-test)':'Constraint utilisation'}</h3>
      <div id="methoAux"></div></div>
    <div class="card panel"><h3>Model drift monitoring</h3><p>Population Stability Index over the last 8 weeks. Retraining triggers when PSI &gt; 0.2.</p>
      <div class="chart-wrap" style="height:180px"><canvas id="methoC2"></canvas></div></div>
  </div>
  <div class="card panel" style="margin-top:14px"><h3>Training pipeline</h3><p>Reproducible, version-controlled path from approved data to a monitored production model.</p>
    <div class="pipeline" style="margin-top:10px">
      ${[['Ingest','Approved ERP / JACK / RFID data, validated & standardised'],['Feature engineering','Backlog, readiness, throughput, cycle-time, history — versioned'],['Baseline','Business rules & statistics to measure ML uplift against'],['Benchmark','Candidate algorithms, time-aware CV (no leakage)'],['Register','Approved model versioned with data + metrics lineage'],['Serve & monitor','Versioned API, drift & performance monitoring']]
      .map((s,i,a)=>`<div class="pipe-step"><div class="n">${i+1}</div><b>${s[0]}</b><p>${s[1]}</p></div>${i<a.length-1?'<span class="pipe-arrow">→</span>':''}`).join('')}
    </div>
  </div>`;
  drawMethoCharts();
}

function drawMethoCharts(){
  if(!window.Chart) return;
  methoChart1?.destroy(); methoChart2?.destroy();
  const c1 = document.getElementById('methoC1');
  if(methoState==='delivery'){
    const d = ML.deliveryRisk({}).drivers;
    methoChart1 = new Chart(c1,{type:'bar',data:{labels:d.map(x=>x.label),datasets:[{label:'Feature importance %',data:d.map(x=>x.pct),backgroundColor:'#0f766e'}]},options:barOpts('%','Feature importance (share of |contribution|)')});
  } else if(methoState==='production'){
    const rows=D.lines.map(l=>ML.productionDelay(l.id).hours);
    methoChart1 = new Chart(c1,{type:'bar',data:{labels:D.lines.map(l=>l.id),datasets:[{label:'Predicted delay (h)',data:rows,backgroundColor:rows.map(v=>v>=12?'#b84242':v>=6?'#c66b47':'#30877f')}]},options:barOpts('h','Predicted delay hours by line')});
  } else if(methoState==='anomaly'){
    methoChart1 = new Chart(c1,{type:'line',data:{labels:['Top 5','10','20','30','50','80','110'],datasets:[{label:'Precision @ K',data:[1,0.9,0.79,0.63,0.44,0.3,0.22],borderColor:'#0f766e',backgroundColor:'#0f766e18',fill:true,tension:.35}]},options:barOpts('','Precision @ Top-K flagged')});
  } else if(methoState==='forecast'){
    const f = ML.forecast(D.daily.delivery,6);
    const hist=D.daily.delivery;
    methoChart1 = new Chart(c1,{type:'line',data:{labels:[...hist.map((_,i)=>'d'+(i+1)),...f.future.map((_,i)=>'+' +(i+1))],datasets:[
      {label:'Actual',data:hist,borderColor:'#134f4c',pointRadius:1,borderWidth:2},
      {label:'Forecast',data:[...hist.map(()=>null),...f.future],borderColor:'#0f766e',borderDash:[5,4],pointRadius:1,borderWidth:2},
      {label:'Upper 95%',data:[...hist.map(()=>null),...f.upper],borderColor:'#8ccbc5',pointRadius:0,borderWidth:1},
      {label:'Lower 95%',data:[...hist.map(()=>null),...f.lower],borderColor:'#8ccbc5',pointRadius:0,borderWidth:1,fill:'-1',backgroundColor:'#8ccbc533'}]},options:barOpts('%','On-time delivery forecast with 95% CI')});
  } else {
    const rows=D.lines.map(l=>l.util);
    methoChart1 = new Chart(c1,{type:'bar',data:{labels:D.lines.map(l=>l.id),datasets:[{label:'Utilisation %',data:rows,backgroundColor:rows.map(v=>v>=95?'#b84242':v>=90?'#c66b47':'#30877f')}]},options:barOpts('%','Line utilisation vs 100% constraint')});
  }
  const c2=document.getElementById('methoC2');
  const psi={delivery:[.04,.05,.06,.05,.08,.09,.11,.10],production:[.05,.06,.08,.07,.09,.10,.12,.11],anomaly:[.06,.07,.05,.08,.09,.12,.14,.13],forecast:[.03,.04,.03,.05,.04,.06,.07,.06],capacity:[.02,.03,.02,.03,.04,.03,.05,.04]}[methoState];
  methoChart2=new Chart(c2,{type:'line',data:{labels:['w1','w2','w3','w4','w5','w6','w7','w8'],datasets:[
    {label:'PSI',data:psi,borderColor:'#0f766e',backgroundColor:'#0f766e18',fill:true,tension:.3,borderWidth:2},
    {label:'Retrain threshold',data:Array(8).fill(.2),borderColor:'#c9736f',borderDash:[5,4],pointRadius:0,borderWidth:1.2}]},options:barOpts('','',true)});
  const aux=document.getElementById('methoAux');
  if(methoState==='delivery'){
    aux.innerHTML=`<div class="confusion">
      <div></div><div class="cf-lbl">Pred. On-time</div><div class="cf-lbl">Pred. Late</div>
      <div class="cf-lbl">Actual On-time</div><div class="cf tp">412<small>True on-time</small></div><div class="cf fn">57<small>Missed late</small></div>
      <div class="cf-lbl">Actual Late</div><div class="cf fp">54<small>False alert</small></div><div class="cf tn">159<small>Caught late</small></div>
    </div><p style="font-size:11px;color:#6a7a7a;margin-top:12px">Recall on late orders <b>73.6%</b> — the model catches most delivery risks early. Threshold is tuned for business cost of a missed late order vs a false alert.</p>`;
  } else if(methoState==='production'){
    const p=ML.productionDelay('L-07');
    aux.innerHTML=`<div class="metric-chips"><span class="mchip">L-07 delay<b>${p.hours} h</b></span><span class="mchip">P(delay)<b>${p.probPct}%</b></span></div>`+p.drivers.map(d=>`<div class="driver-row"><span>${d.label} <b>${d.pct}%</b></span><div class="bar"><i style="width:${Math.min(100,d.pct*2.5)}%"></i></div></div>`).join('')+`<p style="font-size:11px;color:#6a7a7a">Additive signal contributions to the predicted delay — sourced live from JACK.</p>`;
  } else if(methoState==='anomaly'){
    aux.innerHTML=`<div class="chart-wrap" style="height:180px"><canvas id="methoAuxC"></canvas></div>`;
    const ac=document.getElementById('methoAuxC');
    new Chart(ac,{type:'bar',data:{labels:['0-20','20-40','40-60','60-80','80-100'],datasets:[{label:'Transactions',data:[62,24,14,6,4],backgroundColor:['#cfe6e2','#8ccbc5','#4fa89f','#c66b47','#b84242']}]},options:barOpts('','Anomaly score distribution (110 txns)')});
  } else if(methoState==='forecast'){
    aux.innerHTML=`<div class="metric-chips"><span class="mchip">MAPE<b>4.2%</b></span><span class="mchip">MAE<b>3.1K</b></span><span class="mchip">RMSE<b>4.4K</b></span><span class="mchip">CI coverage<b>94%</b></span></div><p style="font-size:11px;color:#6a7a7a">Back-tested on rolling 30-day origins. Coverage near 95% confirms the confidence bands are well-calibrated.</p>`;
  } else {
    const c=ML.optimiseCapacity(5000,{overtimeHrs:8});
    aux.innerHTML=`<div class="kv"><dt>Objective</dt><dd>Max on-time units</dd><dt>Units placed</dt><dd>${c.placed.toLocaleString()}/5,000</dd><dt>Feasible</dt><dd>${c.feasible?'Yes':'No'}</dd><dt>Binding constraint</dt><dd>${c.binding}</dd><dt>Projected on-time</dt><dd>${c.projOnTime}%</dd></div><p style="font-size:11px;color:#6a7a7a">Solver output — a feasible allocation, not a black-box prediction.</p>`;
  }
}

function barOpts(unit='', title='', small=false){
  return {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:small||false,labels:{boxWidth:8,font:{size:9}}},title:{display:!!title,text:title,font:{size:10},color:'#6a7a7a'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}${unit}`}}},scales:{x:{grid:{display:false},ticks:{font:{size:9}}},y:{grid:{color:'#eef2f2'},ticks:{font:{size:9},callback:v=>v+unit}}}};
}

/* ============================================================================
   Core AI Intelligence modules — one tab each for ML, Forecasting, Anomaly
   Detection and Optimisation. Every page shows the SAME journey:
   raw source data (as received from Oracle / JACK)  →  engineered features
   →  the exact calculation  →  the AI output and what it means.
   ========================================================================== */

function stage(n, label){ return `<span class="module-stage"><span class="n">${n}</span>${label}</span>`; }
function connector(text){ return `<div class="flow-connector">${text} <span class="fc-arrow">↓</span></div>`; }

/* Grid of raw records. cols = [[key,label,tooltip], ...] */
function rawGrid(source, srcClass, title, note, rows, cols){
  return `<div class="card panel"><div class="panel-head"><div><h3>${title}</h3><p>${note}</p></div><span class="src-chip ${srcClass}">SOURCE · ${source}</span></div>
  <div class="table-wrap"><table class="data-table"><thead><tr>${cols.map(c=>`<th title="${c[2]||''}">${c[1]}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c[0]]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <p style="font-size:10.5px;color:#8a9a9a;margin-top:8px">These are the raw values as received — no AI applied yet. Hover a column heading for its definition.</p></div>`;
}

/* ---------------------------- ML MODELS ---------------------------------- */
const ML_FEATURE_SRC = {
  material:'Material 18,500 / 25,000 confirmed (ERP)',
  capacity:'Line L-07 utilisation 96% (JACK)',
  backlog:'Line L-07 backlog 82,000 units (JACK)',
  buffer:'Projected completion 21 Sep vs 18 Sep (Planning)',
  history:'Similar orders 12 of 17 on-time (ERP)',
  size:'Order quantity 25,000 (ERP)'
};
function mlModule(){
  const f = FLAGSHIP;
  const featRows = f.drivers.map(d=>`<tr><td><b>${d.label}</b></td><td style="color:#6a7a7a">${ML_FEATURE_SRC[d.id]||''}</td><td class="num">${d.unit==='%'?(d.raw*100).toFixed(0)+'%':d.unit==='×'?d.raw.toFixed(2)+'×':d.unit==='d'?d.raw+' d':d.raw.toLocaleString()}</td><td class="num">${d.z>=0?'+':''}${d.z}</td></tr>`).join('');
  app.innerHTML = head('Machine Learning — Prediction Models','How raw ERP & JACK records become an explainable on-time prediction','AI intelligence · ML')
  + stage(1,'RAW DATA FROM SOURCE SYSTEMS')
  + rawGrid('Oracle ERP','','Order master records (as received)','Exactly what the platform reads from the ERP for open orders.',
      D.orders.slice(0,8),
      [['id','Order ID','Unique order number from ERP'],['customer','Customer','Customer master record'],['style','Style','Product / style code'],['quantity','Qty','Ordered quantity (units)'],['orderDate','Order date','Date the order was booked'],['required','Required','Customer required delivery date'],['material','Material','Material readiness status'],['line','Line','Assigned production line(s)']])
  + connector('Engineered into 6 standardised AI features')
  + `<div class="grid-2"><div class="card panel"><div class="panel-head"><div><h3>Feature engineering — raw record → AI signals</h3><p>Order <b>SO-10482</b>: each raw field becomes a model input.</p></div><span class="badge">Feature layer v3</span></div>
      <div class="table-wrap"><table class="calc-table"><thead><tr><th>AI feature</th><th>From raw source</th><th>Value</th><th>Std (z)</th></tr></thead><tbody>${featRows}</tbody></table></div></div>
    <div class="meaning"><small style="color:#bfe9e3">AI OUTPUT · SO-10482</small><h2>${f.probPct}%</h2><span class="risk-pill">${f.risk} RISK</span><p><b>What it means:</b> this order has a ${f.probPct}% chance of shipping on time. The largest drag is ${f.drivers[0].label.toLowerCase()} (${f.drivers[0].pct}% of the risk score). Projected <b>${Math.abs(f.context.buffer)} days late</b> — commit only with a mitigation.</p><div style="margin-top:10px">${howBtn('delivery','See the exact logistic maths',true)}</div></div></div>`
  + connector('Now try the model live on a new order')
  + `<div class="card panel"><div class="panel-head"><div><h3>New-order feasibility — interactive</h3><p>Change any input; the model re-scores instantly from the features above.</p></div><span class="badge sim">Live model</span></div><div class="scenario-grid"><div class="control-panel" style="padding:2px"><div class="control"><label>Quantity <b id="fq">25,000</b></label><input type="range" id="feasQty" min="2000" max="60000" step="1000" value="25000"></div><div class="control"><label>Required in <b id="fd">23 days</b></label><input type="range" id="feasDays" min="7" max="60" value="23"></div><div class="control"><label>Material readiness <b id="fm">74%</b></label><input type="range" id="feasMat" min="30" max="100" value="74"></div><div class="control"><label>Similar-order on-time <b id="fh">71%</b></label><input type="range" id="feasHist" min="50" max="99" value="71"></div><div class="control"><label>Assigned line</label><select class="input" id="feasLine">${D.lines.map(l=>`<option ${l.id==='L-07'?'selected':''}>${l.id}</option>`).join('')}</select></div></div><div class="decision-hero" id="feasResult" style="margin:0;grid-template-columns:minmax(240px,1fr) minmax(240px,1.1fr)"></div></div></div>`
  + `<div class="card panel" style="margin-top:14px"><h3>Production Delay model — the second ML model</h3><p>A gradient-boosted model turns live JACK signals into a predicted delay for each line.</p>${prodDelayBlock()}</div>`;
  bindCommon(); bindFeas();
}
function prodDelayBlock(){
  const p = ML.productionDelay('L-07');
  const rows = D.lines.map(l=>{const pd=ML.productionDelay(l.id);return `<tr><td>${l.id}</td><td class="num">${l.downtime} h</td><td class="num">${Math.round((l.target-l.actual)/l.target*100)}%</td><td class="num">${(l.backlog/1000).toFixed(0)}K</td><td class="num"><b>${pd.hours} h</b></td><td>${pd.probPct>=60?'<span class="risk-pill risk-high">'+pd.probPct+'%</span>':pd.probPct>=35?'<span class="risk-pill risk-med">'+pd.probPct+'%</span>':'<span class="risk-pill risk-low">'+pd.probPct+'%</span>'}</td></tr>`;}).join('');
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th title="Production line">Line</th><th title="Recent machine downtime from JACK">Downtime (raw JACK)</th><th title="Target minus actual throughput">Throughput gap</th><th title="Queued units">Backlog</th><th title="Model output">Predicted delay</th><th title="Probability of a delay">P(delay)</th></tr></thead><tbody>${rows}</tbody></table></div><div class="button-row">${howBtn('production','How the delay is calculated')}</div>`;
}

/* ---------------------------- FORECASTING -------------------------------- */
let fcState='delivery';
function forecastingModule(){
  const rows = D.daily.delivery.map((_,i)=>`<tr><td>Day ${i+1}</td><td class="num">${D.daily.delivery[i]}%</td><td class="num">${D.daily.throughput[i]}K</td><td class="num">${D.daily.backlog[i]}K</td><td class="num">$${D.daily.risk[i]}M</td></tr>`).join('');
  app.innerHTML = head('Forecasting','How historical time-series become a forward projection with an honest confidence band','AI intelligence · Forecasting')
  + stage(1,'RAW TIME-SERIES FROM SOURCE SYSTEMS')
  + `<div class="card panel"><div class="panel-head"><div><h3>Daily operational history (as received)</h3><p>15 days of raw daily readings — the input to the forecast.</p></div><span class="src-chip jack">SOURCE · JACK + ERP</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th title="Observation day">Day</th><th title="On-time delivery % (ERP)">On-time %</th><th title="Weekly throughput K units (JACK)">Throughput</th><th title="Backlog K units (JACK)">Backlog</th><th title="Value at risk $M (ERP)">Value at risk</th></tr></thead><tbody>${rows}</tbody></table></div></div>`
  + connector('Decomposed into level + trend, then projected 8 steps with a 95% band')
  + `<div class="card panel"><div class="panel-head"><div><h3>Forecast — interactive</h3><p>Holt linear-trend model. Switch the series; the shaded band is the 95% confidence interval.</p></div><div class="tabs" id="forecastTabs"><button class="active" data-chart="delivery">Delivery</button><button data-chart="throughput">Throughput</button><button data-chart="backlog">Backlog</button><button data-chart="risk">Value at risk</button></div></div>${chartCanvas()}<div class="button-row"><span class="mchip">Back-test MAPE <b id="fmape">4.2%</b></span><span class="mchip">30-day point <b id="flevel">—</b></span>${howBtn('forecast','How the forecast is made')}</div></div>`
  + `<div class="grid-2"><div class="card panel"><h3>How the value is calculated</h3>${calcForecast()}</div>
     <div class="meaning"><small style="color:#bfe9e3">AI OUTPUT · 30-day outlook</small><h2>87.8%</h2><p><b>What it means:</b> on-time delivery is trending down and is projected at ~87.8% in 30 days, with a realistic range shown by the band. That early warning is the point — it gives planning time to intervene before orders slip.</p></div></div>`;
  makeForecastChart('delivery'); bindCommon();
  document.querySelectorAll('#forecastTabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#forecastTabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');makeForecastChart(b.dataset.chart)});
}

/* ------------------------- ANOMALY DETECTION ----------------------------- */
let anomChart;
function anomalyModule(){
  const a = ML.anomalyScore({});
  app.innerHTML = head('Anomaly Detection','How raw procurement transactions are scored for “worth-a-look” — never accused','AI intelligence · Anomaly')
  + stage(1,'RAW TRANSACTIONS FROM SOURCE SYSTEM')
  + rawGrid('Oracle ERP · Procurement','','Purchase transactions (as received)','Raw PO lines. Click any row to see how the model scores it.',
      D.procurement.slice(0,10),
      [['po','PO Number','Purchase order number'],['supplier','Supplier','Supplier master'],['material','Material','Material purchased'],['quantity','Qty','Quantity ordered'],['price','Unit price','Actual unit price paid'],['expected','Expected','Supplier historical average price'],['variance','Variance %','Price vs expected']])
  + connector('Each transaction scored by an Isolation Forest + z-score ensemble')
  + `<div class="grid-2"><div class="card panel"><h3>How the score is calculated — PO-48291</h3>${calcAnomaly()}</div>
     <div><div class="meaning"><small style="color:#bfe9e3">AI OUTPUT · PO-48291</small><h2>${a.score}<span style="font-size:16px">/100</span></h2><span class="risk-pill">${a.status}</span><p><b>What it means:</b> this purchase looks statistically unusual across price, quantity and frequency — worth a human review within 48 h. <b>An anomaly is not fraud.</b></p></div>
     <div class="card panel" style="margin-top:14px"><h3>Score distribution (110 transactions)</h3><div class="chart-wrap" style="height:180px"><canvas id="anomC"></canvas></div></div></div></div>`;
  bindCommon();
  document.querySelectorAll('#app .data-table tbody tr').forEach((r,i)=>r.onclick=()=>procModal(D.procurement[i]));
  if(window.Chart){ anomChart?.destroy(); anomChart=new Chart(document.getElementById('anomC'),{type:'bar',data:{labels:['0-20','20-40','40-60','60-80','80-100'],datasets:[{label:'Transactions',data:[62,24,14,6,4],backgroundColor:['#cfe6e2','#8ccbc5','#4fa89f','#c66b47','#b84242']}]},options:barOpts('','Most transactions are normal; a few stand out')}); }
}

/* ---------------------------- OPTIMISATION ------------------------------- */
function optimisationModule(){
  const lineRows = D.lines.map(l=>`<tr><td>${l.id}</td><td class="num">${(l.target/1000).toFixed(0)}K</td><td class="num">${(l.actual/1000).toFixed(0)}K</td><td class="num">${l.util}%</td><td class="num">${l.downtime} h</td><td class="num">${(l.backlog/1000).toFixed(0)}K</td><td class="num">${Math.max(0,Math.round((100-l.util)/100*l.target/1000))}K</td></tr>`).join('');
  app.innerHTML = head('Optimisation','How live capacity constraints become the best feasible allocation — not a guess','AI intelligence · Optimisation')
  + stage(1,'RAW CAPACITY DATA FROM SOURCE SYSTEM')
  + `<div class="card panel"><div class="panel-head"><div><h3>Production line status (as received)</h3><p>Live utilisation and backlog per line — the constraints the solver works within.</p></div><span class="src-chip jack">SOURCE · JACK</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th title="Production line">Line</th><th title="Weekly target units">Target</th><th title="Weekly actual units">Actual</th><th title="Utilisation %">Util.</th><th title="Recent downtime">Downtime</th><th title="Queued units">Backlog</th><th title="Computed spare capacity">Spare (derived)</th></tr></thead><tbody>${lineRows}</tbody></table></div></div>`
  + connector('Fed as constraints into a linear-programming solver')
  + `<div class="card panel"><div class="panel-head"><div><h3>Order-acceptance optimiser — interactive</h3><p>Ask “can we place N extra units?” The solver maximises on-time delivery within capacity + overtime limits.</p></div><span class="badge sim">Solver</span></div><div class="control"><label>Extra units to place <b id="optVal">5,000</b></label><input type="range" id="optUnits" min="1000" max="30000" step="1000" value="5000"></div><div class="control"><label>Overtime budget <b id="otVal">8 hrs</b></label><input type="range" id="optOt" min="0" max="24" value="8"></div><div id="optResult"></div><div class="button-row">${howBtn('capacity','How the solver works')}</div></div>`
  + `<div class="grid-2"><div class="card panel"><h3>How the allocation is computed</h3>${calcCapacity()}</div>
     <div class="meaning"><small style="color:#bfe9e3">AI OUTPUT · objective</small><h2>Max on-time</h2><p><b>What it means:</b> the solver returns a concrete, feasible plan — which lines take how many units — plus the <b>binding constraint</b> that limits further intake. It’s optimisation, not a prediction: the answer is auditable.</p></div></div>`;
  bindCommon(); bindCapacityOpt();
}

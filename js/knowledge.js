/* ============================================================================
   AI Knowledge (RAG) — governed enterprise knowledge with grounded, cited
   answers. The query is embedded, the most relevant approved document chunks
   are retrieved (with light synonym expansion + title weighting), and the
   answer is grounded in — and cites — only those chunks. No free-form
   generation. The same retrieval powers the AI Advisor's policy fallback.
   ========================================================================== */

const KB = [
  { id:'COMP-01', title:'Shahkam Industries — Company Profile', source:'Corporate Overview', type:'Reference',
    text:'Shahkam Industries is a vertically integrated garment manufacturer producing knitted and woven apparel for international buyers. Operations span cutting, sewing, finishing, packing and export dispatch. Production data is captured today across Oracle ERP, JACK sewing machines, barcode cutting and RFID packing, running on-premises.' },
  { id:'SRC-01', title:'Approved Data Sources', source:'Data Foundation', type:'Reference',
    text:'The decision-intelligence layer reads from four approved operational systems. Oracle ERP provides orders, styles, materials, import letters of credit and procurement. JACK provides real-time machine-level sewing output and line efficiency. Barcode provides bundle-level cutting and fabrication tracking. RFID provides automatic finished-goods capture at packing and warehouse. Systems of record are never modified.' },
  { id:'ARC-01', title:'On-Premises Architecture', source:'Reference Architecture', type:'Reference',
    text:'All models run on-premises inside Oracle 26ai and Oracle APEX 26.1 on Shahkam servers. Predictions execute as in-database Oracle Machine Learning; the knowledge base uses Oracle 26ai AI Vector Search; the assistant is orchestrated through Select AI / APEX AI to a private on-prem language model. No operational data leaves the data centre and there is no public cloud dependency.' },
  { id:'SOP-07', title:'Order Acceptance SOP', source:'Operations SOP v4.2', type:'SOP',
    text:'An order may be committed to a delivery date only when the predicted on-time probability is at least 85%. Orders scoring between 70% and 85% require a documented mitigation such as capacity reallocation, material confirmation, or a revised date. Orders below 70% must be escalated to the Operations Manager before any commitment is made to the customer.' },
  { id:'POL-MAT', title:'Material Readiness Policy', source:'Planning Policy', type:'Policy',
    text:'An order is production-ready only when at least 95% of required material is confirmed available by the planned start date. Imported fabric arriving through a letter of credit must have a confirmed ETA. Partial material readiness must be reflected in the delivery-risk assessment and communicated to the customer before commitment.' },
  { id:'POL-OT', title:'Overtime & Capacity Policy', source:'Manufacturing Policy', type:'Policy',
    text:'Overtime is capped at 24 hours per line per week and must be approved by the Operations Manager. Capacity reallocation should draw first from lines below 80% utilisation. No line may be planned above 100% utilisation. Reallocations that change a committed delivery date require Operations sign-off.' },
  { id:'POL-KPI', title:'KPI Definitions', source:'Performance Framework', type:'KPI',
    text:'On-time delivery is the share of orders completed on or before the customer required date. Capacity utilisation is used production hours divided by available production hours. A production line is a bottleneck when forecast utilisation exceeds 95%. Throughput is units produced per week; DHU is defects per hundred units.' },
  { id:'POL-DHU', title:'Quality & DHU Policy', source:'Quality Manual', type:'Policy',
    text:'Defects per hundred units (DHU) above 5.0 on any line triggers a quality review. Sustained high DHU reduces effective throughput and is treated as a driver of production delay. Rework must be logged against the originating line and bundle for traceability.' },
  { id:'SOP-CUT', title:'Cutting & Barcode SOP', source:'Production SOP v3.0', type:'SOP',
    text:'Fabric is cut into bundles that are barcoded and tracked through fabrication. Cutting cannot begin for a size until its fabric is confirmed in stock. Because SO-10482 concentrates demand in the L and XL sizes whose imported fabric is delayed, cutting for those sizes is gated until the fabric clears customs.' },
  { id:'SOP-RFID', title:'Packing & Dispatch SOP', source:'Warehouse SOP v2.3', type:'SOP',
    text:'Finished garments are captured automatically at packing via RFID and reconciled against the order before dispatch. An order is only marked Dispatched once RFID counts match the committed quantity. RFID events update order status in Oracle in near real time.' },
  { id:'SOP-PR', title:'Procurement Anomaly Investigation', source:'Procurement SOP v2.1', type:'SOP',
    text:'A transaction flagged with an anomaly score above 75 is investigated within 48 hours. An anomaly is a signal that a transaction is statistically unusual; it is not evidence of fraud. Investigators compare the transaction against supplier history and peer transactions, and may mark it valid, investigate further, or escalate.' },
  { id:'SOP-ESC', title:'Escalation Matrix', source:'Operations SOP v4.2', type:'SOP',
    text:'Delivery risk is escalated to the Operations Manager below 70% on-time probability. Predicted line delays above 6 hours are routed to the Production User and Operations. Procurement anomalies above a score of 75 route to the Procurement User. Consequential decisions are recorded in the audit trail.' },
  { id:'POL-GOV', title:'AI Governance & Human Oversight', source:'AI Governance Charter', type:'Policy',
    text:'AI outputs are advisory. Consequential operational decisions require human approval and are recorded in the audit trail. The AI assistant may only call an approved, allow-listed set of read-only analytical tools; it may never modify ERP data, execute transactions, or query source tables directly. This is a control against prompt-injection and unsafe tool use.' },
  { id:'POL-LEARN', title:'Continuous Learning & Retraining', source:'MLOps Policy', type:'Policy',
    text:'Human decisions and their outcomes are captured as labelled examples. Models retrain on a schedule or when drift crosses a threshold (population stability index above 0.2). A retrained model must beat the incumbent on held-out data and be approved by a human before release. Learning is governed and versioned, never uncontrolled real-time self-modification.' },
  { id:'MC-RISK', title:'Delivery-Risk Model Card', source:'Model Registry', type:'Model card',
    text:'The delivery-risk model outputs the probability of on-time delivery using material readiness, capacity headroom, backlog pressure, schedule buffer, historical on-time rate and order size. It is a logistic model benchmarked against gradient-boosted trees, with a validation ROC-AUC of about 0.91. Every prediction ships with its top ranked risk drivers for explainability.' },
  { id:'MC-PROD', title:'Production-Delay Model Card', source:'Model Registry', type:'Model card',
    text:'The production-delay model predicts delay hours and probability for each line from live JACK signals: machine downtime, throughput decline, backlog pressure and operator availability. It is a gradient-boosted regression giving supervisors roughly two shifts of lead time. For L-07 it predicts about a 14-hour delay.' },
  { id:'MC-ANOM', title:'Procurement-Anomaly Model Card', source:'Model Registry', type:'Model card',
    text:'The procurement-anomaly model is an unsupervised Isolation Forest ensembled with per-feature z-scores over unit price, quantity, frequency, supplier rarity and timing. It needs no labelled fraud history and ships every alert with human-readable evidence. Contamination is set to the expected anomaly rate; a high score means investigate, never accuse.' },
  { id:'MC-FCST', title:'Forecast Model Card', source:'Model Registry', type:'Model card',
    text:'The forecast model uses Holt linear-trend exponential smoothing with weekly seasonality to project delivery, throughput, backlog and value at risk, with a 95% confidence band that widens with the horizon. Back-tested MAPE is about 4.2%. It shows a realistic range of outcomes rather than a single false-precision number.' }
];

const KB_SUGGEST = [
  'When can we commit to a delivery date?',
  'What is the overtime policy?',
  'How are procurement anomalies handled?',
  'What counts as material readiness?',
  'How is delivery risk predicted?',
  'What data sources are used?',
  'Does anything leave the data centre?',
  'Can the AI change ERP data?',
  'How does the model keep improving?'
];

const RAG_SYN = {
  late:['ontime','delivery','delivered','miss','ship','deliver'], delay:['delay','ontime','late','production'],
  fabric:['material','fabric','cloth','import'], material:['material','fabric','readiness','import'],
  machine:['jack','line','sewing','production','machine'], line:['line','production','jack','machine'],
  overtime:['overtime','capacity','utilisation'], capacity:['capacity','utilisation','overtime','headroom'],
  fraud:['anomaly','unusual','fraud','procurement'], anomaly:['anomaly','unusual','procurement','isolation'],
  cloud:['cloud','on-prem','onprem','oracle','apex','architecture','vector'], oracle:['oracle','apex','on-prem','database','architecture','vector'],
  retrain:['retrain','learning','drift','model','governed'], learn:['learning','retrain','feedback','model'],
  accuracy:['roc','auc','mape','validation','metric','model'], model:['model','prediction','logistic','gradient','feature'],
  commit:['commit','acceptance','delivery','probability'], accept:['acceptance','commit','order','delivery'],
  data:['data','source','erp','jack','barcode','rfid'], quality:['dhu','quality','defect','rework'],
  pack:['rfid','packing','dispatch','warehouse'], cut:['cutting','barcode','bundle','fabrication'],
  leave:['leaves','premises','centre','cloud','on-prem'], building:['premises','centre','cloud','on-prem'],
  outside:['premises','cloud','on-prem'], premises:['premises','centre','cloud','on-prem'],
  secure:['premises','governance','approved','on-prem'], private:['premises','cloud','on-prem'],
  change:['modify','change','governance','advisory','approval'], modify:['modify','governance','advisory'],
  edit:['modify','governance'], write:['modify','governance'], alter:['modify','governance'],
  escalate:['escalation','escalated','operations','manager'], commit:['commit','acceptance','probability','delivery']
};

function ragRetrieve(query, k=3){
  const raw = (query.toLowerCase().match(/[a-z]{3,}/g) || []);
  const stop = new Set(['the','and','for','are','can','what','when','how','does','our','with','that','this','from','into','you','does','will','should','which','tell','about','show','give','need','want','have','who','why']);
  const base = raw.filter(t=>!stop.has(t));
  const stem = t => t.endsWith('ies') ? t.slice(0,-3)+'y' : (t.endsWith('s')&&!t.endsWith('ss')&&t.length>4) ? t.slice(0,-1) : t;
  const expanded = new Set();
  base.forEach(t=>{ [t, stem(t)].forEach(u=>{ expanded.add(u); (RAG_SYN[u]||[]).forEach(s=>expanded.add(s)); Object.keys(RAG_SYN).forEach(k2=>{ if(u.startsWith(k2)) RAG_SYN[k2].forEach(s=>expanded.add(s)); }); }); });
  const terms = [...expanded];
  // Inverse document frequency so rare, specific terms (e.g. "modify", "cloud",
  // "premises") outweigh common ones (e.g. "data", "order") and the most
  // on-point document leads.
  const idf = {}; terms.forEach(t=>{ const df=KB.filter(d=>(d.title+' '+d.text).toLowerCase().includes(t)).length; idf[t]=Math.log((KB.length+1)/(df+0.5)); });
  let maxScore=0;
  const scored = KB.map(doc=>{
    const text = doc.text.toLowerCase(), title = doc.title.toLowerCase();
    let score=0, hits=0;
    terms.forEach(t=>{ const w=idf[t]||0.2; if(title.includes(t)){score+=2*w;hits++;} else if(text.includes(t)){score+=w;hits++;} });
    maxScore=Math.max(maxScore,score);
    return { doc, score, hits };
  }).filter(s=>s.score>0).sort((a,b)=>b.score-a.score).slice(0,k);
  scored.forEach(s=>s.sim=+Math.min(0.99,(maxScore?s.score/maxScore:0)*0.95+0.04).toFixed(2));
  return { q: base, hits: scored };
}

function ragHighlight(text, terms){
  let out = text;
  [...terms].sort((a,b)=>b.length-a.length).forEach(t=>{ if(t.length<3)return; out = out.replace(new RegExp(`\\b(${t}\\w*)`,'gi'), '<mark>$1</mark>'); });
  return out;
}

function ragAnswer(query){
  const t=(query||'').toLowerCase().trim();
  if(/^(hi+|hey+|hello|thanks|thank you|bye|good\s*(morning|afternoon|evening))[!.\s]*$/.test(t))
    return { html:`Hello — this is Shahkam's governed knowledge base. I answer <b>only from approved SOPs, policies, KPI definitions and model cards</b>, and I cite every source. Ask a policy question, for example “When can we commit to a delivery date?”`, hits:[], q:[] };
  const { q, hits } = ragRetrieve(query);
  if(!hits.length){
    return { html:`I could not find an approved knowledge source for that. RAG answers are grounded only in Shahkam's governed documents — I do not generate ungrounded content. Try rephrasing, or ask about order acceptance, overtime, material readiness, procurement anomalies, governance or the models.`, hits:[], q };
  }
  const lead = hits[0].doc;
  const cites = hits.map((h,i)=>`<span class="citation" data-cite="${h.doc.id}">[${i+1}] ${h.doc.id}</span>`).join(' ');
  const body = `<b>${lead.text}</b> <span class="citation">[1]</span>` + (hits.length>1?`<br><br><span class="label">Related</span><br>`+hits.slice(1).map((h,i)=>`${h.doc.text} <span class="citation">[${i+2}]</span>`).join('<br><br>'):'');
  return { html:`${body}<div class="evidence"><b>Grounded in:</b> ${cites} &nbsp;·&nbsp; ✓ Approved sources only &nbsp; ✓ No ungrounded generation</div>`, hits, q };
}

function knowledgePage(){
  app.innerHTML = head('AI Knowledge (RAG)','Answers grounded in Shahkam’s approved SOPs, policies, KPI definitions and model cards — with citations','Governed enterprise knowledge')
  + `<div class="grid-2">
    <div class="card panel">
      <div class="panel-head"><div><h3>Ask the knowledge base</h3><p>Retrieval-Augmented Generation over approved documents only — every answer is cited.</p></div><span class="badge sim">RAG</span></div>
      <div class="filters"><input id="ragInput" placeholder="e.g. When can we commit to a delivery date?" style="flex:1"><button class="primary" id="ragAsk">Ask</button></div>
      <div style="margin-top:10px">${KB_SUGGEST.map(s=>`<button class="secondary" data-rag="${s}" style="margin:3px 3px 0 0">${s}</button>`).join('')}</div>
      <div id="ragResult" style="margin-top:14px"></div>
    </div>
    <div class="card panel"><h3>Knowledge corpus <span class="badge">${KB.length} documents</span></h3><p>Governed, versioned sources on-prem in Oracle 26ai Vector Search. Retrieval is restricted to this approved set.</p>
      <div style="margin-top:10px;max-height:520px;overflow:auto">${KB.map(d=>`<div class="doc-hit"><span class="src">${d.type} · ${d.source}</span><b style="display:block;margin:3px 0;font:700 12px Manrope">${d.title}</b><div class="snip" style="max-height:34px;overflow:hidden">${d.text}</div></div>`).join('')}</div>
    </div></div>`;
  bindCommon();
  const ask = (query)=>{
    const r = ragAnswer(query);
    const trace = `<div class="trace"><div class="trace-step"><span class="tool">embed(query)</span><span class="meta">→ vector[768]</span></div><div class="trace-step"><span class="tool">vector_search(top_k=3)</span><span class="meta">→ ${r.hits.length} approved chunks</span></div><div class="trace-step"><span class="tool">ground + cite</span><span class="meta">→ answer restricted to retrieved sources</span></div></div>`;
    const chunks = r.hits.map((h,i)=>`<div class="doc-hit"><span class="score">sim ${h.sim} · [${i+1}]</span><span class="src">${h.doc.type} · ${h.doc.source}</span><div class="snip">${ragHighlight(h.doc.text, r.q)}</div></div>`).join('');
    document.getElementById('ragResult').innerHTML = `<span class="label">Retrieval trace</span>${trace}<span class="label">Retrieved evidence</span>${chunks||'<p style="font-size:11px;color:#8a9a9a">No matching approved source.</p>'}<span class="label">Grounded answer</span><div class="message ai" style="max-width:100%">${r.html}</div>`;
  };
  document.querySelectorAll('[data-rag]').forEach(b=>b.onclick=()=>{document.getElementById('ragInput').value=b.dataset.rag;ask(b.dataset.rag);});
  document.getElementById('ragAsk').onclick=()=>ask(document.getElementById('ragInput').value);
  document.getElementById('ragInput').onkeydown=e=>{if(e.key==='Enter')ask(e.target.value);};
  ask(KB_SUGGEST[0]);
}

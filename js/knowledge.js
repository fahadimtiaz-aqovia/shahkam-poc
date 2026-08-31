/* ============================================================================
   AI Knowledge (RAG) — governed enterprise knowledge with grounded, cited
   answers. Simulates retrieval-augmented generation: the query is embedded,
   the most relevant approved document chunks are retrieved, and the answer is
   grounded in — and cites — only those chunks. No free-form generation.
   ========================================================================== */

const KB = [
  { id:'SOP-07', title:'Order Acceptance SOP', source:'Operations SOP v4.2', type:'SOP',
    text:'An order may be committed to a delivery date only when the predicted on-time probability is at least 85%. Orders scoring between 70% and 85% require a documented mitigation (capacity reallocation, material confirmation, or a revised date). Orders below 70% must be escalated to the Operations Manager before any commitment.' },
  { id:'POL-KPI', title:'KPI Definitions', source:'Performance Framework', type:'KPI',
    text:'On-time delivery is the share of orders completed on or before the customer required date. Capacity utilisation is used production hours divided by available production hours. A production line is a bottleneck when forecast utilisation exceeds 95%.' },
  { id:'POL-OT', title:'Overtime & Capacity Policy', source:'Manufacturing Policy', type:'Policy',
    text:'Overtime is capped at 24 hours per line per week and must be approved by the Operations Manager. Capacity reallocation should draw first from lines below 80% utilisation. No line may be planned above 100% utilisation.' },
  { id:'SOP-PR', title:'Procurement Anomaly Investigation', source:'Procurement SOP v2.1', type:'SOP',
    text:'A transaction flagged with an anomaly score above 75 is investigated within 48 hours. An anomaly is a signal that a transaction is statistically unusual; it is not evidence of fraud. Investigators compare the transaction against supplier history and peer transactions before any conclusion.' },
  { id:'POL-MAT', title:'Material Readiness Policy', source:'Planning Policy', type:'Policy',
    text:'An order is production-ready only when at least 95% of required material is confirmed available by the planned start date. Partial material readiness must be reflected in the delivery-risk assessment and communicated to the customer.' },
  { id:'POL-GOV', title:'AI Governance & Human Oversight', source:'AI Governance Charter', type:'Policy',
    text:'AI outputs are advisory. Consequential operational decisions require human approval and are recorded in the audit trail. The AI assistant may only call an approved, allow-listed set of analytical tools and may never modify ERP data directly.' },
  { id:'KPI-RISK', title:'Delivery-Risk Model Card', source:'Model Registry', type:'KPI',
    text:'The delivery-risk model outputs P(on-time) using logistic regression over material readiness, capacity headroom, backlog pressure, schedule buffer, historical on-time rate and order size. Each prediction ships with its top risk drivers for explainability.' }
];

const KB_SUGGEST = [
  'When can we commit to a delivery date?',
  'What is the overtime policy?',
  'How are procurement anomalies handled?',
  'What counts as material readiness?',
  'Can the AI change ERP data?'
];

function ragRetrieve(query, k=3){
  const terms = query.toLowerCase().match(/[a-z]{3,}/g) || [];
  const stop = new Set(['the','and','for','are','can','what','when','how','does','our','with','that','this','from','into']);
  const q = terms.filter(t=>!stop.has(t));
  const scored = KB.map(doc=>{
    const text = doc.text.toLowerCase();
    let hits = 0; q.forEach(t=>{ if(text.includes(t)) hits++; });
    return { doc, hits, sim: +(hits/Math.max(1,q.length)).toFixed(2) };
  }).filter(s=>s.hits>0).sort((a,b)=>b.hits-a.hits).slice(0,k);
  return { q, hits: scored };
}

function ragHighlight(text, terms){
  let out = text;
  terms.forEach(t=>{ out = out.replace(new RegExp(`\\b(${t}\\w*)`,'gi'), '<mark>$1</mark>'); });
  return out;
}

function ragAnswer(query){
  const { q, hits } = ragRetrieve(query);
  if(!hits.length){
    return { html:`I could not find an approved knowledge source for that. RAG answers are grounded only in Shahkam’s governed documents — I do not generate ungrounded content.`, hits:[], q };
  }
  const cites = hits.map((h,i)=>`<span class="citation" data-cite="${h.doc.id}">[${i+1}] ${h.doc.id}</span>`).join(' ');
  const body = hits.map((h,i)=>`${h.doc.text} <span class="citation">[${i+1}]</span>`).join('<br><br>');
  return { html:`${body}<div class="evidence"><b>Grounded in:</b> ${cites} &nbsp;·&nbsp; ✓ Approved sources only &nbsp; ✓ No ungrounded generation</div>`, hits, q };
}

function knowledgePage(){
  app.innerHTML = head('AI Knowledge (RAG)','Answers grounded in Shahkam’s approved SOPs, policies and KPI definitions — with citations','Governed enterprise knowledge')
  + `<div class="grid-2">
    <div class="card panel">
      <div class="panel-head"><div><h3>Ask the knowledge base</h3><p>Retrieval-Augmented Generation over approved documents only.</p></div><span class="badge sim">RAG</span></div>
      <div class="filters"><input id="ragInput" placeholder="e.g. When can we commit to a delivery date?" style="flex:1"><button class="primary" id="ragAsk">Ask</button></div>
      <div style="margin-top:10px">${KB_SUGGEST.map(s=>`<button class="secondary" data-rag="${s}" style="margin:3px 3px 0 0">${s}</button>`).join('')}</div>
      <div id="ragResult" style="margin-top:14px"></div>
    </div>
    <div class="card panel"><h3>Knowledge corpus <span class="badge">${KB.length} documents</span></h3><p>Governed, versioned sources. Retrieval is restricted to this approved set.</p>
      <div style="margin-top:10px">${KB.map(d=>`<div class="doc-hit"><span class="src">${d.type} · ${d.source}</span><b style="display:block;margin:3px 0;font:700 12px Manrope">${d.title}</b><div class="snip" style="max-height:34px;overflow:hidden">${d.text}</div></div>`).join('')}</div>
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

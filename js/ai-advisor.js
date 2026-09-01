/* ============================================================================
   Shahkam AI Advisor — a grounded, data-connected assistant. It answers from
   the SAME live demo data the dashboards use (D.orders, D.lines, D.procurement,
   the ML engine, FLAGSHIP and orderState), handles greetings / help / about,
   looks up any order · line · PO by id, and falls back to the governed
   knowledge base (RAG) for policy questions. It advises; a human decides.
   ========================================================================== */

const ADVISOR_COMMON_QUESTIONS = [
  {label:'What can you do?',query:'What can you do?',group:'Getting started'},
  {label:'What is this platform?',query:'What is this platform?',group:'Getting started'},
  {label:'Which orders are most at risk?',query:'Which orders are most at risk?',group:'Delivery risk'},
  {label:'Why is SO-10482 at risk?',query:'Why is SO-10482 at risk?',group:'Delivery risk'},
  {label:'Status of SO-10482?',query:'What is the status of SO-10482?',group:'Delivery risk'},
  {label:'Which lines need attention?',query:'Which production lines need attention?',group:'Production'},
  {label:'Tell me about L-07',query:'Tell me about line L-07',group:'Production'},
  {label:'Can we accept 5,000 more units?',query:'Can we accept another 5,000 units?',group:'Capacity'},
  {label:'Show unusual procurement',query:'Show unusual procurement transactions',group:'Procurement'},
  {label:'Tell me about PO-48291',query:'Tell me about PO-48291',group:'Procurement'},
  {label:'Delivered units (date range)',query:'How much did we deliver from 1 Aug to 15 Aug?',group:'Commercial'},
  {label:'AI-assisted business impact',query:'What is the AI-assisted business impact?',group:'Management'},
  {label:'Focus for today',query:'What should management focus on today?',group:'Management'}
];

const advisorGovernance=`<div class="evidence"><b>Evidence &amp; Governance</b><br>✓ Grounded in approved demo data &nbsp; ✓ Evidence available &nbsp; ✓ Human approval required</div>`;
const escapeHTML=value=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const dateLabel=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`));

/* ---- data-grounded helpers ---- */
function advFlagged(){ return D.procurement.filter(p=>p.status!=='NORMAL'); }
function advRisky(){ return D.orders.filter(o=>o.risk==='HIGH'); }
function advRiskyValue(){ return advRisky().reduce((s,o)=>s+o.value,0); }
function worstLines(){ return [...D.lines].map(l=>({l,pd:ML.productionDelay(l.id)})).sort((a,b)=>b.pd.hours-a.pd.hours); }

function orderAnswer(id){
  id=id.toUpperCase();
  if(id==='SO-10482'){
    const acc=orderState.accepted, prob=acc?orderState.prob:61, risk=acc?'LOW':'HIGH';
    return {html:`<b>SO-10482</b> · Global Fashion Co. · 25,000 units · ${money(185000)} · required 18 Sep.<br><br>On-time probability <b>${prob}%</b> — <b>${risk} risk</b>. ${acc?'The order is <b>accepted</b> and the recovery plan is active (reallocated to L-03, limited overtime, material expedited).':'The leading constraints are <b>material availability</b> (imported L/XL fabric may arrive too late) and the <b>L-07 capacity</b> bottleneck. The recommended recovery plan lifts it to <b>91%</b>.'}${advisorGovernance}`,
      actions: acc?['Track SO-10482','View SO-10482']:['View SO-10482','Run recommended scenario']};
  }
  const o=D.orders.find(x=>x.id===id);
  if(!o) return null;
  return {html:`<b>${o.id}</b> · ${o.customer} · ${o.quantity.toLocaleString()} units · ${money(o.value)}.<br><br>On-time probability <b>${o.probability}%</b> — <b>${o.risk} risk</b> · required ${o.required} · line ${o.line} · currently ${o.status.toLowerCase()}.${advisorGovernance}`,
    actions:['Which orders are most at risk?','View high-risk orders']};
}
function lineAnswer(id){
  const l=D.lines.find(x=>x.id===id.toUpperCase()); if(!l) return null;
  const pd=ML.productionDelay(l.id);
  const tag=l.risk==='High'?'🔴 intervention required':l.risk==='Medium'?'🟠 watch':'🟢 healthy';
  const extra=l.id==='L-07'?' It is the primary bottleneck — moving ~800 units to L-03 recovers ~5 hours and protects the 18 Sep date.':'';
  return {html:`<b>${l.id}</b> — ${tag}.<br><br>Efficiency <b>${l.eff}%</b> · utilisation <b>${l.util}%</b> · downtime ${l.downtime}h · backlog ${(l.backlog/1000).toFixed(0)}K units.<br>Predicted delay <b>${pd.hours}h</b> (probability ${pd.probPct}%), driven by ${pd.drivers[0].label.toLowerCase()} and ${pd.drivers[1].label.toLowerCase()}.${extra}${advisorGovernance}`,
    actions:['View production','Which lines need attention?']};
}
function poAnswer(id){
  const p=D.procurement.find(x=>x.po===id.toUpperCase()); if(!p) return null;
  return {html:`<b>${p.po}</b> · ${p.supplier} · ${p.material} · ${money(Math.round(p.price*p.quantity))}.<br><br>Anomaly score <b>${p.anomaly}/100</b> (${p.status}). Unit price ${pkr(p.price)} vs an expected ${pkr(p.expected)} — <b>+${p.variance}%</b> above the supplier's usual range. <b>An anomaly is not fraud</b>; it is flagged for a human to review.${advisorGovernance}`,
    actions:['Investigate PO-48291','View procurement']};
}
function capacityAnswer(units){
  const c=ML.optimiseCapacity(units,{overtimeHrs:8});
  return {html:`For an extra <b>${units.toLocaleString()} units</b> this month: <b>${c.feasible?'YES — with reallocation':'NOT within current capacity'}</b>.<br><br>Projected on-time <b>${c.projOnTime}%</b> · units placed ${c.placed.toLocaleString()} · binding constraint: ${c.binding}. Current utilisation is <b>86%</b> with roughly <b>18,400 units</b> of headroom over the next four weeks — but this week is tight on L-07 and L-04.${advisorGovernance}`,
    actions:['Test in Capacity','Which lines need attention?']};
}
function helpAnswer(){
  return {html:`I turn Shahkam's live operational data into decisions. I can help with:<br>
    • <b>Orders &amp; delivery</b> — risk, why, recommendations &nbsp;<i>“Why is SO-10482 at risk?”</i><br>
    • <b>Production</b> — line health &amp; predicted delays &nbsp;<i>“Tell me about L-07”</i><br>
    • <b>Capacity</b> — can we take more work? &nbsp;<i>“Can we accept 5,000 more units?”</i><br>
    • <b>Procurement</b> — unusual transactions &nbsp;<i>“Tell me about PO-48291”</i><br>
    • <b>Commercial</b> — deliveries &amp; revenue by date range<br>
    • <b>Management</b> — today's priorities and business impact<br>
    • <b>Policy</b> — questions answered from Shahkam's approved knowledge base<br>
    Ask in plain language, or pick a suggestion on the left.`,
    actions:['Which orders are most at risk?','Which lines need attention?','Can we accept 5,000 more units?','What should management focus on today?']};
}

function parseDateRange(text){let match=text.match(/(?:from|between)\s+([a-z]{3,9}\s*\d{1,2}|\d{1,2}\s*[a-z]{3,9})(?:\s*,?\s*2026)?\s+(?:to|and|until|through)\s+([a-z]{3,9}\s*\d{1,2}|\d{1,2}\s*[a-z]{3,9})(?:\s*,?\s*2026)?/i);if(!match)return null;let parse=value=>{let d=new Date(`${value} 2026`);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10)},start=parse(match[1]),end=parse(match[2]);return start&&end&&start<=end?{start,end}:null}
function periodAnswer(range,kind){let rows=D.deliveryLedger.filter(x=>x.date>=range.start&&x.date<=range.end),units=rows.reduce((sum,x)=>sum+x.units,0),revenue=rows.reduce((sum,x)=>sum+x.revenue,0),collected=rows.reduce((sum,x)=>sum+x.collected,0),orders=new Set(rows.map(x=>x.orderId)).size,period=`${dateLabel(range.start)} to ${dateLabel(range.end)}`;if(!rows.length)return {html:`I could not find a delivery record in the demo data for <b>${period}</b>. Try a date between 1 Aug and 28 Aug 2026.`,actions:['How much did we deliver from 1 Aug to 15 Aug?','Which orders are most at risk?']};if(kind==='units')return {html:`From <b>${period}</b>, Shahkam delivered <b>${units.toLocaleString()} units</b> across <b>${orders} orders</b>.<br><br><span class="label">Commercial value of deliveries</span><br><b>${money(revenue)}</b> <small>illustrative</small>${advisorGovernance}`,actions:['How much revenue did we collect from 1 Aug to 15 Aug?','Which orders are most at risk?']};return {html:`From <b>${period}</b>, Shahkam collected <b>${money(collected)}</b> across <b>${orders} delivered orders</b>.<br><br><span class="label">Related delivered value</span><br><b>${money(revenue)}</b> <small>illustrative</small>${advisorGovernance}`,actions:['How much did we deliver from 1 Aug to 15 Aug?','What should management focus on today?']}}

function advisorResponse(question){
  const text=question.toLowerCase().trim();
  const range=parseDateRange(question);
  if(!text) return helpAnswer();

  /* -- smalltalk -- */
  if(/^(hi+|hey+|hello|yo|hiya|howdy|greetings|good\s*(morning|afternoon|evening|day))[!.\s]*$/.test(text))
    return {html:`Good day — I'm the <b>Shahkam AI Advisor</b>. I turn your live Oracle ERP, JACK, Barcode and RFID data into decisions: delivery risk, production, capacity, procurement and commercial results — grounded, and always advisory.<br><br>Try <i>“Why is SO-10482 at risk?”</i>, <i>“Which lines need attention?”</i> or <i>“Can we accept 5,000 more units?”</i>`,actions:['What can you do?','Which orders are most at risk?','What should management focus on today?']};
  if(/^(thanks|thank you|thx|cheers|great|perfect|nice|awesome|good|ok|okay|got it)[!.\s]*$/.test(text))
    return {html:`Happy to help. Anything else — an order, a production line, capacity, or a procurement check?`,actions:['Which orders are most at risk?','Which lines need attention?']};
  if(/^(bye|goodbye|see you|that.?s all|no thanks|nothing)[!.\s]*$/.test(text))
    return {html:`Thanks — I'll keep monitoring delivery, production, capacity and procurement signals. Come back anytime.`,actions:['What should management focus on today?']};
  if(/(what can you|how can you help|what do you do|help me|capabilities|your options|what are you able)/.test(text))
    return helpAnswer();
  if(/(who are you|what is this|what are you|what platform|about (you|this|the platform)|tell me about (this|the platform|shahkam)|what data|which (data|systems)|on.?prem|oracle|jack|barcode|rfid|how does this work)/.test(text))
    return {html:`I'm the <b>decision-intelligence layer for Shahkam Industries</b>, a garment manufacturer. I sit on top of your existing systems — <b>Oracle ERP</b> (orders, materials, procurement), <b>JACK</b> (machine-level sewing output), <b>Barcode</b> (cutting) and <b>RFID</b> (packing) — and turn that operational data from reactive reporting into <b>predictions, explanations and recommended actions</b>.<br><br>Everything runs <b>on-premises</b> inside Oracle 26ai + APEX; no data leaves the building. I never change ERP data, and a person makes every consequential decision.${advisorGovernance}`,actions:['What can you do?','Which orders are most at risk?','What is the AI-assisted business impact?']};

  /* -- entity lookups (order · line · PO) -- */
  const mSO=text.match(/so-?\s?(\d{4,5})/);
  if(mSO){ const r=orderAnswer('SO-'+mSO[1]); if(r) return r; }
  const mPO=text.match(/po-?\s?(\d{4,5})/);
  if(mPO){ const r=poAnswer('PO-'+mPO[1]); if(r) return r; }
  const mL=text.match(/\bl-?\s?0?(\d{1,2})\b/) || text.match(/\bline\s+0?(\d{1,2})\b/);
  if(mL){ const r=lineAnswer('L-'+String(mL[1]).padStart(2,'0')); if(r) return r; }

  /* -- commercial ledger -- */
  if(range&&/(deliver|delivered|units|ship|shipped)/.test(text)) return periodAnswer(range,'units');
  if(range&&/(revenue|collect|cash|payment|sales|invoice)/.test(text)) return periodAnswer(range,'revenue');
  if(/(from|between).*(deliver|revenue|collect|cash|payment|sales|unit)/.test(text))
    return {html:`I can answer that with a clear range, for example:<br><br><b>“How much did we deliver from 1 Aug to 15 Aug?”</b><br><b>“How much revenue did we collect from 1 Aug to 15 Aug?”</b>`,actions:['How much did we deliver from 1 Aug to 15 Aug?','How much revenue did we collect from 1 Aug to 15 Aug?']};
  if(/last.*(order|deliver)|latest.*(order|deliver)|most recent.*(order|deliver)/.test(text)){
    const x=D.deliveryLedger[D.deliveryLedger.length-1];
    return {html:`The most recently delivered order is <b>${x.orderId}</b> for <b>${x.customer}</b>.<br><br><span class="label">Delivery date</span><br><b>${dateLabel(x.date)}</b><br><span class="label">Delivered quantity</span><br><b>${x.units.toLocaleString()} units</b><br><span class="label">Revenue collected</span><br><b>${money(x.collected)}</b> <small>illustrative</small>${advisorGovernance}`,actions:['View SO-10482','How much did we deliver from 1 Aug to 15 Aug?']};
  }

  /* -- capacity -- */
  if(/(accept|take on|take|handle|fit|room for|headroom|spare capacity|more work|extra work|additional (order|work|volume|units))/.test(text) || /capacity/.test(text)){
    const um=text.replace(/,/g,'').match(/(\d{3,6})\s*(?:more |additional |extra )?units?/) || text.replace(/,/g,'').match(/(?:accept|take|another|extra|additional)\s+(\d{3,6})/);
    if(um) return capacityAnswer(parseInt(um[1],10));
    return capacityAnswer(5000);
  }

  /* -- production -- */
  if(/(bottleneck|which line|lines? (need|require|are|at|to)|production (delay|risk|status|issue)|worst line|behind schedule|delayed line|line health|machine)/.test(text)){
    const w=worstLines(), top=w[0], sec=w[1];
    return {html:`<b>${top.l.id}</b> needs intervention first: predicted delay <b>${top.pd.hours}h</b> (P ${top.pd.probPct}%), utilisation ${top.l.util}%, efficiency ${top.l.eff}%. Next is <b>${sec.l.id}</b> (${sec.pd.hours}h). <b>L-03</b> has spare capacity for reallocation.<br><br>Recommended: move ~800 units from L-07 to L-03 to recover ~5 hours and protect delivery.${advisorGovernance}`,actions:['View production','Run recommended scenario']};
  }

  /* -- procurement -- */
  if(/(procure|anomal|unusual|supplier|purchase|price|invoice|spend|fraud)/.test(text)){
    const f=advFlagged(), val=f.reduce((s,p)=>s+Math.max(0,Math.round((p.price-p.expected)*p.quantity)),0);
    return {html:`<b>${f.length} transactions</b> are flagged for review this month out of 110 checked — an anomaly is a prompt to investigate, <b>not evidence of fraud</b>.<br><br>Highest priority is <b>PO-48291</b>: unit price <b>+20.3%</b> above the supplier's normal range (score 87/100). Total value to review ≈ <b>${money(val)}</b>.${advisorGovernance}`,actions:['Investigate PO-48291','View procurement']};
  }

  /* -- delivery performance / forecast -- */
  if(/(on.?time|delivery (performance|forecast|rate|outlook)|forecast|shipping performance|how are we (doing|tracking)|overall performance)/.test(text)){
    return {html:`On-time delivery is <b>91.4%</b> today, forecast to ease to <b>87.8%</b> over the next 30 days as backlog builds — the early warning is the point, it gives time to act.<br><br><b>${advRisky().length} orders</b> are currently high-risk (~${money(advRiskyValue())} in order value), led by SO-10482 at 61%.${advisorGovernance}`,actions:['Which orders are most at risk?','View SO-10482']};
  }

  /* -- business impact / ROI -- */
  if(/(business impact|roi|return on|business value|savings|worth|benefit|value delivered|bottom line|money)/.test(text)){
    return {html:`This month's <b>estimated, AI-assisted</b> impact:<br>• <b>4</b> late orders prevented<br>• <b>126 hrs</b> of production recovered<br>• <b>18,400 units</b> of capacity identified<br>• <b>${money(7800000)}</b> of procurement value reviewed<br><br>Modelled net benefit is around <b>${money(4360000)}</b> — the objective is earlier, better-informed decisions, not more dashboards.${advisorGovernance}`,actions:['View business value','What should management focus on today?']};
  }

  /* -- recommendation / what should we do -- */
  if(/(recommend|what should (i|we)|mitigat|how (do|to) (i|we) fix|best (action|option)|next step|what can we do|advice)/.test(text)){
    return {html:`My top recommendations right now:<br>1. <b>SO-10482</b> — run the recovery plan (reallocate to L-03, limited overtime, expedite L/XL material) to lift on-time from 61% to <b>91%</b>, then accept.<br>2. <b>L-07</b> — move ~800 units to L-03 to recover ~5 production hours.<br>3. <b>PO-48291</b> — assign for investigation (+20.3% above supplier range).${advisorGovernance}`,actions:['Run recommended scenario','View SO-10482']};
  }

  /* -- explainability -- */
  if(/(how (do|does|did) (you|the model|it)|how is.*(calculated|predicted|scored)|accuracy|confidence|explain how|which model|how do you know|is it reliable|trust)/.test(text)){
    return {html:`Each prediction is produced by a documented model, not a guess. Delivery risk uses <b>six engineered features</b> — material readiness, capacity headroom, backlog pressure, schedule buffer, historical on-time rate and order size — combined by a logistic / gradient-boosted model (ROC-AUC ≈ 0.91). Every prediction ships with its ranked drivers.<br><br>You can open <b>“How is this calculated?”</b> on any number to see the exact maths.${advisorGovernance}`,actions:['Why is SO-10482 at risk?','View AI models']};
  }

  /* -- priorities / brief -- */
  if(/(focus|priorit|today|brief|attention|what.?s important|summary|overview|standup|whats up|what is happening)/.test(text)){
    return {html:`<b>Three things need attention today:</b><br>1. 🔴 <b>SO-10482</b> — 61% on-time probability; approve the recovery scenario (${money(185000)} exposed).<br>2. 🟠 <b>L-07</b> — ~14h predicted delay; move ~800 units to L-03.<br>3. 🟠 <b>PO-48291</b> — priced +20.3% above the supplier range; assign for review.<br><br>Positive: on-time forecast is holding at 87.8%.${advisorGovernance}`,actions:['View SO-10482','Show procurement anomalies']};
  }

  /* -- changes -- */
  if(/(changed|change|since yesterday|vs yesterday|different|what.?s new|update|movement)/.test(text)){
    return {html:`<b>Since yesterday:</b> high-risk orders rose from 8 to <b>${advRisky().length}</b>, capacity utilisation edged from 84% to <b>86%</b>, and L-07's predicted delay grew to <b>14h</b>. The main drivers are the L-07 and L-04 constraints plus the L/XL material delay on SO-10482.${advisorGovernance}`,actions:['What should management focus on today?','View SO-10482']};
  }

  /* -- orders at risk -- */
  if(/(order.*risk|risk.*order|late order|at risk|which orders|risky|orders? (in trouble|behind))/.test(text)){
    const r=advRisky();
    return {html:`<b>${r.length} orders</b> are high-risk (on-time probability below 75%), representing about <b>${money(advRiskyValue())}</b> in order value. The most at risk is <b>SO-10482 at 61%</b> — material availability and L-07 capacity are the dominant constraints. I'd prioritise the top five and reallocate constrained capacity.${advisorGovernance}`,actions:['View SO-10482','Run recommended scenario']};
  }

  /* -- fallback: governed knowledge base (RAG) -- */
  if(typeof ragAnswer==='function'){
    const kb=ragAnswer(question);
    if(kb.hits && kb.hits.length) return {html:`From Shahkam's approved knowledge base:<br><br>${kb.html}`,actions:['Open Knowledge base','What can you do?']};
  }
  return {html:`I can help with orders, delivery, production, capacity, procurement, commercial results and policy questions — I didn't quite catch that one.<br><br>Try: <i>“Why is SO-10482 at risk?”</i>, <i>“Tell me about L-07”</i>, or <i>“Can we accept 5,000 more units?”</i>`,actions:['What can you do?','Which orders are most at risk?','Which lines need attention?']};
}

function advisorChatHTML(){let groups=[...new Set(ADVISOR_COMMON_QUESTIONS.map(x=>x.group))];return `<div class="card chat-shell"><aside class="suggestions"><span class="label">Common questions</span>${groups.map(group=>`<div class="question-group"><small>${group}</small>${ADVISOR_COMMON_QUESTIONS.filter(x=>x.group===group).map(x=>`<button data-q="${x.query}">${x.label}</button>`).join('')}</div>`).join('')}</aside><div class="chat-main"><div id="chatMessages"><div class="message ai">Good day. I'm monitoring delivery, production, capacity and procurement signals — grounded in Shahkam's live demo data. Ask me anything, or pick a question on the left.</div></div><div class="chat-compose"><input id="chatInput" placeholder="e.g. Why is SO-10482 at risk?  ·  Tell me about L-07  ·  Can we accept 5,000 units?"><button class="primary" id="chatSend">Ask AI</button></div></div></div>`}
function advisorHTML(){return `<div class="page-head"><div><div class="eyebrow">Contextual intelligence</div><h1>Shahkam AI Advisor</h1><p>Ask about the business—not about reports. <b>Complements Shahkam's Work-Order Assistant:</b> that answers what a work order <i>is</i>; this answers what to <i>do</i> about it — grounded in the data with governed tool-calls.</p></div><span class="notice">Advisory · runs on-prem via Select AI / APEX AI</span></div>`+advisorChatHTML()}

function advisorActionButton(label){
  const l=label.toLowerCase();
  if(/^(view|open|track|investigate|test|run|show)\b/.test(l)){
    const page=/scenario/.test(l)?'scenarios':/track/.test(l)?'journey':/capacit/.test(l)?'capacity':/procurement|po-/.test(l)?'procurement':/production|line/.test(l)?'production':/knowledge/.test(l)?'knowledge':/impact|roi|business value/.test(l)?'roi':/model/.test(l)?'aiml':'orders';
    return `<button class="secondary" data-page="${page}">${label}</button>`;
  }
  return `<button class="secondary" data-q="${label}">${label}</button>`;
}

function agentPlan(text){text=text.toLowerCase();
 if(/^(hi|hey|hello|thanks|thank|bye|good |what can you|help|who are you|what is this|about )/.test(text))return [['classify_intent()','smalltalk / help']];
 if(/so-?\s?\d{4,5}/.test(text))return [['get_order(id)','ERP order record'],['delivery_risk_model.predict()','P(on-time)'],['explain_drivers()','ranked factors']];
 if(/po-?\s?\d{4,5}/.test(text))return [['get_transaction(id)','ERP procurement line'],['anomaly_model.score()','score / 100']];
 if(/\bl-?\s?0?\d{1,2}\b|\bline\s+\d/.test(text))return [['get_production_signals(line)','JACK live feed'],['delay_model.predict(line)','hours · P(delay)']];
 if(/order.*risk|late.*order|at risk|which orders|risky/.test(text))return [['query_orders(status="open")','40 orders'],['delivery_risk_model.predict(batch)','scored'],['rank(by="risk")','high-risk']];
 if(/accept|take on|capacity|headroom|more units|extra|additional/.test(text))return [['get_capacity()','util 86% · headroom'],['optimise_capacity(extra)','feasible + plan']];
 if(/procure|anomal|unusual|supplier|price|purchase/.test(text))return [['query_transactions(period="MTD")','110 transactions'],['anomaly_model.score()','flagged'],['rank(by="score")','PO-48291 top']];
 if(/bottleneck|which line|production|machine|worst line|behind/.test(text))return [['get_production_signals()','JACK live feed'],['delay_model.predict(batch)','ranked by hours']];
 if(/on.?time|forecast|delivery performance/.test(text))return [['get_kpis()','on-time 91.4%'],['forecast(horizon=30)','87.8% · 95% CI']];
 if(/impact|roi|value|savings|benefit/.test(text))return [['benefit_model.compute()','5 value streams'],['summarise()','net impact']];
 if(/recommend|what should|mitigat|next step|advice|what can we do/.test(text))return [['rank_priorities()','3 actions'],['optimise_capacity()','recovery plan']];
 if(/how (do|does|did)|calculated|predicted|accuracy|confidence|which model/.test(text))return [['model_card()','features + metrics'],['explain()','plain-language']];
 if(/focus|priorit|today|brief|attention|summary/.test(text))return [['diff_snapshots("today")','3 priorities'],['summarise()','brief']];
 if(/changed|yesterday|update|new/.test(text))return [['diff_snapshots("today","yesterday")','deltas'],['summarise()','']];
 if(/deliver|revenue|collect|units/.test(text))return [['query_delivery_ledger(range)','aggregate units + value']];
 return [['rag_search(query)','top-k approved chunks'],['ground_and_cite()','answer from SOP / policy']];}
function agentTraceHTML(question){let steps=agentPlan(question);return `<div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:#7b9190;text-transform:uppercase;margin-bottom:5px">✦ Agent · governed tool calls</div><div class="trace">${steps.map(s=>`<div class="trace-step"><span class="tool">${s[0]}</span><span class="meta">→ ${s[1]}</span></div>`).join('')}</div><div style="font-size:9px;color:#9aabaa;margin:2px 0 8px">Allow-listed analytical tools only · the LLM never queries ERP tables directly</div>`;}

/* Post a demo question into the assistant with stable ids so the guided
   walkthrough can highlight the tool-calls, the answer and the actions. */
function advisorTourAsk(q){
  q=q||'Why is SO-10482 at risk?';
  const box=document.getElementById('chatMessages'); if(!box) return;
  if(document.getElementById('tour-ai-answer')) return;   // already posted
  const r=advisorResponse(q);
  box.insertAdjacentHTML('beforeend',`<div class="message user">${escapeHTML(q)}</div><div class="message ai" id="tour-ai-answer"><div id="tour-ai-trace">${agentTraceHTML(q)}</div><div id="tour-ai-body">${r.html}</div><div class="button-row" id="tour-ai-actions">${r.actions.map(advisorActionButton).join('')}</div></div>`);
  box.querySelectorAll('#tour-ai-actions [data-page]').forEach(b=>b.onclick=()=>render(b.dataset.page));
  box.querySelectorAll('#tour-ai-actions [data-q]').forEach(b=>b.onclick=()=>{const i=document.getElementById('chatInput');if(i){i.value=b.dataset.q;document.getElementById('chatSend').click();}});
  box.parentElement.scrollTop=box.parentElement.scrollHeight;
}

/* ---- floating live-chat dock (bottom-right) ---- */
function floatingChatClose(){ document.getElementById('chatDock')?.classList.remove('open'); document.getElementById('chatFab')?.classList.remove('hidden'); }
function floatingChatOpen(){
  const dock=document.getElementById('chatDock'); if(!dock) return;
  if(!dock.dataset.built){
    dock.innerHTML = `<div class="cd-head"><span class="cd-title">✦ Shahkam AI Advisor</span><div class="cd-tools"><button class="cd-full" title="Open full assistant">⤢</button><button class="cd-close" title="Close">×</button></div></div>
      <div class="cd-body" id="dockMessages"><div class="message ai">Hi — I'm grounded in Shahkam's live demo data. Ask me about an order, a line, capacity or procurement — e.g. <i>“Why is SO-10482 at risk?”</i></div></div>
      <div class="cd-suggest" id="dockSuggest">${['Which orders are most at risk?','Tell me about L-07','Can we accept 5,000 more units?'].map(s=>`<button data-dq="${s}">${s}</button>`).join('')}</div>
      <div class="chat-compose cd-compose"><input id="dockInput" placeholder="Ask anything…"><button class="primary" id="dockSend">Ask</button></div>`;
    dock.dataset.built='1';
    const box=dock.querySelector('#dockMessages');
    const ask=q=>{ if(!q||!q.trim())return; const r=advisorResponse(q); box.insertAdjacentHTML('beforeend',`<div class="message user">${escapeHTML(q)}</div><div class="message ai">${r.html}<div class="button-row">${r.actions.map(advisorActionButton).join('')}</div></div>`); box.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>ask(b.dataset.q)); box.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{floatingChatClose();render(b.dataset.page);}); const sug=dock.querySelector('#dockSuggest'); if(sug)sug.style.display='none'; box.scrollTop=box.scrollHeight; };
    dock.querySelector('#dockSend').onclick=()=>{const i=dock.querySelector('#dockInput');ask(i.value);i.value='';};
    dock.querySelector('#dockInput').onkeydown=e=>{if(e.key==='Enter')dock.querySelector('#dockSend').click();};
    dock.querySelectorAll('[data-dq]').forEach(b=>b.onclick=()=>ask(b.dataset.dq));
    dock.querySelector('.cd-close').onclick=floatingChatClose;
    dock.querySelector('.cd-full').onclick=()=>{floatingChatClose();render('advisor');};
  }
  dock.classList.add('open');
  document.getElementById('chatFab')?.classList.add('hidden');
  setTimeout(()=>dock.querySelector('#dockInput')?.focus(),60);
}
function initFloatingChat(){ const fab=document.getElementById('chatFab'); if(fab) fab.onclick=e=>{ e.preventDefault(); const d=document.getElementById('chatDock'); (d&&d.classList.contains('open'))?floatingChatClose():floatingChatOpen(); }; }
window.addEventListener('load',initFloatingChat);

function bindAdvisor(){let ask=question=>{if(!question.trim())return;let box=document.getElementById('chatMessages'),response=advisorResponse(question);box.insertAdjacentHTML('beforeend',`<div class="message user">${escapeHTML(question)}</div><div class="message ai">${agentTraceHTML(question)}${response.html}<div class="button-row">${response.actions.map(advisorActionButton).join('')}</div></div>`);document.querySelectorAll('#chatMessages [data-q]').forEach(button=>button.onclick=()=>ask(button.dataset.q));document.querySelectorAll('#chatMessages [data-page]').forEach(button=>button.onclick=()=>render(button.dataset.page));box.parentElement.scrollTop=box.parentElement.scrollHeight};document.querySelectorAll('[data-q]').forEach(button=>button.onclick=()=>ask(button.dataset.q));document.getElementById('chatSend').onclick=()=>{let input=document.getElementById('chatInput');ask(input.value);input.value=''};document.getElementById('chatInput').onkeydown=event=>{if(event.key==='Enter')document.getElementById('chatSend').click()}}

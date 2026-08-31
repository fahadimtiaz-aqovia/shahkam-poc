/* ============================================================================
   Oracle Fit & Roadmap — how this solution lines up with Shahkam's actual
   stack (on-prem Oracle OAF/11g → APEX 26.1 / Oracle 26ai), complements the
   in-flight AI work, and sequences with the migration roadmap. Plus reusable
   garment-domain components (critical path, size curve).
   ========================================================================== */

const FIT_MAP = [
  ['Delivery / order risk','Logistic regression → GBT','Oracle ML — GLM / Random Forest (OML4Py)','In-DB'],
  ['Production delay','Gradient-boosted regression','Oracle ML — RF / XGBoost on JACK feed','In-DB'],
  ['Forecasting','Holt / exponential smoothing','Oracle ML — Exponential Smoothing (ESM)','In-DB'],
  ['Anomaly detection','Isolation Forest + z-score','Oracle ML — Anomaly Detection (1-class SVM)','In-DB'],
  ['Optimisation','Constraint solver','APEX / PL-SQL or OML4Py + SciPy','On-prem'],
  ['Enterprise knowledge (RAG)','Retrieval + citations','Oracle 26ai — AI Vector Search','In-DB'],
  ['AI assistant','Agent + tool-calling','Select AI / APEX AI → private LLM','On-prem'],
  ['Management experience','Web dashboard (this POC)','Native Oracle APEX 26.1 pages','On-prem']
];

function fitPage(){
  app.innerHTML = head('Oracle Fit & Roadmap','How this solution fits Shahkam’s on-premises Oracle stack, complements your in-flight AI, and phases with your migration','Alignment')
  + `<div class="onprem-banner"><div class="ob-ico">◆</div><div><b>Built for your stack, not a generic one.</b> Everything is designed to run <b>on-premises</b> inside <b>Oracle APEX 26.1 + Oracle 26ai</b> on your Dell PowerEdge servers — using <b>in-database Oracle Machine Learning</b> and <b>26ai AI Vector Search</b>. <small>Operational data never leaves Shahkam’s data centre.</small></div></div>
  <div class="card panel"><div class="panel-head"><div><h3>Native capability map</h3><p>Each demo capability maps to an Oracle-native equivalent that runs where your data already lives.</p></div><span class="badge">Oracle 26ai · APEX 26.1</span></div>
    <div class="table-wrap"><table class="fitmap"><thead><tr><th>Capability</th><th>Approach shown here</th><th>Oracle-native equivalent</th><th>Runs</th></tr></thead><tbody>
    ${FIT_MAP.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="ora">${r[2]}</td><td><span class="chip risk-low">${r[3]}</span></td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="grid-2">
    <div class="card panel"><h3>Complements what you’re already building</h3>
      <div class="statline"><span><b>Work-Order Assistant</b> (yours, in progress)</span><span class="chip">Answers “what IS”</span></div>
      <p style="font-size:11px;color:var(--muted);margin:2px 0 12px">Plain-language status of any work order.</p>
      <div class="statline"><span><b>Decision Intelligence</b> (this)</span><span class="chip risk-low">Answers “what NEXT”</span></div>
      <p style="font-size:11px;color:var(--muted);margin:2px 0 12px">Predicts risk, explains drivers, recommends action.</p>
      <div class="interpret">We <b>extend</b> your executive dashboard and <b>plug into</b> the work-order assistant — no duplicate chatbot, no parallel BI.</div></div>
    <div class="card panel"><h3>Sequenced with your migration</h3>
      <div class="timeline"><div><time>Now</time><b>HR</b> live on APEX (Phase 1)</div><div><time>2027</time><b>IMS · Marketing · Accounts</b> to APEX (Phase 2)</div><div><time>Then</time>Remaining modules → fully APEX</div></div>
      <div class="interpret"><b>We don’t wait for the migration.</b> Production, Orders and Procurement data is <b>live now on Oracle 11g</b> — a Proof of Value can start immediately and <b>land on APEX 26.1 / 26ai</b> as those areas migrate.</div></div>
  </div>
  <div class="card panel" style="margin-top:14px"><h3>Why this is the right fit for Shahkam</h3>
    <div class="metric-list"><div class="card"><span class="label">On-prem, no cloud</span><p style="font-size:11.5px;color:var(--muted);margin:6px 0 0">Honours your data-control decision — models run in-database; nothing leaves the building.</p></div>
    <div class="card"><span class="label">Oracle-native</span><p style="font-size:11.5px;color:var(--muted);margin:6px 0 0">Reuses OML + 26ai Vector Search + APEX — your team’s existing skills and licences.</p></div>
    <div class="card"><span class="label">Garment-aware</span><p style="font-size:11.5px;color:var(--muted);margin:6px 0 0">Models the real floor: cutting/bundles, JACK line efficiency, RFID dispatch, size curves.</p></div></div></div>
  <div class="card panel" style="margin-top:14px"><h3>Reference architecture — on-premises, Oracle-native</h3><p>Existing Oracle systems stay the record; this layer adds the intelligence, entirely in-house.</p><div class="architecture" style="padding:18px 0 4px"><div class="arch-row">${['Oracle ERP (OAF/11g → APEX 26.1)','JACK · sewing','Barcode · cutting','RFID · packing','Exec Dashboard','Work-Order Assistant'].map(x=>`<div class="arch-box">${x}</div>`).join('')}</div><div class="arch-arrow">↓</div><div class="arch-box strong">Canonical Data Foundation · Feature Layer — inside Oracle 26ai</div><div class="arch-arrow">↓</div><div class="arch-row">${['Oracle ML · GLM','OML · ESM Forecast','OML · Anomaly','APEX / PLSQL Optimiser'].map(x=>`<div class="arch-box strong">${x}</div>`).join('')}</div><div class="arch-arrow">↓</div><div class="arch-box strong">26ai AI Vector Search (RAG) · Select AI / APEX AI → private on-prem LLM</div><div class="arch-arrow">↓</div><div class="arch-row">${['APEX Dashboards','Alerts','AI Advisor','Scenarios'].map(x=>`<div class="arch-box">${x}</div>`).join('')}</div><div class="arch-arrow">↓</div><div class="arch-box strong">Human Decision · advisory, human-in-the-loop</div></div></div>`;
  bindCommon();
}

/* ---- reusable garment components ---- */
function critPathHTML(){
  const ico={done:'✓',warn:'!',wait:'·'};
  return `<div class="critpath">${D.critPath.map(s=>`<div class="cp-stage ${s[3]}"><div class="cp-dot">${ico[s[3]]}</div><b>${s[0]}</b><span class="cp-src">${s[1]}</span><span class="cp-note">${s[2]}</span></div>`).join('')}</div>`;
}
function sizeCurveHTML(){
  const max=Math.max(...D.orderFocus.sizeCurve.map(s=>s[1]));
  return `<div class="sizecurve">${D.orderFocus.sizeCurve.map(s=>`<div class="sc-col"><div class="sc-bar"><i class="${s[2]==='Short'?'short':''}" style="height:${Math.round(s[1]/max*100)}%"></i></div><b>${s[0]}</b><small>${s[1]}% · ${s[2]}</small></div>`).join('')}</div>`;
}

/* ============================================================================
   Feedback & Continuous Learning — every human decision becomes a labelled
   example. When enough new labels accumulate (or drift crosses threshold) the
   model is retrained, validated and re-released. State persists in localStorage
   so the loop visibly grows as the demo is used.
   ========================================================================== */

const Feedback = {
  KEY: 'shahkam_feedback_v2',
  META: 'shahkam_meta_v2',
  RETRAIN_AT: 50,
  items: [],
  meta: { version:'v1.4.0', baseline:0, auc:0.91, retrains:0 },
  seed: [
    { type:'Order commitment', ref:'SO-10461', detail:'92% on-time', decision:'Committed', outcome:'Delivered on time', label:1 },
    { type:'Order commitment', ref:'SO-10455', detail:'68% on-time', decision:'Held for mitigation', outcome:'Delivered late (2d)', label:0 },
    { type:'Procurement review', ref:'PO-48277', detail:'Score 81', decision:'Investigated', outcome:'Confirmed unusual', label:1 },
    { type:'Procurement review', ref:'PO-48260', detail:'Score 76', decision:'Marked valid (false positive)', outcome:'Legitimate bulk order', label:0 },
    { type:'Capacity decision', ref:'L-03 reallocation', detail:'+8,500 units', decision:'Approved', outcome:'On-time recovered', label:1 }
  ],
  load(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
  init(){
    this.items = this.load(this.KEY) || this.seed.map((s,i)=>({ ts: Date.now()-(i+3)*864e5, ...s }));
    this.meta  = this.load(this.META) || this.meta;
    this.save();
  },
  save(){ try{ localStorage.setItem(this.KEY, JSON.stringify(this.items)); localStorage.setItem(this.META, JSON.stringify(this.meta)); }catch(e){ /* file:// or private mode — keep state in memory only */ } },
  capture(e){
    this.items.unshift({ ts: Date.now(), outcome:'Pending outcome', label:null, ...e });
    if (this.items.length > 300) this.items.pop();
    this.save();
    if (document.getElementById('learnBody')) learningRefresh();
  },
  sinceRetrain(){ return this.items.length - this.meta.baseline; },
  retrain(){
    this.meta.baseline = this.items.length;
    this.meta.retrains += 1;
    const [maj,min,pat] = this.meta.version.replace('v','').split('.').map(Number);
    this.meta.version = `v${maj}.${min+1}.0`;
    this.meta.auc = Math.min(0.96, +(this.meta.auc + 0.008).toFixed(3));
    this.save();
  },
  reset(){ try{ localStorage.removeItem(this.KEY); localStorage.removeItem(this.META); }catch(e){} this.meta={version:'v1.4.0',baseline:0,auc:0.91,retrains:0}; this.items=[]; this.init(); }
};
Feedback.init();

let learnDrift;
function learningPage(){
  app.innerHTML = head('Model Learning & Feedback','Human decisions become labelled training data — the model improves under governance','Continuous learning')
  + `<div id="learnBody"></div>`;
  bindCommon();
  learningRefresh();
}

function learningRefresh(){
  const since = Feedback.sinceRetrain();
  const pct = Math.min(100, Math.round(since / Feedback.RETRAIN_AT * 100));
  const psi = 0.13 + Math.min(0.12, since*0.004);
  const ready = since >= Feedback.RETRAIN_AT || psi > 0.2;
  const labelled = Feedback.items.filter(i=>i.label!==null).length;
  document.getElementById('learnBody').innerHTML = `
  <div class="kpi-grid">
    ${kpiPlain('Labelled examples', labelled, 'Human-verified outcomes')}
    ${kpiPlain('New since retrain', since, `Retrain at ${Feedback.RETRAIN_AT}`)}
    ${kpiPlain('Drift (PSI)', psi.toFixed(2), psi>0.2?'Above threshold':'Within threshold', psi>0.2?'down':'')}
    ${kpiPlain('Model version', Feedback.meta.version, `ROC-AUC ${Feedback.meta.auc} · ${Feedback.meta.retrains} retrains`,'up')}
  </div>
  <div class="grid-2">
    <div class="card panel"><div class="panel-head"><div><h3>Retrain readiness</h3><p>Retraining triggers on ${Feedback.RETRAIN_AT} new labels or PSI &gt; 0.2, then validates before release.</p></div><span class="chip ${ready?'risk-med':'risk-low'}">${ready?'READY TO RETRAIN':'ACCUMULATING'}</span></div>
      <div class="control"><label>New labels <b>${since} / ${Feedback.RETRAIN_AT}</b></label><div class="bar" style="height:10px"><i style="width:${pct}%"></i></div></div>
      <div class="control"><label>Drift PSI <b>${psi.toFixed(2)} / 0.20</b></label><div class="bar" style="height:10px"><i style="width:${Math.min(100,psi/0.2*100)}%;background:${psi>0.2?'#c0605f':'#0f766e'}"></i></div></div>
      <div class="button-row"><button class="primary" id="retrainBtn" ${ready?'':'disabled style=opacity:.5'}>Trigger governed retrain</button><button class="secondary" id="simDecisions">Simulate 10 decisions</button><button class="secondary" id="resetFb">Reset demo data</button></div>
      <div class="interpret">Retraining runs time-aware validation and must beat the incumbent model on held-out data before it is released. A human approves the release.</div>
    </div>
    <div class="card panel"><h3>Drift monitoring (PSI)</h3><p>Population Stability Index of live features vs the training distribution.</p><div class="chart-wrap" style="height:190px"><canvas id="learnDriftC"></canvas></div></div>
  </div>
  <div class="card panel" style="margin-top:14px"><h3>Continuous-learning loop</h3>
    <div class="pipeline" style="margin-top:8px">${[['Decide','Human accepts / overrides an AI recommendation'],['Capture','Decision + outcome stored as a labelled example'],['Monitor','Drift & performance tracked vs training data'],['Retrain','Time-aware retrain when threshold crossed'],['Validate','Must beat incumbent on held-out data'],['Release','Human-approved, versioned deployment']].map((s,i,a)=>`<div class="pipe-step"><div class="n">${i+1}</div><b>${s[0]}</b><p>${s[1]}</p></div>${i<a.length-1?'<span class="pipe-arrow">→</span>':''}`).join('')}</div>
  </div>
  <div class="card panel" style="margin-top:14px"><h3>Recent feedback dataset <span class="badge sim">Live</span></h3>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>Type</th><th>Reference</th><th>Detail</th><th>Decision</th><th>Outcome (label)</th></tr></thead><tbody>
    ${Feedback.items.slice(0,12).map(i=>`<tr><td>${new Date(i.ts).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</td><td>${i.type}</td><td>${i.ref}</td><td>${i.detail||''}</td><td>${i.decision}</td><td>${i.label===1?'<span class="chip risk-low">'+i.outcome+'</span>':i.label===0?'<span class="chip risk-med">'+i.outcome+'</span>':'<span class="chip">'+i.outcome+'</span>'}</td></tr>`).join('')}
    </tbody></table></div>
  </div>`;
  if(window.Chart){ learnDrift?.destroy(); const c=document.getElementById('learnDriftC');
    const base=[.05,.06,.08,.09,.11,.12,.13]; const series=[...base, +psi.toFixed(2)];
    learnDrift=new Chart(c,{type:'line',data:{labels:['w1','w2','w3','w4','w5','w6','w7','now'],datasets:[{label:'PSI',data:series,borderColor:'#0f766e',backgroundColor:'#0f766e18',fill:true,tension:.3,borderWidth:2},{label:'Threshold',data:Array(8).fill(.2),borderColor:'#c9736f',borderDash:[5,4],pointRadius:0,borderWidth:1.2}]},options:barOpts('','',true)}); }
  document.getElementById('retrainBtn').onclick=()=>{ if(Feedback.sinceRetrain()>=Feedback.RETRAIN_AT || 0.13+Math.min(0.12,Feedback.sinceRetrain()*0.004)>0.2){ Feedback.retrain(); learningRefresh(); toast(`Retrained → ${Feedback.meta.version}. Validated and released under human approval.`);} };
  document.getElementById('simDecisions').onclick=()=>{ for(let n=0;n<10;n++){ Feedback.capture({type:'Order commitment',ref:'SO-'+(10500+Math.floor(Math.random()*99)),detail:Math.round(60+Math.random()*38)+'% on-time',decision:Math.random()>.5?'Committed':'Held for mitigation',outcome:Math.random()>.4?'Delivered on time':'Delivered late',label:Math.random()>.4?1:0}); } toast('10 decisions captured into the feedback dataset.'); };
  document.getElementById('resetFb').onclick=()=>{ Feedback.reset(); learningRefresh(); toast('Feedback demo data reset.'); };
}

function kpiPlain(t,v,s,cls=''){ return `<div class="card kpi"><div class="kpi-title">${t}</div><h2>${v}</h2><div class="sub ${cls}">${s}</div></div>`; }

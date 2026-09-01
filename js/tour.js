/* ============================================================================
   Guided Product Tour — an enterprise demonstration built on Driver.js.
   Tells ONE continuous business story across the SPA's real pages, driving the
   application's existing navigation (render), state (orderState / scenarioState)
   and actions (acceptOrder, lineDetailModal). It guides; it does not rebuild.
   ========================================================================== */
(function(){
  const STAGES = ['Observe','Predict','Explain','Recommend','Decide','Monitor'];

  /* Each entry is one popover in the story. `num` is the executive step number
     (blank for the intro), `page` is the app page it belongs to, `element` is a
     STABLE id selector, and `modal` opens a real application modal when needed. */
  const FULL_STEPS = [
    { num:'', page:'decision', element:null, side:'over', title:'Shahkam AI Decision Intelligence', big:true,
      body:'This guided demo shows how Shahkam can move from reactive operational reporting to <b>predictive, explainable and actionable decision intelligence</b>.<br><br>We follow one customer order — from the moment it arrives, through AI risk assessment, intervention and acceptance, into live production monitoring.',
      next:'Start Demo ▶' },

    { num:'01', stage:0, page:'decision', element:'#tour-priorities', side:'top', align:'start', title:'What Requires Attention?',
      body:'The Decision Center surfaces the decisions that need management attention <b>today</b> — instead of leaving people to interpret a wall of dashboards.<br><br><b>Operational data → AI analysis → business priority.</b>' },

    { num:'02', stage:0, page:'decision', element:'#tour-so-10482', side:'top', align:'start', title:'A New Order Arrives',
      body:'At the top of today’s priorities is <b>SO-10482</b> — a new 25,000-unit order from Global Fashion Co. Before Shahkam commits to a delivery date, the platform evaluates whether it can realistically be delivered on time.<br><br>This is where the system moves from <i>reporting what happened</i> to <i>predicting what is likely to happen</i>.',
      next:'Review the Order →' },

    { num:'03', stage:1, ostage:1, page:'orders', element:'#tour-risk-score', side:'bottom', align:'start', title:'AI Predicts the Outcome',
      body:'Before accepting the order, AI predicts only a <b>61% probability</b> of on-time delivery — <b>High Risk</b>.<br><br>This is not a historical KPI. It is a forward-looking prediction based on the current operational situation. The business question: <b>can we safely accept this order?</b>' },

    { num:'04', stage:2, ostage:2, page:'orders', element:'#tour-risk-drivers', side:'right', align:'start', title:'Understand Why',
      body:'AI doesn’t stop at a score — it explains the operational factors behind it: <b>material availability</b>, <b>L-07 backlog</b>, capacity and supplier lead-time.<br><br>Here, imported L/XL fabric and L-07 capacity are the dominant constraints. <i>Prediction → explanation.</i>' },

    { num:'05', stage:3, ostage:3, page:'orders', element:'#tour-recommendation', side:'top', align:'start', title:'AI Recommends an Action',
      body:'Instead of just raising an alert, the platform recommends operational actions: shift load from L-07 to L-03, add limited overtime, expedite the missing material.<br><br>Expected result: <b>61% → 91%</b>. AI moves from <i>insight</i> to <i>action</i>.',
      next:'Test the Plan →' },

    { num:'06', stage:3, ostage:4, page:'orders', element:'#tour-scenario-result', side:'left', align:'center', title:'Test the Decision Before Acting',
      body:'The planner can change operational assumptions — production line, overtime, material expedite — and ask AI for the likely business outcome.<br><br>The simulated recovery plan lifts on-time probability from <b>61% to 91%</b>, with the <b>cost, capacity and delivery-date</b> impact shown alongside.' },

    { num:'07', stage:4, ostage:5, resetAccept:true, page:'orders', element:'#tour-accept-order', side:'top', align:'start', title:'The Human Makes the Decision',
      body:'AI recommends. The planner decides. The platform never accepts or rejects the customer order automatically.<br><br>Click <b>Accept Order</b> below to commit — or use Next.',
      next:'Accept Order →' },

    { num:'07', stage:4, page:'orders', element:'#tour-decision-recorded', side:'bottom', align:'start', title:'A Governed Decision',
      modal:()=>{ orderState.accepted=true; orderState.prob=91; if(window.Feedback)Feedback.capture({type:'Order commitment',ref:'SO-10482',detail:'91% on-time · recovery plan',decision:'Accepted (recovery plan)'}); const n=document.getElementById('navAtRisk'); if(n)n.textContent='2'; goOrderStage(5); },
      body:'The decision is recorded with the <b>selected scenario, the user and a timestamp</b> — a governed record.<br><br><i>AI recommendation → human decision → governed record.</i> This is also the feedback that improves future models.',
      next:'Track the Order →' },

    { num:'08', stage:5, ostage:6, page:'orders', element:'#tour-order-tracking', side:'bottom', align:'start', title:'From Decision to Execution',
      body:'Once accepted, the same platform tracks the order through manufacturing — Received → Materials → Cutting → <b>Sewing</b> → Finishing → Packing → Dispatched — via Barcode, JACK and RFID.<br><br>The commercial decision is now connected to real operational execution.' },

    { num:'09', stage:5, pstage:1, page:'production', element:'#tour-l07', side:'top', align:'start', title:'AI Continues Monitoring',
      body:'The decision doesn’t end at acceptance. While the order runs, AI keeps watching production.<br><br>It flags <b>L-07</b>: a predicted <b>~14-hour delay</b> from changeover and lower-than-normal output — an early warning, while there’s still time to act.',
      next:'See the Fix →' },

    { num:'10', stage:3, pstage:4, page:'production', element:'#tour-production-recommendation', side:'left', align:'center', title:'Prevent the Delay',
      body:'Again, the system doesn’t just report the problem — it recommends an intervention: <b>move 800 units to L-03</b> to recover ~5 hours and protect the 18 Sep date.<br><br>The same decision pattern repeats: <b>problem → why → recommendation → impact</b>.' },

    { num:'11', stage:3, page:'capacity', element:'#tour-capacity', side:'bottom', align:'start', title:'Can We Take More Work?',
      body:'The same decision-intelligence layer answers another management question. Test <b>5,000 additional units</b> and the platform responds <b>YES — with reallocation</b>, showing utilisation before/after, the recommended split and on-time probability.<br><br>Capacity becomes a <i>decision</i>, not just a chart.' },

    { num:'12', stage:2, pcstage:1, page:'procurement', element:'#tour-procurement', side:'top', align:'start', title:'Detect Other Business Risks',
      body:'The same pattern extends to procurement. <b>PO-48291</b> is flagged as <b>+20% above the supplier’s normal price range</b>, with the reasons and clear <b>Investigate / Mark Valid</b> actions.<br><br>An anomaly is a prompt to review — never an accusation.' },

    { num:'13', stage:1, page:'advisor', element:'#tour-ai-assistant', side:'right', align:'start', title:'Ask the Business Question',
      body:'The AI Assistant is another way into the same intelligence — grounded in the same operational data. Ask <i>“Which orders are most at risk?”</i> and it returns <b>SO-10482 at 61%</b>, citing material and L-07, and links straight back to the order.<br><br>Not a generic chatbot — a grounded decision interface.' },

    { num:'14', stage:5, page:'decision', element:'#tour-business-impact', side:'top', align:'start', title:'From Decisions to Business Impact',
      body:'The objective isn’t more dashboards — it’s earlier, better-informed decisions. Management sees the <b>estimated, AI-assisted</b> impact: late orders prevented, production hours recovered, capacity identified and procurement value reviewed.',
      next:'The Big Picture →' },

    { num:'15', page:'decision', element:null, side:'over', title:'The Decision Intelligence Loop', big:true,
      body:'Operational data from <b>Oracle ERP, JACK, Barcode and RFID</b> becomes predictions, explanations and recommendations:<br><div class="t-loop">OBSERVE → PREDICT → EXPLAIN → RECOMMEND → HUMAN DECISION → MONITOR → LEARN</div>The value is not another dashboard. It is helping Shahkam <b>identify problems earlier, understand why, decide what to do, and measure the business impact</b>.' }
  ];

  const pad=n=>String(n).padStart(2,'0');
  const intro=(title,body)=>({num:'',big:true,side:'over',title,body,next:'Start ▶'});
  const outro=(title,body)=>({num:'',big:true,side:'over',title,body});

  /* Per-tab walkthroughs. Each step sets the module's own stage (pre) then
     highlights the current stage content (#mstage) or a specific element. */
  const ORDERS_TOUR = [
    intro('Order Decision — Walkthrough','Follow one order from arrival, through AI risk, intervention and acceptance, into live tracking — seven connected stages, one story.'),
    {num:'01',total:7,pre:()=>goOrderStage(0),element:'#mstage',side:'top',title:'A New Order Arrives',body:'SO-10482 has entered Oracle ERP — 25,000 units, required 18 Sep. Before committing a date, the platform assesses whether it can realistically ship on time.'},
    {num:'02',total:7,pre:()=>goOrderStage(1),element:'#tour-risk-score',side:'bottom',title:'AI Predicts the Outcome',body:'A forward-looking <b>61% on-time probability — High Risk</b>. Not a historical KPI; a prediction from the current operational situation.'},
    {num:'03',total:7,pre:()=>goOrderStage(2),element:'#tour-risk-drivers',side:'right',title:'Understand Why',body:'The ranked reasons — <b>material availability</b> and the <b>L-07 capacity</b> constraint dominate.'},
    {num:'04',total:7,pre:()=>goOrderStage(3),element:'#tour-recommendation',side:'top',title:'AI Recommends an Action',body:'A recovery plan that lifts on-time from <b>61% to 91%</b>: reallocate to L-03, limited overtime, expedite the L/XL material.',next:'Test the Plan →'},
    {num:'05',total:7,pre:()=>goOrderStage(4),element:'#tour-scenario-result',side:'left',title:'Test Before Acting',body:'Change the assumptions and the model recalculates the outcome live — with the cost, capacity and delivery-date trade-off.'},
    {num:'06',total:7,pre:()=>{orderState.accepted=false;orderState.prob=61;goOrderStage(5);},element:'#tour-accept-order',side:'top',title:'The Human Decides',body:'AI recommends; the planner decides. Accepting records a governed decision with the scenario, user and timestamp.',next:'Accept Order →'},
    {num:'07',total:7,pre:()=>{orderState.accepted=true;orderState.prob=91;const n=document.getElementById('navAtRisk');if(n)n.textContent='2';goOrderStage(6);},element:'#tour-order-tracking',side:'bottom',title:'Track to Delivery',body:'Once accepted, the same order is tracked live through cutting, sewing, finishing and RFID packing — with production alerts if it starts to slip.'},
    outro('One Connected Story','Arrival → risk → why → recommendation → simulate → decide → track. Revisit any stage with the stepper at the top.')
  ];
  const PRODUCTION_TOUR = [
    intro('Production — Walkthrough','From live floor capture to a recommended intervention — how AI decides which line to act on.'),
    {num:'01',total:5,pre:()=>goProd(0),element:'#mstage',side:'top',title:'Live Floor Capture',body:'Every machine reports output to JACK in real time — and L-07 output is dropping through the shift.'},
    {num:'02',total:5,pre:()=>goProd(1),element:'#tour-l07',side:'top',title:'Line Efficiency',body:'Ten lines, ranked. <b>L-07</b> is red — 84% efficiency and high rework. Click any line to see why.'},
    {num:'03',total:5,pre:()=>goProd(2),element:'#mstage',side:'top',title:'Delay Prediction',body:'A gradient-boosted model predicts a <b>~14h delay</b> on L-07 from downtime and throughput decline.'},
    {num:'04',total:5,pre:()=>goProd(3),element:'#mstage',side:'top',title:'Early Alert',body:'The trend is projected forward — an early warning, while there is still time to act.'},
    {num:'05',total:5,pre:()=>goProd(4),element:'#tour-production-recommendation',side:'left',title:'Recommend the Intervention',body:'Move 800 units to L-03 to recover ~5 hours and protect the date — problem → why → recommendation → impact.'},
    outro('The Same Decision Model','Production uses the exact pattern as Orders: detect early, explain, recommend, quantify the impact.')
  ];
  const CAPACITY_TOUR = [
    intro('Capacity — Walkthrough','Turn “can we take more work?” into a decision with clear conditions.'),
    {num:'01',total:5,pre:()=>goCap(0),element:'#tour-capacity',side:'bottom',title:'Capacity Status',body:'<b>Yes — with reallocation.</b> ~18,400 units of headroom over four weeks, but this week is tight on L-07 and L-04.'},
    {num:'02',total:5,pre:()=>goCap(1),element:'#mstage',side:'top',title:'Test a New Order',body:'Ask “can we place 5,000 more units?” The optimiser answers YES/NO within capacity and overtime limits.'},
    {num:'03',total:5,pre:()=>goCap(2),element:'#mstage',side:'top',title:'Optimise the Allocation',body:'The solver returns exactly where the units land, and the binding constraint.'},
    {num:'04',total:5,pre:()=>goCap(3),element:'#mstage',side:'top',title:'What-if',body:'Compare the current plan against reallocation and overtime scenarios.'},
    {num:'05',total:5,pre:()=>goCap(4),element:'#mstage',side:'top',title:'Finalise the Plan',body:'The constraint watchlist and per-line utilisation against the 100% ceiling.'},
    outro('Capacity as a Decision','Not just a utilisation chart — a clear, conditional answer the business can act on.')
  ];
  const PROCUREMENT_TOUR = [
    intro('Procurement — Walkthrough','From flagged transactions to a governed outcome and a learning loop.'),
    {num:'01',total:5,pre:()=>goProc(0),element:'#mstage',side:'top',title:'Transactions',body:'110 checked, a handful flagged. Most transactions are normal; a few stand out for review.'},
    {num:'02',total:5,pre:()=>goProc(1),element:'#tour-procurement',side:'top',title:'Flag for Review',body:'<b>PO-48291</b> is +20.3% above the supplier range. An anomaly is a prompt to review — not fraud.'},
    {num:'03',total:5,pre:()=>goProc(2),element:'#mstage',side:'top',title:'Investigate',body:'The evidence: how far each signal deviates from normal, shown as a radar profile.'},
    {num:'04',total:5,pre:()=>goProc(3),element:'#mstage',side:'top',title:'Record the Outcome',body:'The investigator decides — investigate, mark valid, or escalate. The AI only surfaced it.'},
    {num:'05',total:5,pre:()=>goProc(4),element:'#mstage',side:'top',title:'Feedback Loop',body:'Each decision becomes labelled data — the false-alert rate falls as the model learns, under governance.'},
    outro('Intelligence Beyond Production','The same decision pattern extends into procurement — detect, explain, decide, learn.')
  ];
  const ADVISOR_TOUR = [
    intro('AI Assistant — Walkthrough','Ask the business in plain language and get a grounded, governed answer that links straight back to the decision.'),
    {num:'01',total:4,pre:()=>render('advisor'),element:'#tour-ai-assistant',side:'right',title:'Ask in Plain Language',body:'Type a question — or pick a common one on the left. No reports, no query language: <i>“Why is SO-10482 at risk?”</i>',next:'Ask it →'},
    {num:'02',total:4,pre:()=>{ if(typeof advisorTourAsk==='function') advisorTourAsk('Why is SO-10482 at risk?'); },element:'#tour-ai-trace',side:'right',title:'Governed Tool-Calls',body:'The assistant answers by calling <b>approved, read-only tools</b> — never by querying ERP tables directly. Every call is shown for transparency and safety.'},
    {num:'03',total:4,pre:()=>{ if(typeof advisorTourAsk==='function') advisorTourAsk('Why is SO-10482 at risk?'); },element:'#tour-ai-body',side:'right',title:'Grounded, Cited Answer',body:'The answer is grounded in the same live data as the dashboards — <b>61% on-time</b>, with material and L-07 as the drivers — plus an evidence &amp; governance note.'},
    {num:'04',total:4,pre:()=>{ if(typeof advisorTourAsk==='function') advisorTourAsk('Why is SO-10482 at risk?'); },element:'#tour-ai-actions',side:'top',title:'Decide &amp; Act',body:'AI advises; a person decides. The answer links straight back to the relevant screen — open SO-10482 or run the recovery scenario.'},
    outro('One Grounded Conversation','Plain question → governed tool-calls → cited answer → human decision. The same intelligence, in natural language.')
  ];
  const TOURS = { full:FULL_STEPS, orders:ORDERS_TOUR, production:PRODUCTION_TOUR, capacity:CAPACITY_TOUR, procurement:PROCUREMENT_TOUR, advisor:ADVISOR_TOUR };

  let driverObj=null, tourActive=false, tourPage=null, activeSteps=FULL_STEPS;

  function storyStrip(active){
    return '<div class="t-story">'+STAGES.map((s,i)=>`<span class="${i===active?'on':''}">${s}</span>`).join('<i>›</i>')+'</div>';
  }
  function titleHTML(s){
    if(s.big) return `<div class="t-title t-title-lg">${s.title}</div>`;
    return `<div class="t-top"><span class="t-num">${s.num}</span><span class="t-prog">${s.num} / ${pad(s.total||15)}</span></div><div class="t-title">${s.title}</div>`;
  }
  function descHTML(s){
    return (s.stage!=null?storyStrip(s.stage):'')+`<div class="t-body">${s.body}</div>`;
  }
  function toDriverStep(s,i){
    const last=i===activeSteps.length-1;
    const pop={
      title:titleHTML(s), description:descHTML(s),
      side:s.side||'bottom', align:s.align||'start',
      showButtons: i===0 ? ['next','close'] : ['next','previous','close'],
      nextBtnText: s.next || (last?'Finish Demo':'Next →'),
      prevBtnText:'← Back', doneBtnText:'Finish Demo', showProgress:false
    };
    return s.element ? { element:s.element, popover:pop } : { popover:pop };
  }

  /* Establish the exact app state a step needs, regardless of direction. */
  function setupFor(i){
    const s=activeSteps[i];
    closeModal();
    if(s.resetAccept){ orderState.accepted=false; orderState.prob=61; const n=document.getElementById('navAtRisk'); if(n)n.textContent='3'; }
    if(s.pre){ s.pre(); tourPage='module'; }
    else if(s.ostage!=null){ goOrderStage(s.ostage); tourPage='orders'; }
    else if(s.pstage!=null){ goProd(s.pstage); tourPage='production'; }
    else if(s.pcstage!=null){ goProc(s.pcstage); tourPage='procurement'; }
    else if(s.page && s.page!==tourPage){ render(s.page); tourPage=s.page; }
    if(s.modal) s.modal();
  }
  function goRel(dir){
    if(!driverObj) return;
    const t=driverObj.getActiveIndex()+dir;
    if(t<0) return;
    if(t>=activeSteps.length){ finish(); return; }
    // Clear any stale highlight class (Driver.js can leave it on the previous
    // element when the next target is nested inside it or inside a fresh modal).
    document.querySelectorAll('.driver-active-element').forEach(e=>e.classList.remove('driver-active-element'));
    setupFor(t);
    // A short timeout so a freshly rendered page / opened modal is painted before
    // Driver.js measures the target element's position. (setTimeout — unlike
    // requestAnimationFrame — still fires when the pane is backgrounded.)
    setTimeout(()=>{
      if(!driverObj) return;
      dir>0 ? driverObj.moveNext() : driverObj.movePrevious();
    }, 60);
  }

  /* Let the presenter click the REAL Simulate / Accept buttons and have the
     tour advance — so the demo feels live rather than pre-recorded. */
  function interceptor(e){
    if(!tourActive || !driverObj) return;
    const b=e.target.closest('#tour-simulate,#tour-accept-order');
    if(!b) return;
    const el=activeSteps[driverObj.getActiveIndex()]?.element;
    const wants=(b.id==='tour-simulate' && el==='#tour-recommendation') ||
                (b.id==='tour-accept-order' && el==='#tour-accept-order');
    if(!wants) return;
    e.preventDefault(); e.stopPropagation();
    goRel(1);
  }

  function cleanup(){
    tourActive=false;
    document.removeEventListener('click',interceptor,true);
    closeModal();
  }
  function finish(){ if(driverObj) driverObj.destroy(); }

  function start(name){
    const DRIVER = window.driver && window.driver.js && window.driver.js.driver;
    if(!DRIVER){ toast('Tour engine is unavailable.'); return; }
    if(tourActive){ finish(); }
    name = (name && TOURS[name]) ? name : 'full';
    activeSteps = TOURS[name];
    if(name==='full'){ resetDemo(); tourPage='decision'; }
    else {
      closeModal();
      try{
        if(name==='orders'){ orderState.accepted=false; orderState.prob=61; orderStage=0; const n=document.getElementById('navAtRisk'); if(n)n.textContent='3'; }
        if(name==='production'){ prodStage=0; }
        if(name==='capacity'){ capStage=0; capOpt.units=5000; capOpt.ot=2; }
        if(name==='procurement'){ procStage=0; }
        if(name==='advisor'){ orderState.accepted=false; orderState.prob=61; }
      }catch(e){}
      tourPage=null;
    }
    driverObj = DRIVER({
      animate:true, smoothScroll:true, allowClose:true, overlayColor:'rgba(10,28,32,.62)',
      stagePadding:6, stageRadius:10, popoverClass:'shahkam-tour', overlayOpacity:0.62,
      steps: activeSteps.map(toDriverStep),
      onNextClick:()=>goRel(1),
      onPrevClick:()=>goRel(-1),
      onCloseClick:()=>finish(),
      onDestroyStarted:()=>{ if(driverObj) driverObj.destroy(); },
      onDestroyed:()=>{ cleanup(); driverObj=null; }
    });
    tourActive=true;
    document.addEventListener('click',interceptor,true);
    driverObj.drive(0);
  }

  /* Reset the POC to its pristine presentation state. */
  function resetDemo(){
    orderState.accepted=false; orderState.prob=61;
    try{ orderStage=0; prodStage=0; capStage=0; procStage=0; capOpt.units=5000; capOpt.ot=2; }catch(e){}
    try{ Object.assign(scenarioState,{allocation:22,overtime:8,material:'2026-09-12',priority:'High',line:'L-03',sequence:'Optimised'}); }catch(e){}
    const n=document.getElementById('navAtRisk'); if(n)n.textContent='3';
    closeModal();
    render('decision');
    tourPage='decision';
  }

  /* The header button launches the walkthrough for whichever tab is open. */
  function currentTour(){
    const p=document.querySelector('.nav-item.active')?.dataset.page;
    return ['orders','production','capacity','procurement','advisor'].includes(p) ? p : 'full';
  }
  // Expose + wire up controls once the DOM is ready.
  window.ShahkamTour = { start, reset:resetDemo };
  function bind(){
    const st=document.getElementById('startTour'); if(st) st.onclick=()=>start(currentTour());
    const rd=document.getElementById('resetDemo'); if(rd) rd.onclick=()=>{ resetDemo(); toast('Demo reset — SO-10482 back to 61% · High Risk · not yet accepted.'); };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();

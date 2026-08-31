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
  const STEPS = [
    { num:'', page:'decision', element:null, side:'over', title:'Shahkam AI Decision Intelligence', big:true,
      body:'This guided demo shows how Shahkam can move from reactive operational reporting to <b>predictive, explainable and actionable decision intelligence</b>.<br><br>We follow one customer order — from the moment it arrives, through AI risk assessment, intervention and acceptance, into live production monitoring.',
      next:'Start Demo ▶' },

    { num:'01', stage:0, page:'decision', element:'#tour-priorities', side:'top', align:'start', title:'What Requires Attention?',
      body:'The Decision Center surfaces the decisions that need management attention <b>today</b> — instead of leaving people to interpret a wall of dashboards.<br><br><b>Operational data → AI analysis → business priority.</b>' },

    { num:'02', stage:0, page:'decision', element:'#tour-so-10482', side:'top', align:'start', title:'A New Order Arrives',
      body:'At the top of today’s priorities is <b>SO-10482</b> — a new 25,000-unit order from Global Fashion Co. Before Shahkam commits to a delivery date, the platform evaluates whether it can realistically be delivered on time.<br><br>This is where the system moves from <i>reporting what happened</i> to <i>predicting what is likely to happen</i>.',
      next:'Review the Order →' },

    { num:'03', stage:1, page:'orders', element:'#tour-risk-score', side:'bottom', align:'start', title:'AI Predicts the Outcome',
      body:'Before accepting the order, AI predicts only a <b>61% probability</b> of on-time delivery — <b>High Risk</b>.<br><br>This is not a historical KPI. It is a forward-looking prediction based on the current operational situation. The business question: <b>can we safely accept this order?</b>' },

    { num:'04', stage:2, page:'orders', element:'#tour-risk-drivers', side:'right', align:'start', title:'Understand Why',
      body:'AI doesn’t stop at a score — it explains the operational factors behind it: <b>material availability</b>, <b>L-07 backlog</b>, capacity and supplier lead-time.<br><br>Here, imported L/XL fabric and L-07 capacity are the dominant constraints. <i>Prediction → explanation.</i>' },

    { num:'05', stage:3, page:'orders', element:'#tour-recommendation', side:'top', align:'start', title:'AI Recommends an Action',
      body:'Instead of just raising an alert, the platform recommends operational actions: shift load from L-07 to L-03, add limited overtime, expedite the missing material.<br><br>Expected result: <b>61% → 91%</b>. AI moves from <i>insight</i> to <i>action</i>.',
      next:'Test the Plan →' },

    { num:'06', stage:3, page:'scenarios', element:'#tour-scenario-result', side:'left', align:'center', title:'Test the Decision Before Acting',
      body:'The planner can change operational assumptions — production line, overtime, material expedite — and ask AI for the likely business outcome.<br><br>The simulated recovery plan lifts on-time probability from <b>61% to 91%</b>, with the <b>cost, capacity and delivery-date</b> impact shown alongside.' },

    { num:'07', stage:4, page:'scenarios', element:'#acceptScenario', side:'top', align:'start', title:'The Human Makes the Decision',
      body:'AI recommends. The planner decides. The platform never accepts or rejects the customer order automatically.<br><br>Click <b>Accept Order</b> below to commit — or use Next.',
      next:'Accept Order →' },

    { num:'07', stage:4, page:'scenarios', element:'#tour-decision-recorded', side:'bottom', align:'start', title:'A Governed Decision',
      modal:()=>{ orderState.accepted=true; orderState.prob=91; const n=document.getElementById('navAtRisk'); if(n)n.textContent='2'; acceptOrderModal(91); },
      body:'The decision is recorded with the <b>selected scenario, the user and a timestamp</b> — a governed record.<br><br><i>AI recommendation → human decision → governed record.</i> This is also the feedback that improves future models.',
      next:'Track the Order →' },

    { num:'08', stage:5, page:'journey', element:'#tour-order-tracking', side:'bottom', align:'start', title:'From Decision to Execution',
      body:'Once accepted, the same platform tracks the order through manufacturing — Received → Materials → Cutting → <b>Sewing</b> → Finishing → Packing → Dispatched — via Barcode, JACK and RFID.<br><br>The commercial decision is now connected to real operational execution.' },

    { num:'09', stage:5, page:'production', element:'#tour-l07', side:'top', align:'start', title:'AI Continues Monitoring',
      body:'The decision doesn’t end at acceptance. While the order runs, AI keeps watching production.<br><br>It flags <b>L-07</b>: a predicted <b>~14-hour delay</b> from changeover and lower-than-normal output — an early warning, while there’s still time to act.',
      next:'See the Fix →' },

    { num:'10', stage:3, page:'production', element:'#tour-production-recommendation', side:'left', align:'center', title:'Prevent the Delay',
      modal:()=>{ lineDetailModal(D.lines.find(l=>l.id==='L-07')); },
      body:'Again, the system doesn’t just report the problem — it recommends an intervention: <b>move 800 units to L-03</b> to recover ~5 hours and protect the 18 Sep date.<br><br>The same decision pattern repeats: <b>problem → why → recommendation → impact</b>.' },

    { num:'11', stage:3, page:'capacity', element:'#tour-capacity', side:'bottom', align:'start', title:'Can We Take More Work?',
      body:'The same decision-intelligence layer answers another management question. Test <b>5,000 additional units</b> and the platform responds <b>YES — with reallocation</b>, showing utilisation before/after, the recommended split and on-time probability.<br><br>Capacity becomes a <i>decision</i>, not just a chart.' },

    { num:'12', stage:2, page:'procurement', element:'#tour-procurement', side:'top', align:'start', title:'Detect Other Business Risks',
      body:'The same pattern extends to procurement. <b>PO-48291</b> is flagged as <b>+20% above the supplier’s normal price range</b>, with the reasons and clear <b>Investigate / Mark Valid</b> actions.<br><br>An anomaly is a prompt to review — never an accusation.' },

    { num:'13', stage:1, page:'advisor', element:'#tour-ai-assistant', side:'right', align:'start', title:'Ask the Business Question',
      body:'The AI Assistant is another way into the same intelligence — grounded in the same operational data. Ask <i>“Which orders are most at risk?”</i> and it returns <b>SO-10482 at 61%</b>, citing material and L-07, and links straight back to the order.<br><br>Not a generic chatbot — a grounded decision interface.' },

    { num:'14', stage:5, page:'decision', element:'#tour-business-impact', side:'top', align:'start', title:'From Decisions to Business Impact',
      body:'The objective isn’t more dashboards — it’s earlier, better-informed decisions. Management sees the <b>estimated, AI-assisted</b> impact: late orders prevented, production hours recovered, capacity identified and procurement value reviewed.',
      next:'The Big Picture →' },

    { num:'15', page:'decision', element:null, side:'over', title:'The Decision Intelligence Loop', big:true,
      body:'Operational data from <b>Oracle ERP, JACK, Barcode and RFID</b> becomes predictions, explanations and recommendations:<br><div class="t-loop">OBSERVE → PREDICT → EXPLAIN → RECOMMEND → HUMAN DECISION → MONITOR → LEARN</div>The value is not another dashboard. It is helping Shahkam <b>identify problems earlier, understand why, decide what to do, and measure the business impact</b>.' }
  ];

  let driverObj=null, tourActive=false, tourPage=null;

  function storyStrip(active){
    return '<div class="t-story">'+STAGES.map((s,i)=>`<span class="${i===active?'on':''}">${s}</span>`).join('<i>›</i>')+'</div>';
  }
  function titleHTML(s){
    if(s.big) return `<div class="t-title t-title-lg">${s.title}</div>`;
    return `<div class="t-top"><span class="t-num">${s.num}</span><span class="t-prog">${s.num} / 15</span></div><div class="t-title">${s.title}</div>`;
  }
  function descHTML(s){
    return (s.stage!=null?storyStrip(s.stage):'')+`<div class="t-body">${s.body}</div>`;
  }
  function toDriverStep(s,i){
    const last=i===STEPS.length-1;
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
    const s=STEPS[i];
    closeModal();
    if(s.page && s.page!==tourPage){ render(s.page); tourPage=s.page; }
    if(s.modal) s.modal();
  }
  function goRel(dir){
    if(!driverObj) return;
    const t=driverObj.getActiveIndex()+dir;
    if(t<0) return;
    if(t>=STEPS.length){ finish(); return; }
    setupFor(t);
    // Two frames so a freshly rendered page / opened modal is painted before
    // Driver.js measures the target element's position.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(!driverObj) return;
      dir>0 ? driverObj.moveNext() : driverObj.movePrevious();
    }));
  }

  /* Let the presenter click the REAL Simulate / Accept buttons and have the
     tour advance — so the demo feels live rather than pre-recorded. */
  function interceptor(e){
    if(!tourActive || !driverObj) return;
    const b=e.target.closest('#tour-simulate,#acceptScenario');
    if(!b) return;
    const el=STEPS[driverObj.getActiveIndex()]?.element;
    const wants=(b.id==='tour-simulate' && el==='#tour-recommendation') ||
                (b.id==='acceptScenario' && el==='#acceptScenario');
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

  function start(){
    const DRIVER = window.driver && window.driver.js && window.driver.js.driver;
    if(!DRIVER){ toast('Tour engine is unavailable.'); return; }
    if(tourActive){ finish(); }
    resetDemo();
    tourPage='decision';
    driverObj = DRIVER({
      animate:true, smoothScroll:true, allowClose:true, overlayColor:'rgba(10,28,32,.62)',
      stagePadding:6, stageRadius:10, popoverClass:'shahkam-tour', overlayOpacity:0.62,
      steps: STEPS.map(toDriverStep),
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
    try{ Object.assign(scenarioState,{allocation:22,overtime:8,material:'2026-09-12',priority:'High',line:'L-03',sequence:'Optimised'}); }catch(e){}
    const n=document.getElementById('navAtRisk'); if(n)n.textContent='3';
    closeModal();
    render('decision');
    tourPage='decision';
  }

  // Expose + wire up controls once the DOM is ready.
  window.ShahkamTour = { start, reset:resetDemo };
  function bind(){
    const st=document.getElementById('startTour'); if(st) st.onclick=start;
    const rd=document.getElementById('resetDemo'); if(rd) rd.onclick=()=>{ resetDemo(); toast('Demo reset — SO-10482 back to 61% · High Risk · not yet accepted.'); };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();

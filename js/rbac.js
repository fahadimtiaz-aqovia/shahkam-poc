/* ============================================================================
   Role-Based Access Control — 7 roles with least-privilege views. Switching
   role re-scopes the navigation and enforces access. In production this is
   enforced server-side at the API/tool layer; here it is demonstrated in the UI.
   ========================================================================== */

const ROLES = {
  executive:   { label:'Executive / Management', initials:'FI', allowed:'*' ,
                 scope:'Aggregated KPIs, risk, forecasts, recommendations and approved drill-downs' },
  operations:  { label:'Operations Manager', initials:'OM',
                 allowed:['decision','orders','journey','production','capacity','scenarios','advisor','knowledge','alerts','aiml','mlops','architecture','glossary','roi'],
                 scope:'Production, capacity, order and operational risk analysis' },
  production:  { label:'Production User', initials:'PU',
                 allowed:['decision','production','capacity','journey','alerts','advisor','knowledge','glossary'],
                 scope:'Relevant line / machine / order information and alerts' },
  procurement: { label:'Procurement User', initials:'PR',
                 allowed:['decision','procurement','alerts','advisor','knowledge','glossary'],
                 scope:'Supplier and procurement anomaly analysis' },
  finance:     { label:'Finance / Commercial', initials:'FC',
                 allowed:['decision','roi','orders','journey','advisor','knowledge','glossary'],
                 scope:'Approved financial / order insights according to role' },
  it_admin:    { label:'IT / Data Administrator', initials:'IT',
                 allowed:['decision','data','aiml','mlops','governance','architecture','glossary'],
                 scope:'Integration, monitoring, data and platform administration' },
  ai_admin:    { label:'AI / Model Administrator', initials:'AI',
                 allowed:['decision','aiml','mlops','governance','knowledge','architecture','glossary'],
                 scope:'Model lifecycle, evaluation and monitoring' }
};

const RBAC = {
  current: 'executive',
  role(){ return ROLES[this.current]; },
  can(page){ const r=this.role(); return r.allowed==='*' || r.allowed.includes(page); },
  applyNav(){
    document.querySelectorAll('#mainNav .nav-item[data-page]').forEach(b=>{
      const ok = this.can(b.dataset.page);
      b.classList.toggle('locked', !ok);
      b.title = ok ? '' : 'No access for this role';
    });
    const av=document.getElementById('userProfile'); if(av) av.textContent=this.role().initials;
  },
  set(role){
    this.current = role;
    this.applyNav();
    let page = document.querySelector('.nav-item.active')?.dataset.page || 'decision';
    if(!this.can(page)) page='decision';
    render(page);
    toast(`Viewing as ${this.role().label} — navigation scoped to this role.`);
  },
  init(){
    const ta=document.querySelector('.top-actions');
    if(ta && !document.getElementById('roleSel')){
      const wrap=document.createElement('div'); wrap.className='role-switch';
      wrap.innerHTML=`<span class="label" style="color:#8a999c">Role</span><select id="roleSel">${Object.entries(ROLES).map(([k,r])=>`<option value="${k}">${r.label}</option>`).join('')}</select>`;
      ta.insertBefore(wrap, ta.firstChild);
      document.getElementById('roleSel').onchange=e=>this.set(e.target.value);
    }
    const nav=document.getElementById('mainNav');
    if(nav) nav.addEventListener('click',e=>{
      const b=e.target.closest('[data-page]');
      if(b && !this.can(b.dataset.page)){ e.stopPropagation(); e.preventDefault();
        toast(`Access denied — ${this.role().label} cannot open “${b.querySelector('span')?.textContent||b.dataset.page}”.`); }
    }, true);
    this.applyNav();
  }
};
window.addEventListener('load', ()=>{ try{ RBAC.init(); }catch(e){} });

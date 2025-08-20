/* ========= tiny DOM helpers ========= */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* ========= Calculator Mode (product type) config ========= */
const MODES = {
  bar:        { label: "Bar Soap (NaOH)",   soap: true,  lye: "NaOH" },
  liquid:     { label: "Liquid Soap (KOH)", soap: true,  lye: "KOH"  },
  shampooBar: { label: "Shampoo Bar",       soap: false },
  shampoo:    { label: "Shampoo (Liquid)",  soap: false },
  lipBalm:    { label: "Lip Balm",          soap: false },
  bodyButter: { label: "Body Butter",       soap: false },
  sugarScrub: { label: "Sugar Scrub",       soap: false },
  lotion:     { label: "Lotion",            soap: false },
  laundry:    { label: "Laundry Soap",      soap: false },
  dish:       { label: "Dish Soap",         soap: false }
};

/* ========= Coming Soon banner ========= */
const COMING_SOON_HTML = `
  <tr><td colspan="2" style="padding:12px 6px">
    <div style="border:1px dashed #e5e7eb;background:#fffaf4;padding:14px;border-radius:12px;
                font-size:14px;line-height:1.5;text-align:center">
      <div style="font-weight:800;margin-bottom:6px">Coming Soon</div>
      <div>Just like a perfectly cured bar of Cold Process Soap,<br>
      this page has to sit for a few weeks before being ready. <b>COMING SOON!</b></div>
    </div>
  </td></tr>`;

/* ========= Tabs controller ========= */
(function tabsController(){
  const sectionIds = ['calc','lyelimited','cost','save','feedback'];

  function showTab(id){
    // hide/show sections
    sectionIds.forEach(sec=>{
      const el = $('#'+sec);
      if(el) el.classList.toggle('hide', sec !== id);
    });
    // active tab pill + aria
    $$('.tab').forEach(tab=>{
      const isActive = tab.dataset.tab === id;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // optional: when entering Cost, refresh table if available
    if(id==='cost' && window._last?.rows && typeof window.renderCostTable==='function'){
      window.renderCostTable(window._last.rows, {fo: window._last.fo});
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // default to Calculator
    showTab('calc');

    // rename the Lye tab heading if needed
    const lyHdr = $('#lyelimited h2');
    if(lyHdr && /Lye-?Limited/i.test(lyHdr.textContent)) lyHdr.textContent = 'Batch by Available Lye';

    // wire clicks
    $$('.tab').forEach(tab=>{
      tab.addEventListener('click', ()=>{
        const id = tab.dataset.tab;
        // the "install" tab is just a CTA; keep calc visible
        showTab(id === 'install' ? 'calc' : id);
      });
    });
  });
})();

/* ========= Mode controller (product type awareness) ========= */
(function modeController(){
  const modeSelect = $('#calcMode');     // Product type dropdown
  const profileSel = $('#profile');      // Recipe style/profile (soap-only)
  const applyBtn   = $('#applyBtn');
  const scaleBtn   = $('#scaleBtn');
  const pctBtn     = $('#pctBtn');
  const lyeTypeSel = $('#lyeType');      // NaOH / KOH / dual
  const resTable   = $('#resTable');     // results table body
  const calcBtn    = $('#calcBtn');
  const modeTag    = $('#modeTag');      // little chip in Calculator header

  // find a block that wraps profile + its controls
  function profileBlock(){
    if(!profileSel) return null;
    const cell = profileSel.closest('div') || profileSel.parentElement;
    return cell;
  }
  function setProfileVisibility(visible){
    const block = profileBlock();
    if(block) block.classList.toggle('hide', !visible);
    if(applyBtn) applyBtn.classList.toggle('hide', !visible);
    if(scaleBtn) scaleBtn.classList.toggle('hide', !visible);
    if(pctBtn)   pctBtn.classList.toggle('hide', !visible);
  }

  function applyMode(modeKey){
    const cfg = MODES[modeKey];
    if(!cfg) return;

    if(modeTag) modeTag.textContent = cfg.label || 'Calculator';

    // Soap modes show recipe style; others hide it
    setProfileVisibility(!!cfg.soap);

    // Force the correct lye type for soaps
    if(cfg.soap && cfg.lye && lyeTypeSel){
      lyeTypeSel.value = cfg.lye;                  // "NaOH" or "KOH"
      lyeTypeSel.dispatchEvent(new Event('change', {bubbles:true}));
    }

    // For non-soap modes, show the coming-soon banner immediately
    if(!cfg.soap && resTable){
      resTable.innerHTML = COMING_SOON_HTML;
    }
  }

  function onCalculateClicked(e){
    try{
      const key = modeSelect?.value;
      const cfg = key && MODES[key];
      if(!cfg) return;                // unknown → let existing handlers run

      if(!cfg.soap){
        // Intercept: show banner instead of soap math
        if(resTable) resTable.innerHTML = COMING_SOON_HTML;
        return;
      }
      // Soap → run your existing calculate() if present
      if(typeof window.calculate === 'function'){
        window.calculate();
      }
    }catch(err){
      // never crash UI
      console.info('calculate intercept skipped:', err?.message || err);
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    if(!modeSelect) return;

    // initialize with current selection (default to Bar Soap)
    applyMode(modeSelect.value || 'bar');

    // react to mode changes
    modeSelect.addEventListener('change', ()=>{
      applyMode(modeSelect.value || 'bar');
    });

    // intercept Calculate button to support Coming Soon products
    if(calcBtn){
      calcBtn.addEventListener('click', (e)=>{
        e.preventDefault();
        onCalculateClicked(e);
      });
    }
  });
})();

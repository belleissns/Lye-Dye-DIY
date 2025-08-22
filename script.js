/* ===================================================================
   Bel Lei’s Soaps N Stuffs — UI glue & mode handling (safe drop-in)
   - Keeps your existing calculator working
   - Adds product selector + Coming Soon gating for non-ready products
   - Shows ONLY one Install button (green near Calculate)
=================================================================== */

/* -------------------------------
   0) Helpers
-------------------------------- */
const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const byId = id => document.getElementById(id);

function disableInside(el, on){
  if(!el) return;
  $$("input, select, textarea, button", el).forEach(n=>{
    // don't disable the main install button – we manage it separately
    if(n.id === "installBtn") return;
    n.disabled = !!on;
  });
}

function showComingSoon(target){
  if(!target) return;
  target.innerHTML = `
    <div class="coming-soon" style="padding:14px;border:1px dashed #e5e7eb;border-radius:12px;background:#fff;">
      <strong>Just like a perfectly cured bar of Cold Process Soap,</strong><br>
      this page has to sit for a few weeks before being ready.<br>
      <em>COMING SOON!</em>
    </div>
  `;
}

/* -------------------------------
   1) Product catalog (UI-only for now)
-------------------------------- */
const PRODUCTS = [
  { id:"bar",            label:"Bar Soap (NaOH)",                ready:true  },
  { id:"liquid",         label:"Liquid Soap (KOH)",              ready:false },
  { id:"facial",         label:"Facial Bar",                     ready:false },
  { id:"shampoo-bar",    label:"Shampoo Bar",                    ready:false },
  { id:"shampoo-liquid", label:"Liquid Shampoo",                 ready:false },
  { id:"sugar-scrub",    label:"Sugar Scrub",                    ready:false },
  { id:"lotion",         label:"Lotion",                         ready:false },
  { id:"body-butter",    label:"Body Butter",                    ready:false },
  { id:"lip-balm",       label:"Lip Balm",                       ready:false },
];

/* -------------------------------
   2) Populate <select id="product"> if present
-------------------------------- */
function ensureProductDropdown(){
  const sel = byId("product");
  if(!sel) return;

  // If it's empty or has only 1 item, (re)populate
  const currentOptions = Array.from(sel.options).map(o=>o.value);
  const needsPopulate = currentOptions.length < 3;

  if(needsPopulate){
    sel.innerHTML = PRODUCTS.map(p=>`<option value="${p.id}">${p.label}</option>`).join("");
  }

  // Default to Bar Soap
  sel.value = "bar";

  sel.addEventListener("change", ()=>{
    const choice = PRODUCTS.find(p=>p.id===sel.value) || PRODUCTS[0];
    switchMode(choice);
  });
}

/* -------------------------------
   3) Mode switch: gate features + label
-------------------------------- */
function switchMode(product){
  // Update the small tag label if it exists
  const tag = byId("modeTag");
  if(tag) tag.textContent = product.label;

  // Areas we manage
  const calcCard    = byId("calc") || byId("calculator") || document.body; // main calculator section
  const resultsArea = byId("resTable") || byId("results"); // any results container
  const advancedTabs = ["lyelimited","cost","save","feedback"]
    .map(id => byId(id))
    .filter(Boolean);

  // Clear results for non-ready modes and disable the whole calc area
  if(!product.ready){
    disableInside(calcCard, true);
    if(resultsArea){
      const host = resultsArea.tagName.toLowerCase()==="table" ? resultsArea.parentElement : resultsArea;
      showComingSoon(host);
    }
    // Also visually select the correct tab if you use tab buttons
    $$(".tab").forEach(t=> t.classList.remove("active"));
    const calcTab = $(`.tab[data-tab="calc"]`);
    if(calcTab) calcTab.classList.add("active");
    // Keep auxiliary sections hidden
    advancedTabs.forEach(sec=> sec.classList.add("hide"));
    return;
  }

  // Ready = Bar Soap: enable inputs and restore normal UI
  disableInside(calcCard, false);
  // If you want to auto-recalculate when switching back:
  if(typeof window.calculate === "function"){ try{ window.calculate(); }catch{} }
}

/* -------------------------------
   4) Single Install button (green)
   - Hide the top "Install App (available)" pill/tab if it exists
-------------------------------- */
function setupInstallButton(){
  // Hide the top duplicate if present
  const topInstallLabel = byId("installLabel");
  const topTab = topInstallLabel?.closest(".tab");
  if(topTab){ topTab.classList.add("hide"); }

  // Use only the green button near actions
  const installBtn = byId("installBtn");
  if(!installBtn) return;

  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove("hide");
  });

  installBtn.addEventListener("click", async ()=>{
    if(!deferredPrompt) return;
    try{
      await deferredPrompt.prompt();
      // Optionally: const { outcome } = await deferredPrompt.userChoice;
    }catch{}
    deferredPrompt = null;
  });
}

/* -------------------------------
   5) Boot
-------------------------------- */
document.addEventListener("DOMContentLoaded", ()=>{
  ensureProductDropdown();

  // Default to bar soap mode on load
  const first = PRODUCTS[0];
  switchMode(first);

  setupInstallButton();
});

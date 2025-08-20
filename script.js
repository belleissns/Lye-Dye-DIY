/* ====== LIGHTWEIGHT CONTROLLER FOR CALCULATOR MODE & VISIBILITY ====== */
/* This file only orchestrates UI visibility, mode selection, and the
   "Coming Soon" behavior. It relies on your existing calculate() etc. */

(function () {
  const $ = (s) => document.querySelector(s);

  // Map of product options we support in the UI.
  // Keys are the <option value=""> for #calcMode.
  // Please match these values to the options you rendered in index.html.
  const MODES = {
    bar:       { label: "Bar Soap (NaOH)",    soap: true,  lye: "NaOH"  },
    liquid:    { label: "Liquid Soap (KOH)",  soap: true,  lye: "KOH"   },
    shampooBar:{ label: "Shampoo Bar",        soap: false },
    shampoo:   { label: "Shampoo (Liquid)",   soap: false },
    lipBalm:   { label: "Lip Balm",           soap: false },
    bodyButter:{ label: "Body Butter",        soap: false },
    sugarScrub:{ label: "Sugar Scrub",        soap: false },
    lotion:    { label: "Lotion",             soap: false },
    laundry:   { label: "Laundry Soap",       soap: false },
    dish:      { label: "Dish Soap",          soap: false },
    castile:   { label: "Castile (100% OO)",  soap: true,  lye: "NaOH"  }, // optional alias
  };

  // Friendly banner for “coming soon” products
  const COMING_SOON_HTML = `
    <tr><td colspan="2" style="padding:12px 6px">
      <div style="
        border:1px dashed #e5e7eb; background:#fffaf4; padding:14px; border-radius:12px;
        font-size:14px; line-height:1.5; text-align:center">
        <div style="font-weight:800; margin-bottom:6px">Coming Soon</div>
        <div>Just like a perfectly cured bar of Cold Process Soap,<br>
        this page has to sit for a few weeks before being ready. <b>COMING SOON!</b></div>
      </div>
    </td></tr>`;

  // Cache references (guard for missing nodes so we don’t crash)
  const modeSelect   = $("#calcMode");   // your “Calculator Mode” dropdown
  const modeTag      = $("#modeTag");    // the little pill in the header
  const profileSel   = $("#profile");    // the recipe style/profile select
  const applyBtn     = $("#applyBtn");
  const scaleBtn     = $("#scaleBtn");
  const pctBtn       = $("#pctBtn");     // percent mode toggle
  const lyeTypeSel   = $("#lyeType");    // NaOH / KOH / dual
  const calcBtn      = $("#calcBtn");
  const resTable     = $("#resTable");

  // Helper: find a sensible “block” to hide for profiles (label+select+controls)
  function profileBlock() {
    // Try a few reasonable ancestors to group the profile parts
    if (!profileSel) return null;
    // Go up to the closest direct container grid cell
    let node = profileSel.closest("div");
    // Include its controls row (apply/scale/pct) if present
    return node || profileSel.parentElement;
  }

  // Show/hide the profile UI depending on mode
  function setProfileVisibility(visible) {
    const block = profileBlock();
    if (block) block.classList.toggle("hide", !visible);
    if (applyBtn) applyBtn.classList.toggle("hide", !visible);
    if (scaleBtn) scaleBtn.classList.toggle("hide", !visible);
    if (pctBtn)   pctBtn.classList.toggle("hide", !visible);
  }

  // When switching modes, configure lye type and what’s visible
  function applyMode(modeKey) {
    const cfg = MODES[modeKey];
    if (!cfg) return;

    // Update the header chip label
    if (modeTag) modeTag.textContent = cfg.label || "Calculator";

    // If it’s a soap mode, show profile and set lye type; else hide profile
    setProfileVisibility(!!cfg.soap);

    if (cfg.soap && cfg.lye && lyeTypeSel) {
      lyeTypeSel.value = cfg.lye; // "NaOH" or "KOH"
      // Trigger any dependent UI changes (dual box visibility etc.)
      const evt = new Event("change", { bubbles: true });
      lyeTypeSel.dispatchEvent(evt);
    }

    // For non-soap modes, clear results area to the banner
    if (!cfg.soap && resTable) {
      resTable.innerHTML = COMING_SOON_HTML;
    }
  }

  // Intercept Calculate: if not a soap mode, just show banner
  function onCalculateClicked(e) {
    try {
      const key = modeSelect?.value;
      const cfg = key && MODES[key];

      if (!cfg) return; // unknown: fall through to existing calculate()

      if (!cfg.soap) {
        if (resTable) resTable.innerHTML = COMING_SOON_HTML;
        // Don’t run the soap math
        return;
      }
      // Otherwise, let your real calculate() run (already wired in your page)
      if (typeof window.calculate === "function") {
        window.calculate();
      }
    } catch {
      // Never hard-crash on click
    }
  }

  // Wire events once DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    // Guard: if there’s no selector in this build, abort quietly
    if (!modeSelect) return;

    // Initialize current mode
    const initial = modeSelect.value || "bar";
    applyMode(initial);

    // React to mode changes
    modeSelect.addEventListener("change", () => {
      applyMode(modeSelect.value || "bar");
    });

    // Intercept Calculate button to respect placeholder modes
    if (calcBtn) {
      // Remove any previous listener (in case of hot reload)
      calcBtn.removeEventListener("click", onCalculateClicked);
      calcBtn.addEventListener("click", (e) => {
        e.preventDefault();
        onCalculateClicked(e);
      });
    }
  });
})();

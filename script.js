/* =====================================================================
   Bel Lei’s Soaps N’ Stuffs — Calculator App Core
   COMPLETE script.js REPLACEMENT
   ===================================================================== */

/* ---------- Guard: avoid double init if script is loaded twice ---------- */
if (!window.__BEL_INIT__) {
  window.__BEL_INIT__ = true;

  /* ============================ DATA ============================ */
  const SAP_NaOH = {
    "Olive Oil (pure)": 0.134,
    "Coconut Oil 76°": 0.183,
    "Avocado Oil": 0.133,
    "Lard": 0.141,
    "Shea Butter (raw)": 0.128,
    "Castor Oil": 0.128,
  };
  const OILS = Object.keys(SAP_NaOH);
  const KOH_FACTOR = 1.403; // KOH ≈ NaOH * 1.403

  const defaults = {
    oils: [
      ["Olive Oil (pure)", 450],
      ["Coconut Oil 76°", 300],
      ["Lard", 150],
      ["Shea Butter (raw)", 70],
      ["Castor Oil", 30],
    ],
    potMl: 5678,
  };

  const additivesSpec = {
    frag: { min: 0, max: 4.5 },
    sl: { min: 1, max: 3 },
    salt: { min: 0, max: 3 },
    sugar: { min: 0, max: 3 },
    clay: { min: 0, max: 2 },
    chel: { min: 0, max: 0.5 },
  };

  const FO_RULES = {
    FO: { max: 4.5, tip: "Most FOs 2–4.5%. Check supplier notes for acceleration." },
    "EO-Peppermint": { max: 3.0, tip: "Cool; can feel icy. 1.5–3% typical." },
    "EO-Lavender": { max: 4.0, tip: "Gentle; 2–4% typical." },
    "EO-CinnamonBark": {
      max: 0.5,
      tip: "Dermal max very low. Patch test. Avoid face.",
    },
    "EO-CloveBud": { max: 0.5, tip: "Hot EO; use sparingly. Patch test." },
  };

  let percentMode = false;
  let useOz = false;

  /* ============================ HELPERS ============================ */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const sum = (arr) => arr.reduce((s, x) => s + x, 0);
  const oz = (n) => n / 28.349523125;
  const g = (n) => n * 28.349523125;
  const cssId = (n) => n.replace(/[^a-z0-9]/gi, "_");
  function debounce(fn, ms = 160) {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  }
  function unitLabel() {
    const u = useOz ? "oz" : "g";
    const uEl = $("#uLabel");
    const hdr = $("#wtHdr");
    if (uEl) uEl.textContent = u;
    if (hdr) hdr.textContent = `Weight (${u})`;
  }
  function parseByUnit(v) {
    const n = parseFloat(v) || 0;
    return useOz ? g(n) : n;
  }
  function badge(level, text) {
    const c = level === "ok" ? "b-ok" : level === "warn" ? "b-warn" : "b-danger";
    return `<span class="badge ${c}">${text}</span>`;
  }

  /* ============================ OIL TABLE ============================ */
  function oilRows() {
    const body = $("#oilBody");
    if (!body) return [];
    return [...body.children].map((tr) => {
      const name = tr.querySelector("select")?.value || OILS[0];
      const v = parseFloat(tr.querySelector("input")?.value || 0);
      return [name, v];
    });
  }

  function oilsAsGrams() {
    const rows = oilRows();
    if (!percentMode) {
      return rows.map(([n, v]) => [n, parseByUnit(v)]);
    }
    const target = parseByUnit($("#targetOils")?.value || 0);
    return rows.map(([n, p]) => [n, target * ((+p || 0) / 100)]);
  }

  function addOilRow(name = "", val = 0) {
    const body = $("#oilBody");
    if (!body) return;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><select>${OILS.map((k) => `<option ${k === name ? "selected" : ""}>${k}</option>`).join("")}</select></td>
      <td><input type="number" inputmode="decimal" value="${val ? (percentMode ? val : useOz ? oz(val).toFixed(2) : val) : ""}"></td>
      <td><button class="btn subtle" type="button">Remove</button></td>`;
    tr.querySelector("button").addEventListener("click", () => {
      tr.remove();
      liveUpdate();
    });
    body.appendChild(tr);
  }

  function updateOilTotals() {
    const rows = oilsAsGrams();
    const totG = sum(rows.map((r) => r[1] || 0));
    const host = $("#oilTotals");
    if (host) {
      host.innerHTML = `<div>Total oils: <b>${totG.toFixed(1)} g</b> (${oz(totG).toFixed(2)} oz)</div>`;
    }
  }

  /* ====================== PROFILES / SCALING ======================= */
  function profilePercents(key) {
    if (key === "hard40") return [["Olive Oil (pure)", 40], ["Lard", 40], ["Coconut Oil 76°", 15], ["Castor Oil", 5]];
    if (key === "bubbles") return [["Olive Oil (pure)", 35], ["Coconut Oil 76°", 35], ["Lard", 20], ["Castor Oil", 10]];
    // default Palm-Free Balanced
    return [["Olive Oil (pure)", 45], ["Coconut Oil 76°", 30], ["Lard", 15], ["Shea Butter (raw)", 10]];
  }

  function applyProfile() {
    const tgtG = parseByUnit($("#targetOils")?.value || 0);
    const plan = profilePercents($("#profile")?.value || "PF45-30-15-10");
    const body = $("#oilBody");
    if (!body) return;
    body.innerHTML = "";
    if (percentMode) {
      plan.forEach(([n, p]) => addOilRow(n, p));
    } else {
      let used = 0;
      plan.forEach(([n, p], i) => {
        const grams = i === plan.length - 1 ? tgtG - used : Math.round((tgtG * p) / 100);
        used += grams;
        addOilRow(n, grams);
      });
    }
    updateOilTotals();
    calculate();
  }

  function togglePctMode() {
    percentMode = !percentMode;
    const btn = $("#pctBtn");
    if (btn) btn.textContent = `Percent mode: ${percentMode ? "On" : "Off"}`;
    const hdr = $("#wtHdr");
    if (hdr) hdr.textContent = percentMode ? "Percent (%)" : `Weight (${useOz ? "oz" : "g"})`;

    const rows = oilsAsGrams();
    const body = $("#oilBody");
    if (!body) return;
    body.innerHTML = "";
    if (percentMode) {
      const tgt = sum(rows.map((r) => r[1] || 0)) || parseByUnit($("#targetOils")?.value || 0);
      rows.forEach(([n, grams]) => addOilRow(n, tgt ? (grams / tgt) * 100 : 0));
    } else {
      rows.forEach(([n, grams]) => addOilRow(n, grams));
    }
    updateOilTotals();
    calculate();
  }

  function scaleToTarget() {
    const tgt = parseByUnit($("#targetOils")?.value || 0);
    let rows = oilsAsGrams();
    if (percentMode) {
      const raw = oilRows();
      const totalPct = sum(raw.map((r) => +r[1] || 0)) || 100;
      rows = raw.map(([n, p], i, arr) =>
        [n, i === arr.length - 1
          ? tgt - sum(arr.slice(0, -1).map(([_, p2]) => Math.round((tgt * p2) / totalPct)))
          : Math.round((tgt * p) / totalPct)
        ]);
    } else {
      const cur = sum(rows.map((r) => r[1] || 0)) || 1;
      rows = rows.map(([n, grams]) => [n, (grams * tgt) / cur]);
    }
    const body = $("#oilBody");
    if (!body) return;
    body.innerHTML = "";
    rows.forEach(([n, grams]) => addOilRow(n, grams));
    updateOilTotals();
    calculate();
  }

  /* ====================== LYE / WATER / ADDITIVES ====================== */
  function calcLyeFromOils(rows, sf, type) {
    const baseNa = sum(rows.map(([n, grams]) => grams * (SAP_NaOH[n] || 0)));
    const neededNa = baseNa * (1 - sf / 100);
    const naPur = +($("#lyePurity")?.value || 100),
      koPur = +($("#kohPurity")?.value || 90);

    if (type === "NaOH") return { na: neededNa * (100 / Math.max(1, naPur)), ko: 0 };
    if (type === "KOH") {
      const ko = neededNa * KOH_FACTOR * (100 / Math.max(1, koPur));
      return { na: 0, ko };
    }
    // Dual-lye
    const pctNa = (+($("#dualPct")?.value || 90)) / 100;
    const na = neededNa * pctNa * (100 / Math.max(1, naPur));
    const ko = neededNa * (1 - pctNa) * KOH_FACTOR * (100 / Math.max(1, koPur));
    return { na, ko };
  }

  function waterFromMode(mode, param, totalNaEq, totalOils_g) {
    if (mode === "ratio") return totalNaEq * param;
    if (mode === "pctOil") return totalOils_g * (param / 100);
    if (mode === "pctSoln" || mode === "master") {
      const conc = param / 100;
      return totalNaEq * ((1 - conc) / conc);
    }
    return totalNaEq * 2.5;
  }

  const addPct = (gOils, p) => gOils * (p / 100);

  /* ============================ SAFETY ============================ */
  function rangeBadge(val, min, max, label) {
    if (val === 0) return badge("ok", `${label}: 0 (unused)`);
    if (val < min) return badge("warn", `${label}: low (${val.toFixed(2)}%; min ${min}%)`);
    if (val > max) return badge("danger", `${label}: high (${val.toFixed(2)}%; max ${max}%)`);
    return badge("ok", `${label}: ${val.toFixed(2)}% ok`);
  }

  /* ============================ COSTING ============================ */
  const priceDB = {};
  function renderCostTable(rows, extras) {
    const host = $("#costWrap");
    if (!host) return;
    host.innerHTML = "";
    rows.forEach(([name, grams]) => {
      const row = document.createElement("div");
      row.className = "row3";
      row.innerHTML = `
        <div><label>${name} — package cost ($)</label><input type="number" step="0.01" id="cost_${cssId(name)}" value="${priceDB[name]?.cost || 0}"></div>
        <div><label>Package size (g)</label><input type="number" id="size_${cssId(name)}" value="${priceDB[name]?.size || 0}"></div>
        <div class="note" style="align-self:end">Used: <b>${grams.toFixed(1)} g</b></div>`;
      host.appendChild(row);
    });
    const fo = document.createElement("div");
    fo.className = "row3";
    fo.innerHTML = `
      <div><label>Fragrance/EO — package cost ($)</label><input type="number" step="0.01" id="cost_FO" value="${priceDB.FO?.cost || 0}"></div>
      <div><label>Package size (g)</label><input type="number" id="size_FO" value="${priceDB.FO?.size || 0}"></div>
      <div class="note" style="align-self:end">FO used: <b>${(extras?.fo || 0).toFixed(1)} g</b></div>`;
    host.appendChild(fo);
  }

  function calcCost() {
    const rows = window._last?.rows || [];
    let c = 0;
    rows.forEach(([n, grams]) => {
      const p = {
        cost: +$(`#cost_${cssId(n)}`)?.value || 0,
        size: +$(`#size_${cssId(n)}`)?.value || 0,
      };
      priceDB[n] = p;
      if (p.size > 0) c += (p.cost / p.size) * grams;
    });
    const foCost = { cost: +$("#cost_FO")?.value || 0, size: +$("#size_FO")?.value || 0 };
    priceDB.FO = foCost;
    if (foCost.size > 0) c += (foCost.cost / foCost.size) * (window._last?.fo || 0);

    const bars = +$("#barsCount")?.value || 10,
      price = +$("#priceBar")?.value || 0;
    const perBar = c / (bars || 1);
    const margin = price ? ((price - perBar) / price) * 100 : 0;
    const host = $("#costSummary");
    if (host) {
      host.innerHTML = `
        <div>COGS (batch): <b>$${c.toFixed(2)}</b></div>
        <div>COGS per bar: <b>$${perBar.toFixed(2)}</b></div>
        <div>Price/bar: <b>$${price.toFixed(2)}</b></div>
        <div>Gross margin: <b>${margin.toFixed(1)}%</b></div>`;
    }
  }

  /* ============================ RESULTS ============================ */
  const fragranceCap = (type) => FO_RULES[type]?.max ?? 4.5;
  const concFrom = (lye, water) => {
    const conc = (lye / (lye + water)) * 100;
    return isFinite(conc) ? conc : 0;
  };

  function calculate() {
    // Gate: only for soap modes
    const mode = $("#modeSelect")?.value || "bar";
    if (!(mode === "bar" || mode === "liquid")) {
      showPlaceholder();
      return;
    }
    hidePlaceholder();

    const rows = oilsAsGrams();
    const gOils = sum(rows.map(([_, grams]) => grams || 0));
    const sf = +$("#superfat")?.value || 0;

    const type = $("#lyeType")?.value || "NaOH";
    const { na, ko } = calcLyeFromOils(rows, sf, type);
    const totalNaEq = na + ko / KOH_FACTOR;

    const water = waterFromMode(
      $("#waterMode")?.value || "ratio",
      +$("#waterParam")?.value || 2.5,
      totalNaEq,
      gOils
    );

    const foType = $("#foType")?.value || "FO";
    const foMax = fragranceCap(foType);
    const fragPct = +$("#fragPct")?.value || 0;
    const slPct = +$("#slPct")?.value || 0;
    const saltPct = +$("#saltPct")?.value || 0;
    const sugarPct = +$("#sugarPct")?.value || 0;
    const clayPct = +$("#clayPct")?.value || 0;
    const chelPct = +$("#chelPct")?.value || 0;

    const fo = addPct(gOils, fragPct),
      sl = addPct(gOils, slPct),
      salt = addPct(gOils, saltPct),
      sugar = addPct(gOils, sugarPct),
      clay = addPct(gOils, clayPct),
      chel = addPct(gOils, chelPct);

    const milk = water * ((+$("#milkPct")?.value || 0) / 100);
    const batch = gOils + (na + ko) + water + fo + sl + salt + sugar + clay + chel;

    const pot = +$("#potMl")?.value || 0;
    const safeMin = pot * 0.6,
      safeMax = pot * 0.75;

    const res = $("#resTable");
    if (res) {
      res.innerHTML = `
        <tr><th>NaOH (solid)</th><td>${na.toFixed(2)} g (${oz(na).toFixed(2)} oz)</td></tr>
        <tr><th>KOH (flakes)</th><td>${ko.toFixed(2)} g (${oz(ko).toFixed(2)} oz)</td></tr>
        <tr><th>Water (total)</th><td>${water.toFixed(2)} g (${oz(water).toFixed(2)} oz)</td></tr>
        <tr><th>Milk portion</th><td>${milk.toFixed(2)} g (${(+$("#milkPct")?.value || 0)}%)</td></tr>
        <tr><th>Fragrance / EO</th><td>${fo.toFixed(2)} g (${fragPct}%)</td></tr>
        <tr><th>Sodium Lactate</th><td>${sl.toFixed(2)} g (${slPct}%)</td></tr>
        <tr><th>Salt</th><td>${salt.toFixed(2)} g (${saltPct}%)</td></tr>
        <tr><th>Sugar</th><td>${sugar.toFixed(2)} g (${sugarPct}%)</td></tr>
        <tr><th>Clay</th><td>${clay.toFixed(2)} g (${clayPct}%)</td></tr>
        <tr><th>EDTA/Citrate</th><td>${chel.toFixed(2)} g (${chelPct}%)</td></tr>
        <tr><th><b>Total batch weight</b></th><td><b>${batch.toFixed(1)} g</b> (${oz(batch).toFixed(2)} oz)</td></tr>
        ${pot ? `<tr><th>Recommended pot fill (60–75%)</th><td>${safeMin.toFixed(0)}–${safeMax.toFixed(0)} g</td></tr>` : ""}`;
    }

    const conc = concFrom(totalNaEq, water);
    const caps = [];
    if (conc < 25) caps.push(badge("warn", `Lye conc ${conc.toFixed(1)}% (dilute → slow trace)`));
    else if (conc <= 27.9) caps.push(badge("ok", `Lye conc ${conc.toFixed(1)}% (on dilute side)`));
    else if (conc <= 33) caps.push(badge("ok", `Lye conc ${conc.toFixed(1)}% sweet spot`));
    else if (conc <= 38) caps.push(badge("warn", `Lye conc ${conc.toFixed(1)}% (strong → faster trace)`));
    else caps.push(badge("danger", `Lye conc ${conc.toFixed(1)}% (very strong)`));

    const wm = $("#waterMode")?.value || "ratio",
      wp = +$("#waterParam")?.value || 2.5;
    if (wm === "ratio" && (wp < 1.7 || wp > 3.0))
      caps.push(badge("warn", `Water:lye ${wp} outside common range (1.7–3.0)`));

    const foCapBadge =
      fragPct > foMax
        ? badge("danger", `FO/EO ${fragPct}% > max ${foMax}% (${$("#foType")?.selectedOptions?.[0]?.text || foType})`)
        : fragPct === 0
        ? badge("ok", "FO/EO: 0 (unused)")
        : badge("ok", `FO/EO ${fragPct}% ≤ max ${foMax}%`);
    caps.push(foCapBadge);

    if (sf < 2) caps.push(badge("warn", `Superfat low (${sf}%)`));
    if (sf > 12) caps.push(badge("danger", `Superfat high (${sf}%)`));

    if (pot) {
      if (batch > safeMax) caps.push(badge("danger", "Exceeds ~75% pot capacity (overflow risk)"));
      else if (batch >= safeMin) caps.push(badge("ok", "Capacity: within safe headroom"));
    }
    const saf = $("#safetyBadges");
    if (saf) saf.innerHTML = caps.join(" ");

    $("#foNote") && ($("#foNote").textContent = FO_RULES[foType]?.tip || "");
    renderCostTable(rows, { fo });
    window._last = { na, ko, water, fo, batch, rows };
  }

  /* ============================ LYE-LIMITED ============================ */
  function calcLyeLimited() {
    const naAvail = +$("#availLye")?.value || 0;
    const sf = +$("#sfLL")?.value || 5;
    const ratio = +$("#ratioLL")?.value || 2.5;
    const plan = profilePercents($("#profileLL")?.value || "PF45-30-15-10");
    const SAPmix = sum(plan.map(([n, p]) => (p / 100) * (SAP_NaOH[n] || 0)));
    const oilsForNa = naAvail / ((1 - sf / 100) * SAPmix);
    const fo = oilsForNa * 0.03;
    const water = naAvail * ratio;
    const rows = plan.map(([n, p]) => [n, oilsForNa * (p / 100)]);
    const batch = oilsForNa + naAvail + water + fo;

    const host = $("#llRes");
    if (host) {
      host.innerHTML = `
        <tr><th>Total oils</th><td>${oilsForNa.toFixed(1)} g</td></tr>
        ${rows.map(([n, grams]) => `<tr><th>&nbsp;&nbsp;• ${n}</th><td>${grams.toFixed(1)} g</td></tr>`).join("")}
        <tr><th>NaOH</th><td>${naAvail.toFixed(1)} g</td></tr>
        <tr><th>Water (@ ${ratio})</th><td>${water.toFixed(1)} g</td></tr>
        <tr><th>FO (3%)</th><td>${fo.toFixed(1)} g</td></tr>
        <tr><th><b>Estimated batch</b></th><td><b>${batch.toFixed(1)} g</b></td></tr>`;
    }
  }

  /* ================== SAVE / LOAD / EXPORT / PWA ================== */
  const KEY = "BelLei_Recipes";

  function collectInputs() {
    return {
      oils: oilsAsGrams(),
      target: parseByUnit($("#targetOils")?.value || 0),
      profile: $("#profile")?.value,
      percentMode,
      lyeType: $("#lyeType")?.value,
      lyePurity: +$("#lyePurity")?.value || 100,
      kohPurity: +$("#kohPurity")?.value || 90,
      dualPct: +$("#dualPct")?.value || 90,
      sf: +$("#superfat")?.value || 0,
      waterMode: $("#waterMode")?.value,
      waterParam: +$("#waterParam")?.value || 2.5,
      milkPct: +$("#milkPct")?.value || 0,
      potMl: +$("#potMl")?.value || 0,
      adds: {
        fo: +$("#fragPct")?.value || 0,
        sl: +$("#slPct")?.value || 0,
        salt: +$("#saltPct")?.value || 0,
        sugar: +$("#sugarPct")?.value || 0,
        clay: +$("#clayPct")?.value || 0,
        chel: +$("#chelPct")?.value || 0,
      },
      foType: $("#foType")?.value,
      mode: $("#modeSelect")?.value || "bar",
    };
  }

  function applyInputs(d = {}) {
    if ($("#targetOils")) $("#targetOils").value = useOz ? oz(d.target || 1000).toFixed(2) : (d.target || 1000);
    if ($("#profile")) $("#profile").value = d.profile || "PF45-30-15-10";
    percentMode = !!d.percentMode;
    if ($("#pctBtn")) $("#pctBtn").textContent = `Percent mode: ${percentMode ? "On" : "Off"}`;
    if ($("#lyeType")) $("#lyeType").value = d.lyeType || "NaOH";
    if ($("#lyePurity")) $("#lyePurity").value = d.lyePurity || 100;
    if ($("#kohPurity")) $("#kohPurity").value = d.kohPurity || 90;
    if ($("#dualPct")) $("#dualPct").value = d.dualPct || 90;
    if ($("#superfat")) $("#superfat").value = d.sf || 5;
    if ($("#waterMode")) $("#waterMode").value = d.waterMode || "ratio";
    if ($("#waterParam")) $("#waterParam").value = d.waterParam || 2.5;
    if ($("#milkPct")) $("#milkPct").value = d.milkPct || 0;
    if ($("#potMl")) $("#potMl").value = d.potMl || 0;
    if ($("#foType")) $("#foType").value = d.foType || "FO";

    if ($("#fragPct")) $("#fragPct").value = d.adds?.fo ?? 3;
    if ($("#slPct")) $("#slPct").value = d.adds?.sl ?? 0;
    if ($("#saltPct")) $("#saltPct").value = d.adds?.salt ?? 0;
    if ($("#sugarPct")) $("#sugarPct").value = d.adds?.sugar ?? 0;
    if ($("#clayPct")) $("#clayPct").value = d.adds?.clay ?? 0;
    if ($("#chelPct")) $("#chelPct").value = d.adds?.chel ?? 0;

    const body = $("#oilBody");
    if (body) {
      body.innerHTML = "";
      if (percentMode) {
        const list = d.oils || defaults.oils;
        const tot = sum(list.map((r) => r[1] || 0)) || 1;
        list.forEach(([n, grams]) => addOilRow(n, ((grams / tot) * 100).toFixed(2)));
        $("#wtHdr") && ($("#wtHdr").textContent = "Percent (%)");
      } else {
        (d.oils || defaults.oils).forEach(([n, grams]) => addOilRow(n, grams));
        $("#wtHdr") && ($("#wtHdr").textContent = `Weight (${useOz ? "oz" : "g"})`);
      }
    }
  }

  function saveRecipe() {
    const name = prompt("Recipe name to save:", $("#recName")?.value || "")?.trim();
    if (!name) return;
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    all[name] = collectInputs();
    localStorage.setItem(KEY, JSON.stringify(all));
    if ($("#recName")) $("#recName").value = name;
    alert("Saved!");
  }

  function loadRecipe() {
    const name = prompt("Load which recipe name?", $("#recName")?.value || "")?.trim();
    if (!name) return;
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    const d = all[name];
    if (!d) return alert("Not found.");
    applyInputs(d);
    setMode(d.mode || "bar");
    calculate();
  }

  function listRecipes() {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    const list = Object.keys(all);
    const host = $("#saveList");
    if (!host) return;
    host.innerHTML = list.length
      ? list.map((n) => `<div class="tag">${n}</div>`).join("")
      : `<div class="note">No saved recipes yet.</div>`;
  }

  function deleteRecipe() {
    const name = prompt("Delete which recipe name?", $("#recName")?.value || "")?.trim();
    if (!name) return;
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    delete all[name];
    localStorage.setItem(KEY, JSON.stringify(all));
    listRecipes();
    alert("Deleted (if it existed).");
  }

  function exportJSON() {
    const payload = { ts: new Date().toISOString(), inputs: collectInputs(), results: window._last || {} };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "BelLeis_Recipe.json";
    a.click();
  }

  /* ============== OPTIONAL PWA: conditional SW registration ============== */
  async function maybeRegisterSW() {
    if (!("serviceWorker" in navigator)) return;
    const swURL = new URL("./sw.js", location.href).href;
    try {
      const res = await fetch(swURL, { method: "HEAD", cache: "no-store" });
      if (res && res.ok) {
        await navigator.serviceWorker.register("./sw.js").catch(() => {});
        $("#installBtn")?.classList.remove("hide");
        $("#installLabel") && ($("#installLabel").textContent = "Install App (available)");
      } else {
        console.info("SW not found — skipping registration.");
      }
    } catch (err) {
      console.info("Skipping SW registration:", err?.message || err);
    }
  }

  /* ============================ MODE HANDLING ============================ */
  // For now: Bar + Liquid soap are live. All others show a “coming soon” placeholder.
  function showPlaceholder() {
    const calcSectionBits = $$("#calc fieldset, #calc .controls.stickyCalc, #results");
    calcSectionBits.forEach((el) => el.classList.add("hide"));

    let ph = $("#modePlaceholder");
    if (!ph) {
      ph = document.createElement("div");
      ph.id = "modePlaceholder";
      ph.className = "card";
      ph.style.border = "1px dashed #e5e7eb";
      const holder = $("#calc");
      holder && holder.appendChild(ph);
    }
    const modeSelect = $("#modeSelect");
    const label = modeSelect?.options?.[modeSelect.selectedIndex]?.text || "this mode";
    ph.innerHTML = `
      <h3 style="margin:6px 0 10px">${label}</h3>
      <p class="note">🚧 The calculator for <b>${label}</b> is coming soon.
      You can still browse other modes from the dropdown above.</p>`;
  }

  function hidePlaceholder() {
    const ph = $("#modePlaceholder");
    if (ph) ph.remove();
    const calcSectionBits = $$("#calc fieldset, #calc .controls.stickyCalc, #results");
    calcSectionBits.forEach((el) => el.classList.remove("hide"));
  }

  function setMode(mode) {
    // Update the “tag” if present
    const modeTag = $("#modeTag");
    const modeSelect = $("#modeSelect");
    if (modeTag && modeSelect) {
      modeTag.textContent = modeSelect.options[modeSelect.selectedIndex].text.replace(/^[^\w]*\s*/, "");
    }

    const lyeSel = $("#lyeType");
    // Bar soap = NaOH (lock selector); Liquid soap = KOH (lock selector)
    if (mode === "bar") {
      if (lyeSel) {
        lyeSel.value = "NaOH";
        lyeSel.disabled = true;
      }
      hidePlaceholder();
      calculate();
    } else if (mode === "liquid") {
      if (lyeSel) {
        lyeSel.value = "KOH";
        lyeSel.disabled = true;
      }
      hidePlaceholder();
      calculate();
    } else {
      // unlock selector state but hide whole calculator and show placeholder
      if (lyeSel) lyeSel.disabled = false;
      showPlaceholder();
    }
  }

  /* ============================ TABS & EVENTS ============================ */
  const liveUpdate = debounce(() => {
    updateOilTotals();
    calculate();
  }, 120);

  function bindEventsOnce() {
    // Tabs
    $$(".tab").forEach((t) => {
      t.addEventListener("click", () => {
        $$(".tab").forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
        const id = t.dataset.tab;
        ["calc", "lyelimited", "cost", "save", "feedback", "install"].forEach((sec) => {
          const el = $("#" + sec);
          if (!el) return;
          el.classList.toggle("hide", sec !== id && !(id === "install" && sec === "calc"));
        });
        if (id === "cost" && window._last?.rows) renderCostTable(window._last.rows, { fo: window._last.fo });
      });
    });

    // Oils editor
    $("#oilBody")?.addEventListener("input", (e) => {
      if (e.target.matches("input,select")) liveUpdate();
    });
    $("#oilBody")?.addEventListener("change", (e) => {
      if (e.target.matches("input,select")) liveUpdate();
    });

    $("#addOil")?.addEventListener("click", () => addOilRow(OILS[0], 0));
    $("#applyBtn")?.addEventListener("click", applyProfile);
    $("#scaleBtn")?.addEventListener("click", scaleToTarget);
    $("#pctBtn")?.addEventListener("click", togglePctMode);

    $("#unitToggle")?.addEventListener("click", (e) => {
      e.preventDefault();
      useOz = !useOz;
      unitLabel();
      const rows = oilsAsGrams();
      const body = $("#oilBody");
      if (!body) return;
      body.innerHTML = "";
      rows.forEach(([n, grams]) => addOilRow(n, grams));
      updateOilTotals();
      calculate();
    });

    // Lye limited
    $("#llBtn")?.addEventListener("click", calcLyeLimited);

    // Inputs that should trigger recalc
    ["lyeType", "lyePurity", "kohPurity", "dualPct", "superfat", "waterMode", "waterParam", "milkPct", "potMl", "moldPreset",
     "fragPct", "foType", "slPct", "saltPct", "sugarPct", "clayPct", "chelPct"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", liveUpdate);
      el.addEventListener("change", liveUpdate);
    });

    $("#moldPreset")?.addEventListener("change", () => {
      $("#moldInputs")?.classList.toggle("hide", !$("#moldPreset")?.value);
    });

    $("#moldEstimate")?.addEventListener("click", (e) => {
      e.preventDefault();
      const type = $("#moldPreset")?.value;
      let ml = 0;
      if (type === "loaf" || type === "slab") {
        const L = +$("#mL")?.value || 0,
          W = +$("#mW")?.value || 0,
          H = +$("#mH")?.value || 0;
        ml = L * W * H;
      }
      if (type === "cavity") {
        const v = +$("#cavMl")?.value || 0,
          n = +$("#cavCount")?.value || 0;
        ml = v * n;
      }
      if (ml > 0) {
        const est = Math.round(ml * 0.7);
        if ($("#targetOils")) $("#targetOils").value = useOz ? oz(est).toFixed(2) : est;
      }
      liveUpdate();
    });

    // Buttons
    $("#calcBtn")?.addEventListener("click", calculate);
    $("#printBtn")?.addEventListener("click", () => window.print());
    $("#exportBtn")?.addEventListener("click", exportJSON);

    // Cost & Save/Load
    $("#costBtn")?.addEventListener("click", calcCost);
    $("#saveBtn")?.addEventListener("click", saveRecipe);
    $("#loadBtn")?.addEventListener("click", loadRecipe);
    $("#listBtn")?.addEventListener("click", listRecipes);
    $("#delBtn")?.addEventListener("click", deleteRecipe);
    $("#fbSave")?.addEventListener("click", () => {
      localStorage.setItem("bel_fb", $("#fb")?.value || "");
      alert("Saved locally!");
    });

    // Dual box + water label
    $("#lyeType")?.addEventListener("change", () => {
      $("#dualBox")?.classList.toggle("hide", $("#lyeType")?.value !== "dual");
      liveUpdate();
    });
    $("#waterMode")?.addEventListener("change", () => {
      const map = { ratio: "Water : Lye", pctOil: "Water % of oils", pctSoln: "Lye conc %", master: "Master-batch %" };
      const lbl = $("#waterParamLbl");
      if (lbl) lbl.textContent = map[$("#waterMode")?.value] || "Water";
    });

    // Install prompt (shown only if SW is present)
    let _deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      _deferredPrompt = e;
      $("#installBtn")?.classList.remove("hide");
      $("#installLabel") && ($("#installLabel").textContent = "Install App (available)");
    });
    $("#installBtn")?.addEventListener("click", () => {
      if (window._deferredPrompt) window._deferredPrompt.prompt();
      else if (_deferredPrompt) _deferredPrompt.prompt();
    });

    // Mode select
    $("#modeSelect")?.addEventListener("change", () => {
      const m = $("#modeSelect").value;
      setMode(m);
    });
  }

  /* ============================ INIT ============================ */
  document.addEventListener("DOMContentLoaded", async () => {
    unitLabel();

    // Oils default rows
    const body = $("#oilBody");
    if (body) {
      body.innerHTML = "";
      defaults.oils.forEach((o) => addOilRow(...o));
    }
    if ($("#potMl")) $("#potMl").value = defaults.potMl;

    bindEventsOnce();

    // Start in Bar Soap mode if available
    const modeSel = $("#modeSelect");
    const startMode = modeSel ? modeSel.value : "bar";
    setMode(startMode);

    calculate();
    await maybeRegisterSW();

    runSelfTests(); // console output only
  });

  /* ============================ SELF-TESTS ============================ */
  function almostEqual(a, b, t = 1e-2) {
    return Math.abs(a - b) <= t;
  }
  function runSelfTests() {
    const out = [];
    let pass = 0, total = 0;
    function test(name, fn) {
      total++;
      try {
        const ok = !!fn();
        if (ok) {
          pass++;
          out.push(`✅ ${name}`);
        } else {
          out.push(`❌ ${name}`);
        }
      } catch (e) {
        out.push(`💥 ${name} threw: ${e.message || e}`);
      }
    }

    // Tests
    test("SAP table has common oils", () => !!SAP_NaOH["Olive Oil (pure)"] && !!SAP_NaOH["Coconut Oil 76°"]);
    test("addPct works", () => almostEqual(addPct(1000, 3), 30));
    test("concFrom behaves", () => almostEqual(concFrom(100, 200), (100 / 300) * 100));
    test("calcLyeFromOils basic NaOH", () => {
      const rows = [["Olive Oil (pure)", 500], ["Coconut Oil 76°", 500]];
      const { na, ko } = calcLyeFromOils(rows, 5, "NaOH");
      return na > 0 && ko === 0;
    });
    test("waterFromMode ratio", () => almostEqual(waterFromMode("ratio", 2.5, 100, 1000), 250));
    test("profilePercents returns 4 rows", () => profilePercents("bubbles").length === 4);

    console.log(`[Self-tests] ${pass}/${total} passed`);
    out.forEach((line) => console.log(line));
  }
}

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
      price = +$("#priceBar")?.val

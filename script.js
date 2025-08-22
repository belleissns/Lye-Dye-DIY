/* ===========================
   Bel Lei's Soaps N Stuffs — Minimal Working Build
   - Bar Soap fully functional (beginner-friendly)
   - Other products show Coming Soon message + disable inputs
=========================== */

// Convert ounces to grams
function toGrams(oz){ return oz * 28.3495; }

// Switch visible mode + enable/disable inputs
function switchMode(mode) {
  const modeTag = document.getElementById("modeTag");
  const resultsArea = document.getElementById("results");
  const inputs = document.querySelectorAll(".calculator input, .calculator

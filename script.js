function calculateBatch() {
  const lyeValue = parseFloat(document.getElementById("lyeInput").value);
  const lyeUnit = document.getElementById("lyeUnit").value;

  if (isNaN(lyeValue) || lyeValue <= 0) {
    document.getElementById("results").innerHTML = "⚠️ Enter a valid Lye amount.";
    return;
  }

  // Convert to grams if entered in ounces
  let lyeGrams = (lye

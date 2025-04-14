function parseThreshold(threshold) {
  let negate = false;
  if (threshold.startsWith("@")) {
    negate = true;
    threshold = threshold.substring(1);
  }

  let [start, end] = threshold.split(":");
  if (end === undefined) {
    start = 0;
    end = threshold;
  }

  if (start === "") start = 0;
  if (end === "") end = Infinity;
  if (start === "~") start = -Infinity;

  return { negate, start: parseFloat(start), end: parseFloat(end) };
}

function evaluate(value, threshold) {
  let { negate, start, end } = parseThreshold(threshold);
  const inRange = value >= start && value <= end;
  const matched = negate ? inRange : !inRange;
  return { matched, start, end, negate };
}

function updateResult() {
  const value = parseFloat(document.getElementById("value").value);
  const warn = document.getElementById("threshold_warning").value.trim();
  const crit = document.getElementById("threshold_critical").value.trim();

  const resultDiv = document.getElementById("result");
  const detailsDiv = document.getElementById("details");

  if (isNaN(value)) {
    resultDiv.textContent = "Résultat";
    resultDiv.style.backgroundColor = "";
    detailsDiv.textContent = "";
    return;
  }

  let status = "OK",
    reason = "";
  try {
    if (crit) {
      const r = evaluate(value, crit);
      if (r.matched) {
        status = "CRITICAL";
        reason = `CRITICAL (${r.negate ? "dans" : "hors de"} [${r.start}, ${r.end}])`;
      }
    }
    if (status === "OK" && warn) {
      const r = evaluate(value, warn);
      if (r.matched) {
        status = "WARNING";
        reason = `WARNING (${r.negate ? "dans" : "hors de"} [${r.start}, ${r.end}])`;
      }
    }

    resultDiv.textContent = status;
    resultDiv.style.backgroundColor =
      status === "OK"
        ? "#33cc33"
        : status === "WARNING"
          ? "#ffd500"
          : "#ff4d4d";

    detailsDiv.textContent = `Valeur : ${value}
Statut : ${status}${reason ? " → " + reason : ""}
Seuil WARNING : ${warn}
Seuil CRITICAL : ${crit}`;
  } catch {
    resultDiv.textContent = "Erreur";
    resultDiv.style.backgroundColor = "gray";
    detailsDiv.textContent = "";
  }
}

function randomThreshold() {
  const a = Math.floor(Math.random() * 10);
  const b = a + Math.floor(Math.random() * 20) + 5;
  return `${a}:${b}`;
}

function randomValue() {
  return (Math.random() * 50).toFixed(2);
}

// Init
document.getElementById("threshold_warning").value = randomThreshold();
document.getElementById("threshold_critical").value = randomThreshold();
document.getElementById("value").value = randomValue();
updateResult();

document
  .getElementById("threshold_warning")
  .addEventListener("input", updateResult);
document
  .getElementById("threshold_critical")
  .addEventListener("input", updateResult);
document.getElementById("value").addEventListener("input", updateResult);

// Analyse de perfdata
document.getElementById("perfdata").addEventListener("input", () => {
  const input = document.getElementById("perfdata").value.trim();
  const match = input.match(/=([^;]+);([^;]*);([^;]*);/);
  if (match) {
    const value = match[1].replace(/[a-zA-Z]/g, "");
    const warn = match[2];
    const crit = match[3];
    if (!isNaN(parseFloat(value))) {
      document.getElementById("value").value = value;
    }
    if (warn) {
      document.getElementById("threshold_warning").value = warn;
    }
    if (crit) {
      document.getElementById("threshold_critical").value = crit;
    }
    updateResult();
  }
});

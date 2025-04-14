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
  const isWarning = negate ? inRange : !inRange;
  return { isWarning, start, end, negate };
}

function randomThreshold() {
  const type = Math.floor(Math.random() * 4);
  let t;
  switch (type) {
    case 0:
      t = `${Math.floor(Math.random() * 20) + 10}`;
      break;
    case 1:
      const a = Math.floor(Math.random() * 10);
      const b = a + Math.floor(Math.random() * 20) + 5;
      t = `${a}:${b}`;
      break;
    case 2:
      const c = Math.floor(Math.random() * 10);
      const d = c + Math.floor(Math.random() * 10) + 1;
      t = `@${c}:${d}`;
      break;
    default:
      const max = Math.floor(Math.random() * 30) + 10;
      t = `~:${max}`;
  }
  return t;
}

function randomValue() {
  return (Math.random() * 50).toFixed(2);
}

const thresholdInput = document.getElementById("threshold");
const valueInput = document.getElementById("value");
const resultDiv = document.getElementById("result");
const detailsDiv = document.getElementById("details");

function updateResult() {
  const threshold = thresholdInput.value.trim();
  const value = parseFloat(valueInput.value);

  if (threshold === "" || isNaN(value)) {
    resultDiv.textContent = "Résultat";
    resultDiv.style.backgroundColor = "";
    detailsDiv.textContent = "";
    return;
  }

  try {
    const { isWarning, start, end, negate } = evaluate(value, threshold);
    const status = isWarning
      ? value > end || value < start
        ? "CRITICAL"
        : "WARNING"
      : "OK";

    resultDiv.textContent = status;
    resultDiv.style.backgroundColor =
      status === "OK"
        ? "#33cc33"
        : status === "WARNING"
          ? "#ffd500"
          : "#ff4d4d";

    const rangeText = negate
      ? `valeur DOIT être dans [${start}, ${end}]`
      : `valeur DOIT être hors de [${start}, ${end}]`;

    detailsDiv.textContent = `Seuil : ${threshold}
Valeur : ${value}
Statut : ${status} (${rangeText})`;
  } catch {
    resultDiv.textContent = "Erreur threshold";
    resultDiv.style.backgroundColor = "gray";
    detailsDiv.textContent = "";
  }
}

// Init aléatoire
thresholdInput.value = randomThreshold();
valueInput.value = randomValue();
updateResult();

thresholdInput.addEventListener("input", updateResult);
valueInput.addEventListener("input", updateResult);

// Nouveau : analyse de perfdata
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
    if (crit) {
      document.getElementById("threshold").value = crit;
    } else if (warn) {
      document.getElementById("threshold").value = warn;
    }
    updateResult();
  }
});

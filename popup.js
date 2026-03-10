function parseThreshold(threshold) {
  if (!threshold || !threshold.trim()) return null;
  threshold = threshold.trim();

  let negate = false;
  if (threshold.startsWith("@")) {
    negate = true;
    threshold = threshold.substring(1);
  }

  let start, end;
  if (threshold.includes(":")) {
    [start, end] = threshold.split(":");
  } else {
    start = "0";
    end = threshold;
  }

  if (start === "" || start === "~") {
    start = start === "~" ? -Infinity : 0;
  } else {
    start = parseFloat(start);
  }

  if (end === "") {
    end = Infinity;
  } else {
    end = parseFloat(end);
  }

  if (isNaN(start) || isNaN(end)) return null;

  return { negate, start, end };
}

function evaluate(value, threshold) {
  const parsed = parseThreshold(threshold);
  if (!parsed) return { matched: false, start: 0, end: 0, negate: false };
  const { negate, start, end } = parsed;
  const inRange = value >= start && value <= end;
  const matched = negate ? inRange : !inRange;
  return { matched, start, end, negate };
}

function formatBound(v) {
  if (v === Infinity) return "+∞";
  if (v === -Infinity) return "-∞";
  return String(v);
}

function updateResult() {
  const value = parseFloat(document.getElementById("value").value);
  const warn = document.getElementById("threshold_warning").value.trim();
  const crit = document.getElementById("threshold_critical").value.trim();

  const resultDiv = document.getElementById("result");
  const detailsDiv = document.getElementById("details");
  const rangeBar = document.getElementById("range-bar");

  if (isNaN(value)) {
    resultDiv.textContent = "Result";
    resultDiv.style.backgroundColor = "#45475a";
    resultDiv.style.color = "#cdd6f4";
    detailsDiv.textContent = "";
    rangeBar.innerHTML = "";
    return;
  }

  let status = "OK";
  let reason = "";

  try {
    if (crit) {
      const r = evaluate(value, crit);
      if (r.matched) {
        status = "CRITICAL";
        reason = `${r.negate ? "inside" : "outside"} [${formatBound(r.start)}, ${formatBound(r.end)}]`;
      }
    }
    if (status === "OK" && warn) {
      const r = evaluate(value, warn);
      if (r.matched) {
        status = "WARNING";
        reason = `${r.negate ? "inside" : "outside"} [${formatBound(r.start)}, ${formatBound(r.end)}]`;
      }
    }

    const colors = {
      OK: { bg: "#a6e3a1", fg: "#1e1e2e" },
      WARNING: { bg: "#f9e2af", fg: "#1e1e2e" },
      CRITICAL: { bg: "#f38ba8", fg: "#1e1e2e" },
    };
    resultDiv.textContent = status;
    resultDiv.style.backgroundColor = colors[status].bg;
    resultDiv.style.color = colors[status].fg;

    let lines = [`Value: ${value}`, `Status: ${status}`];
    if (reason) lines.push(`Reason: ${reason}`);
    if (warn) lines.push(`Warning threshold: ${warn}`);
    if (crit) lines.push(`Critical threshold: ${crit}`);
    detailsDiv.textContent = lines.join("\n");

    drawRangeBar(value, warn, crit);
  } catch {
    resultDiv.textContent = "Error";
    resultDiv.style.backgroundColor = "#585b70";
    resultDiv.style.color = "#cdd6f4";
    detailsDiv.textContent = "";
    rangeBar.innerHTML = "";
  }
}

function drawRangeBar(value, warnStr, critStr) {
  const bar = document.getElementById("range-bar");
  bar.innerHTML = "";

  const warnParsed = parseThreshold(warnStr);
  const critParsed = parseThreshold(critStr);

  if (!warnParsed && !critParsed) return;

  // Collect all finite bounds to determine scale
  const bounds = [value];
  for (const p of [warnParsed, critParsed]) {
    if (!p) continue;
    if (isFinite(p.start)) bounds.push(p.start);
    if (isFinite(p.end)) bounds.push(p.end);
  }

  const minB = Math.min(...bounds);
  const maxB = Math.max(...bounds);
  const padding = Math.max((maxB - minB) * 0.2, 1);
  const scaleMin = minB - padding;
  const scaleMax = maxB + padding;
  const range = scaleMax - scaleMin;

  function toPercent(v) {
    if (v === -Infinity) return 0;
    if (v === Infinity) return 100;
    return ((v - scaleMin) / range) * 100;
  }

  // Draw zones
  function addZone(parsed, color) {
    if (!parsed) return;
    const left = toPercent(parsed.start);
    const right = toPercent(parsed.end);
    const zone = document.createElement("div");
    zone.className = "zone";
    zone.style.left = left + "%";
    zone.style.width = (right - left) + "%";
    zone.style.backgroundColor = color;
    bar.appendChild(zone);
  }

  addZone(critParsed, "#f38ba8");
  addZone(warnParsed, "#f9e2af");

  // Value marker
  const marker = document.createElement("div");
  marker.className = "marker";
  marker.style.left = toPercent(value) + "%";
  bar.appendChild(marker);
}

// Parse perfdata string into array of metrics
function parsePerfdata(input) {
  const metrics = [];
  // Perfdata format: 'label'=value[UOM];[warn];[crit];[min];[max]
  // Multiple metrics separated by spaces
  const regex = /(?:'([^']+)'|(\S+?))=([^;\s]*);?([^;\s]*)?;?([^;\s]*)?;?([^;\s]*)?;?([^;\s]*)?/g;
  let m;
  while ((m = regex.exec(input)) !== null) {
    const label = m[1] || m[2];
    const rawValue = m[3];
    const value = rawValue.replace(/[a-zA-Z%]+$/, "");
    const uom = rawValue.replace(value, "");
    metrics.push({
      label,
      value,
      uom,
      warn: m[4] || "",
      crit: m[5] || "",
      min: m[6] || "",
      max: m[7] || "",
    });
  }
  return metrics;
}

function applyMetric(metric) {
  if (metric.value && !isNaN(parseFloat(metric.value))) {
    document.getElementById("value").value = metric.value;
  }
  if (metric.warn) {
    document.getElementById("threshold_warning").value = metric.warn;
  }
  if (metric.crit) {
    document.getElementById("threshold_critical").value = metric.crit;
  }
  updateResult();
}

// Perfdata input handler
document.getElementById("perfdata").addEventListener("input", () => {
  const input = document.getElementById("perfdata").value.trim();
  const select = document.getElementById("metric-select");

  const metrics = parsePerfdata(input);

  if (metrics.length === 0) {
    select.classList.remove("visible");
    select.innerHTML = "";
    return;
  }

  if (metrics.length > 1) {
    select.innerHTML = "";
    metrics.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${m.label} = ${m.value}${m.uom}`;
      select.appendChild(opt);
    });
    select.classList.add("visible");
    select.onchange = () => applyMetric(metrics[parseInt(select.value)]);
  } else {
    select.classList.remove("visible");
    select.innerHTML = "";
  }

  applyMetric(metrics[0]);
});

// Threshold and value listeners
document.getElementById("threshold_warning").addEventListener("input", updateResult);
document.getElementById("threshold_critical").addEventListener("input", updateResult);
document.getElementById("value").addEventListener("input", updateResult);

// Buttons
document.getElementById("btn-random").addEventListener("click", () => {
  const a = Math.floor(Math.random() * 10);
  const b = a + Math.floor(Math.random() * 20) + 5;
  const wa = a + Math.floor(Math.random() * 3);
  const wb = b - Math.floor(Math.random() * 3);
  document.getElementById("threshold_warning").value = `${wa}:${wb}`;
  document.getElementById("threshold_critical").value = `${a}:${b}`;
  document.getElementById("value").value = (Math.random() * (b + 10)).toFixed(2);
  document.getElementById("perfdata").value = "";
  document.getElementById("metric-select").classList.remove("visible");
  updateResult();
});

document.getElementById("btn-clear").addEventListener("click", () => {
  document.getElementById("perfdata").value = "";
  document.getElementById("threshold_warning").value = "";
  document.getElementById("threshold_critical").value = "";
  document.getElementById("value").value = "";
  document.getElementById("metric-select").classList.remove("visible");
  document.getElementById("metric-select").innerHTML = "";
  updateResult();
});

// Init with random values
document.getElementById("btn-random").click();

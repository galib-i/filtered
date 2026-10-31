function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

const cleanTerms = (input) =>
  input
    .trim()
    .replace(/\s+/g, " ") // Multiple spaces
    .replace(/\s+,/g, ",") // Space before comma
    .replace(/,+/g, ",") // Multiple commas to single comma
    .replace(/^,|,$/g, ""); // Remove leading/trailing commas

const countTerms = (input) =>
  input && input.trim()
    ? input
        .split(",")
        .map((term) => term.trim())
        .filter(Boolean).length
    : 0;

document.addEventListener("DOMContentLoaded", () => {
  const el = (id) => document.getElementById(id);

  const negativeBrandsTextarea = el("negativeBrands");
  const narrowToTitlesInput = el("narrowToTitles");
  const enableNarrowToTitlesCheckbox = el("enableNarrowToTitles");
  const narrowSection = el("narrowSection");
  const narrowLabel = el("narrowLabel");
  const hideCount = el("hideCount");
  const narrowCount = el("narrowCount");
  const narrowHint = el("narrowHint");

  const KEYS = Object.keys(DEFAULT_SETTINGS);
  const DEBOUNCE = 300; // ms

  const isCheckbox = (key) => typeof DEFAULT_SETTINGS[key] === "boolean";

  const renderCounts = () => {
    const hiddenTerms = countTerms(negativeBrandsTextarea.value);
    const narrowTerms = countTerms(narrowToTitlesInput.value);

    hideCount.innerText = hiddenTerms;
    hideCount.hidden = hiddenTerms === 0;
    narrowCount.innerText = narrowTerms;
    narrowCount.hidden = narrowTerms === 0;
    narrowHint.innerText = !enableNarrowToTitlesCheckbox.checked
      ? ""
      : narrowTerms === 0
        ? "Nothing narrowed yet"
        : hiddenTerms > 0
          ? "Hidden terms are still removed"
          : "Only narrowing to titles";
  };

  const renderNarrow = () => {
    const enabled = enableNarrowToTitlesCheckbox.checked;
    narrowSection.classList.toggle("is-off", !enabled);
    narrowToTitlesInput.disabled = !enabled;
    narrowLabel.innerText = enabled ? "Narrow to titles containing" : "Narrow to specific titles";
    renderCounts();
  };

  let lastSaved = "";

  const saveSettings = (clean = false) => {
    if (clean) {
      negativeBrandsTextarea.value = cleanTerms(negativeBrandsTextarea.value);
      narrowToTitlesInput.value = cleanTerms(narrowToTitlesInput.value);
    }

    renderCounts();

    const snapshot = {};
    KEYS.forEach((key) => {
      snapshot[key] = isCheckbox(key) ? el(key).checked : el(key).value;
    });

    // Only write when something changed: sync storage allows ~120 writes a minute
    const serialised = JSON.stringify(snapshot);
    if (serialised === lastSaved) return;
    lastSaved = serialised;

    chrome.storage.sync.set(snapshot);
  };

  const dsaveSettings = debounce(saveSettings, DEBOUNCE);

  chrome.storage.sync.get(KEYS, (result) => {
    KEYS.forEach((key) => {
      const value = result[key] ?? DEFAULT_SETTINGS[key];
      if (isCheckbox(key)) el(key).checked = value;
      else el(key).value = value;
    });
    renderNarrow();
  });

  // Toggles drive the derived UI, then persist
  document.addEventListener("change", () => {
    renderNarrow();
    saveSettings(true);
  });

  [negativeBrandsTextarea, narrowToTitlesInput].forEach((input) => {
    input.addEventListener("input", () => {
      renderCounts();
      dsaveSettings();
    });

    input.addEventListener("blur", () => {
      saveSettings(true);
    });
  });

  window.addEventListener("blur", () => {
    saveSettings(true);
  });

  negativeBrandsTextarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
});

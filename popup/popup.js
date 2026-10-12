function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

const cleanBrands = (input) =>
  input
    .trim()
    .replace(/\s+/g, " ") // Multiple spaces
    .replace(/\s+,/g, ",") // Space before comma
    .replace(/,+/g, ",") // Multiple commas to single comma
    .replace(/^,|,$/g, ""); // Remove leading/trailing commas

document.addEventListener("DOMContentLoaded", () => {
  const negativeBrandsTextarea = document.getElementById("negativeBrands");
  const applyToBrandsCheckbox = document.getElementById("applyToBrands");
  const applyToTitlesCheckbox = document.getElementById("applyToTitles");
  const enablePartialMatchingCheckbox = document.getElementById("enablePartialMatching");
  const hideWardrobeSpotlightCheckbox = document.getElementById("hideWardrobeSpotlight");
  const showItemTitlesCheckbox = document.getElementById("showItemTitles");

  const STORAGE_KEYS = [
    "negativeBrands",
    "applyToBrands",
    "applyToTitles",
    "enablePartialMatching",
    "hideWardrobeSpotlight",
    "showItemTitles",
  ];
  const DEBOUCE = 300; // ms

  const saveSettings = (clean = false) => {
    if (clean) {
      negativeBrandsTextarea.value = cleanBrands(negativeBrandsTextarea.value);
    }

    chrome.storage.sync.set({
      negativeBrands: negativeBrandsTextarea.value,
      applyToBrands: applyToBrandsCheckbox.checked,
      applyToTitles: applyToTitlesCheckbox.checked,
      enablePartialMatching: enablePartialMatchingCheckbox.checked,
      hideWardrobeSpotlight: hideWardrobeSpotlightCheckbox.checked,
      showItemTitles: showItemTitlesCheckbox.checked,
    });
  };

  const dsaveSettings = debounce(saveSettings, DEBOUCE);

  chrome.storage.sync.get(STORAGE_KEYS, (result) => {
    negativeBrandsTextarea.value = result.negativeBrands || "";
    applyToBrandsCheckbox.checked = result.applyToBrands ?? true;
    applyToTitlesCheckbox.checked = result.applyToTitles ?? true;
    enablePartialMatchingCheckbox.checked = !!result.enablePartialMatching;
    hideWardrobeSpotlightCheckbox.checked = !!result.hideWardrobeSpotlight;
    showItemTitlesCheckbox.checked = !!result.showItemTitles;
  });

  negativeBrandsTextarea.addEventListener("input", (e) => {
    if (e.target === negativeBrandsTextarea) dsaveSettings();
  });

  negativeBrandsTextarea.addEventListener("blur", () => {
    saveSettings(true);
  });

  window.addEventListener("blur", () => {
    saveSettings(true);
  });

  negativeBrandsTextarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });

  applyToBrandsCheckbox.addEventListener("change", () => saveSettings(true));
  applyToTitlesCheckbox.addEventListener("change", () => saveSettings(true));
  enablePartialMatchingCheckbox.addEventListener("change", () => saveSettings(true));
  hideWardrobeSpotlightCheckbox.addEventListener("change", () => saveSettings(true));
  showItemTitlesCheckbox.addEventListener("change", () => saveSettings(true));
});

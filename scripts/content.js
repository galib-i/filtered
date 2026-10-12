const BRAND_SELECTORS = '[data-testid$="--description-title"]'; // Use testID to specifically target titles only, sizes and condition use the same selector
const ITEM_CONTAINER_SELECTORS =
  "[class*='homepage-blocks__item'], [class*='feed-grid__item']:not([class*='feed-grid__item--full-row']):not([class*='feed-grid__item-content']):not([class*='feed-grid__item-inner']), [class*='item-view-items__item']";
const WARDROBE_SPOTLIGHT_SELECTOR = "[class*='feed-grid__item--full-row']";
const ITEM_TITLE_SELECTORS =
  "[class*='new-item-box__container'], [class*='feed-grid__item-content'], [class*='item-view-items__item']";

// Defaults
let settings = {
  negativeBrands: "",
  applyToBrands: true,
  applyToTitles: false,
  enablePartialMatching: false,
  hideWardrobeSpotlight: false,
  showItemTitles: false,
};

// Matching for both brands and titles
function isNegativeMatch(text, negativeList, enablePartialMatching) {
  if (!text) return false;

  return negativeList.some((negative) =>
    enablePartialMatching
      ? negative.length >= 2 && text.includes(negative) // Partial matching for 2+ characters
      : text === negative,
  );
}

function filterByBrands(negativeBrandList) {
  document.querySelectorAll(BRAND_SELECTORS).forEach((brandNode) => {
    const brandName = brandNode.textContent.trim().toLowerCase();
    if (isNegativeMatch(brandName, negativeBrandList, settings.enablePartialMatching)) {
      const itemContainer = brandNode.closest(ITEM_CONTAINER_SELECTORS);
      if (itemContainer) {
        itemContainer.style.display = "none";
      }
    }
  });
}

function filterByTitles(negativeBrandList) {
  document.querySelectorAll(ITEM_CONTAINER_SELECTORS).forEach((itemContainer) => {
    // Skip if the brand filter already hid
    if (itemContainer.style.display === "none") return;

    const img = itemContainer.querySelector("img[alt]");
    if (img && img.alt) {
      // Extract the title before the first comma
      const titleText = img.alt.split(",")[0].trim().toLowerCase();
      if (isNegativeMatch(titleText, negativeBrandList, settings.enablePartialMatching)) {
        itemContainer.style.display = "none";
      }
    }
  });
}

function filterItems() {
  // Reset all items
  document.querySelectorAll(ITEM_CONTAINER_SELECTORS).forEach((itemContainer) => {
    itemContainer.style.display = "";
  });

  if (!settings.negativeBrands) return;
  if (!settings.applyToBrands && !settings.applyToTitles) return;

  const negativeBrandList = settings.negativeBrands
    .split(",")
    .map((b) => b.trim().toLowerCase())
    .filter(Boolean);

  if (settings.applyToBrands) {
    filterByBrands(negativeBrandList);
  }

  if (settings.applyToTitles) {
    filterByTitles(negativeBrandList);
  }
}

function hideWardrobeSpotlight() {
  const displayStyle = settings.hideWardrobeSpotlight ? "none" : "";

  document.querySelectorAll(WARDROBE_SPOTLIGHT_SELECTOR).forEach((el) => {
    el.style.display = displayStyle;
  });
}

function showItemTitles() {
  if (!settings.showItemTitles) {
    document.querySelectorAll(".vinted-filter-title").forEach((el) => el.remove());
    return;
  }

  document.querySelectorAll(ITEM_TITLE_SELECTORS).forEach((item) => {
    const img = item.querySelector("img[alt]");
    if (img && img.alt) {
      const altText = img.alt;
      const parts = altText.split(",");
      const truncatedText = parts[0];

      // Find the .title-content element
      const titleContentElem = item.querySelector("[class*='title-content']");
      if (titleContentElem) {
        // Avoid inserting multiple times
        if (!item.querySelector(".vinted-filter-title")) {
          const titleElem = document.createElement("div");
          titleElem.textContent = truncatedText;
          titleElem.className = "vinted-filter-title";

          // Copy CSS classes from the price element
          const priceElem = titleContentElem.querySelector('[data-testid$="--price-text"]');
          if (priceElem) {
            priceElem.classList.forEach((cls) => {
              titleElem.classList.add(cls);
            });
            titleElem.style.fontWeight = "500";
          }

          // Insert before .title-content
          titleContentElem.parentNode.insertBefore(titleElem, titleContentElem);
        }
      }
    }
  });
}

function applyRules() {
  filterItems();
  showItemTitles();
  hideWardrobeSpotlight();
}

function observeDynamicContent() {
  const observer = new MutationObserver((mutationsList) => {
    if (
      mutationsList.some((m) =>
        Array.from(m.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE && !node.classList.contains("vinted-filter-title"),
        ),
      )
    ) {
      applyRules();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

chrome.storage.sync.get(Object.keys(settings), (result) => {
  Object.assign(settings, result);
  applyRules();
  observeDynamicContent();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync") {
    for (let [key, { newValue }] of Object.entries(changes)) {
      settings[key] = newValue;
    }

    // Run filterItems if any filter settings change
    if (
      changes.negativeBrands ||
      changes.enablePartialMatching ||
      changes.applyToBrands ||
      changes.applyToTitles
    ) {
      filterItems();
    }

    if (changes.hideWardrobeSpotlight) {
      hideWardrobeSpotlight();
    }

    if (changes.showItemTitles) {
      showItemTitles();
    }
  }
});

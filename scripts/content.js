const BRAND_SELECTORS = '[data-testid$="--description-title"]'; // Titles only: size and condition share this selector
const ITEM_CONTAINER_SELECTORS =
  "[class*='homepage-blocks__item'], [class*='feed-grid__item']:not([class*='feed-grid__item--full-row']):not([class*='feed-grid__item-content']):not([class*='feed-grid__item-inner']), [class*='item-view-items__item']";
const WARDROBE_SPOTLIGHT_SELECTOR = "[class*='feed-grid__item--full-row']";
const ITEM_TITLE_SELECTORS =
  "[class*='new-item-box__container'], [class*='feed-grid__item-content'], [class*='item-view-items__item']";

let settings = { ...DEFAULT_SETTINGS };

// Alt reads "title, size, condition": first field only, so size and condition never match
const titleFromAlt = (img) => (img?.alt ? img.alt.split(",")[0].trim() : "");

const parseTerms = (value) =>
  value
    .split(",")
    .map((term) => term.trim().toLowerCase().replace(/\s+/g, " "))
    .filter(Boolean);

const itemTitle = (itemContainer) =>
  titleFromAlt(itemContainer.querySelector("img[alt]"))
    .toLowerCase()
    .replace(/\s+/g, " ");

function isNegativeMatch(text, negativeList) {
  if (!text) return false;

  return negativeList.some((negative) =>
    settings.enablePartialMatching
      ? negative.length >= 2 && text.includes(negative) // a single letter would risk hiding the whole feed
      : text === negative,
  );
}

function filterByBrands(negativeBrandList) {
  document.querySelectorAll(BRAND_SELECTORS).forEach((brandNode) => {
    const brandName = brandNode.textContent.trim().toLowerCase();
    if (isNegativeMatch(brandName, negativeBrandList)) {
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

    if (isNegativeMatch(itemTitle(itemContainer), negativeBrandList)) {
      itemContainer.style.display = "none";
    }
  });
}

// Hide anything without a narrow term
function narrowByTitles(narrowList) {
  document.querySelectorAll(ITEM_CONTAINER_SELECTORS).forEach((itemContainer) => {
    if (itemContainer.style.display === "none") return;

    const title = itemTitle(itemContainer);
    if (title && !narrowList.some((term) => title.includes(term))) {
      itemContainer.style.display = "none";
    }
  });
}

function filterItems() {
  // Clear old hides, so edits take effect
  document.querySelectorAll(ITEM_CONTAINER_SELECTORS).forEach((itemContainer) => {
    itemContainer.style.display = "";
  });

  if (settings.applyToBrands || settings.applyToTitles) {
    const negativeBrandList = parseTerms(settings.negativeBrands);
    if (negativeBrandList.length) {
      if (settings.applyToBrands) filterByBrands(negativeBrandList);
      if (settings.applyToTitles) filterByTitles(negativeBrandList);
    }
  }

  if (settings.enableNarrowToTitles) {
    // One letter would blank the feed, so require two
    const narrowList = parseTerms(settings.narrowToTitles).filter((term) => term.length >= 2);
    if (narrowList.length) narrowByTitles(narrowList);
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
    const truncatedText = titleFromAlt(item.querySelector("img[alt]"));
    if (!truncatedText) return;

    const titleContentElem = item.querySelector("[class*='title-content']");
    if (!titleContentElem) return;

    if (item.querySelector(".vinted-filter-title")) return;

    const titleElem = document.createElement("div");
    titleElem.textContent = truncatedText;
    titleElem.className = "vinted-filter-title";

    // Copy the price styling
    const priceElem = titleContentElem.querySelector('[data-testid$="--price-text"]');
    if (priceElem) {
      priceElem.classList.forEach((cls) => titleElem.classList.add(cls));
      titleElem.style.fontWeight = "500";
    }

    titleContentElem.parentNode.insertBefore(titleElem, titleContentElem);
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

chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (result) => {
  Object.assign(settings, result);
  applyRules();
  observeDynamicContent();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;

  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in DEFAULT_SETTINGS) settings[key] = newValue;
  }

  if (
    changes.negativeBrands ||
    changes.enablePartialMatching ||
    changes.applyToBrands ||
    changes.applyToTitles ||
    changes.enableNarrowToTitles ||
    changes.narrowToTitles
  ) {
    filterItems();
  }

  if (changes.hideWardrobeSpotlight) {
    hideWardrobeSpotlight();
  }

  if (changes.showItemTitles) {
    showItemTitles();
  }
});

const BRAND_SELECTORS = '[data-testid$="--description-title"]'; // Titles only: size and condition share this selector
const FAVOURITE_COUNT_SELECTOR = '[data-testid="favourite-count-text"]';
const ITEM_CONTAINER_SELECTORS =
  "[class*='homepage-blocks__item'], [class*='feed-grid__item']:not([class*='feed-grid__item--full-row']):not([class*='feed-grid__item-content']):not([class*='feed-grid__item-inner']), [class*='item-view-items__item']";
// Search pages mark the spotlight full-row; the homepage uses closet-promotion within a homepage-block
const WARDROBE_SPOTLIGHT_SELECTOR =
  "[class*='feed-grid__item--full-row'], [data-testid='homepage-block']:has([data-testid^='closet-promotion-'])";
const ITEM_TITLE_SELECTORS =
  "[class*='new-item-box__container'], [class*='feed-grid__item-content'], [class*='item-view-items__item']";

let settings = { ...DEFAULT_SETTINGS };

// Alt reads "title, size, condition": first field only, so size and condition never match
const titleFromAlt = (img) => (img?.alt ? img.alt.split(",")[0].trim() : "");

// "4" or "1.2k"; Vinted renders no count node at all for zero favourites
const parseLikes = (text) => {
  const raw = (text ?? "").trim().toLowerCase();
  const count = parseFloat(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(count)) return 0;
  return Math.round(count * (raw.endsWith("k") ? 1000 : 1));
};

const parseTerms = (value) =>
  value
    .split(",")
    .map((term) => term.trim().toLowerCase().replace(/\s+/g, " "))
    .filter(Boolean);

const itemTitle = (itemContainer) =>
  titleFromAlt(itemContainer.querySelector("img[alt]")).toLowerCase().replace(/\s+/g, " ");

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

function filterByLikes(minLikes) {
  document.querySelectorAll(ITEM_CONTAINER_SELECTORS).forEach((itemContainer) => {
    if (itemContainer.style.display === "none") return;

    // No count means no favourites yet, so it counts as zero
    const countNode = itemContainer.querySelector(FAVOURITE_COUNT_SELECTOR);
    if (parseLikes(countNode?.textContent) < minLikes) {
      itemContainer.style.display = "none";
    }
  });
}

// Hide anything without a narrow term
function narrowByTitles(narrowList) {
  document.querySelectorAll(ITEM_CONTAINER_SELECTORS).forEach((itemContainer) => {
    if (itemContainer.style.display === "none") return;

    // No title can't match a term, so hide it
    const title = itemTitle(itemContainer);
    if (!narrowList.some((term) => title.includes(term))) {
      itemContainer.style.display = "none";
    }
  });
}

function filterItems() {
  // Clear old hides, so edits take effect
  document.querySelectorAll(ITEM_CONTAINER_SELECTORS).forEach((itemContainer) => {
    itemContainer.style.display = "";
  });

  if (settings.enableHideFilters && (settings.applyToBrands || settings.applyToTitles)) {
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

  if (settings.enableMinLikes) {
    const minLikes = parseInt(settings.minLikes, 10);
    if (minLikes > 0) filterByLikes(minLikes);
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

    if (item.querySelector(".vinted-filter-title")) return;

    const priceElem = item.querySelector('[data-testid$="--price-text"]');
    if (!priceElem) return;

    const titleElem = document.createElement("div");
    titleElem.textContent = truncatedText;
    titleElem.className = "vinted-filter-title";

    // Copy the price styling
    priceElem.classList.forEach((cls) => {
      if (!cls.includes("__truncated")) titleElem.classList.add(cls);
    });
    titleElem.style.fontWeight = "500";
    titleElem.style.whiteSpace = "normal";

    let titleParent = priceElem.parentElement;
    while (getComputedStyle(titleParent).display === "flex") titleParent = titleParent.parentElement;
    titleParent.insertBefore(titleElem, titleParent.firstElementChild);
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
    changes.enableHideFilters ||
    changes.negativeBrands ||
    changes.enablePartialMatching ||
    changes.applyToBrands ||
    changes.applyToTitles ||
    changes.enableNarrowToTitles ||
    changes.narrowToTitles ||
    changes.enableMinLikes ||
    changes.minLikes
  ) {
    applyRules();
  }

  if (changes.hideWardrobeSpotlight) {
    hideWardrobeSpotlight();
  }

  if (changes.showItemTitles) {
    showItemTitles();
  }
});

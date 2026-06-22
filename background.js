function updateActionForTab(tabId, tabUrl) {
  if (!tabUrl) {
    return chrome.action.disable(tabId);
  }

  try {
    const domain = new URL(tabUrl).hostname;

    // Only enable extension if the domain contains "vinted"
    if (domain.includes("vinted")) {
      chrome.action.enable(tabId);
    } else {
      chrome.action.disable(tabId);
    }
  } catch (error) {
    chrome.action.disable(tabId);
  }
}

// Tab finishing loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || tab?.url || "";
  updateActionForTab(tabId, url);
});

// Clicking between different open tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab) updateActionForTab(tab.id, tab.url);
  });
});

// Check all open tabs when extension loads
chrome.tabs.query({}, (tabs) => {
  tabs.forEach((t) => updateActionForTab(t.id, t.url));
});

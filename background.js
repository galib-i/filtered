// Hosts come from the manifest; ignore everything else
const VINTED_HOSTS = chrome.runtime
  .getManifest()
  .content_scripts.flatMap((script) => script.matches)
  .map((match) => match.replace("*://*.", "").replace("/*", ""));

const isVintedHost = (hostname) =>
  VINTED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));

function updateActionForTab(tabId, tabUrl) {
  if (!tabUrl) {
    return chrome.action.disable(tabId);
  }

  try {
    if (isVintedHost(new URL(tabUrl).hostname)) {
      chrome.action.enable(tabId);
    } else {
      chrome.action.disable(tabId);
    }
  } catch {
    chrome.action.disable(tabId);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || tab?.url || "";
  updateActionForTab(tabId, url);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab) updateActionForTab(tab.id, tab.url);
  });
});

chrome.tabs.query({}, (tabs) => {
  tabs.forEach((t) => updateActionForTab(t.id, t.url));
});

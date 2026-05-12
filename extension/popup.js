document.addEventListener('DOMContentLoaded', () => {
  // 1. Auto-grab Notion URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let currentTab = tabs[0];
    if (currentTab && currentTab.url && (currentTab.url.includes('notion.so') || currentTab.url.includes('notion.com'))) {
      document.getElementById('notionLink').value = currentTab.url;
    }
  });

  // 2. Connect Button
  document.getElementById('syncNotionBtn').addEventListener('click', () => {
    const url = document.getElementById('notionLink').value;
    window.open(`https://kreatly.vercel.app/dashboard/settings?notionUrl=${encodeURIComponent(url)}`, '_blank');
  });

  // 3. Power-Paste Injection
  document.getElementById('injectBtn').addEventListener('click', async () => {
    const text = document.getElementById('draftText').value;
    const btn = document.getElementById('injectBtn');

    // Copy to clipboard
    await navigator.clipboard.writeText(text);

    // Prime the website
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const editor = document.querySelector('div[role="textbox"]') || document.querySelector('.ql-editor');
        if (editor) {
          editor.focus();
          // Optional: clear the box for them
          editor.innerHTML = '<p><br></p>';
        }
      }
    });

    // Success UI
    btn.innerText = "✅ Copied! Press Cmd+V";
    btn.style.backgroundColor = "#28a745";
    setTimeout(() => {
      btn.innerText = "Inject Draft";
      btn.style.backgroundColor = "#111";
    }, 3000);
  });
});


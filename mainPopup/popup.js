function logDebug(msg) {
  const logBox = document.getElementById("debugLogs");
  if (logBox) {
    const time = new Date().toLocaleTimeString();
    logBox.value += `[${time}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
  }
}

function cleanEmail(rawText) {
  if (!rawText) return null;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;
  const match = rawText.match(emailRegex);
  return match ? match[1] : null;
}

function findFailedRecipient(content) {
  let match = content.match(/^X-Failed-Recipients:\s*(.*)/im);
  if (match) return cleanEmail(match[1]);

  match = content.match(/^Final-Recipient:\s*(?:rfc822;)?\s*(.*)/im);
  if (match) return cleanEmail(match[1]);

  match = content.match(/^Original-Recipient:\s*(?:rfc822;)?\s*(.*)/im);
  if (match) return cleanEmail(match[1]);

  const parts = content.split(/Content-Type:\s*message\/rfc822/i);
  if (parts.length > 1) {
    const embeddedTo = parts[1].match(/^To:\s*(.*)/im);
    if (embeddedTo) return cleanEmail(embeddedTo[1]);
  }

  match = content.match(/^To:\s*(.*)/im);
  if (match) {
    const potentialEmail = cleanEmail(match[1]);
    if (potentialEmail && !potentialEmail.includes('mailer-daemon') && !potentialEmail.includes('postmaster')) {
      return potentialEmail;
    }
  }
  return null;
}

async function getAllSelectedMessages(tabId) {
  logDebug(`Fetching selected messages for tabId: ${tabId}`);
  let page = await browser.mailTabs.getSelectedMessages(tabId);
  const all = [];
  all.push(...(page.messages || []));
  
  while (page && page.id) {
    page = await browser.messages.continueList(page.id);
    if (page) {
        all.push(...(page.messages || []));
    }
  }
  return all;
}

document.getElementById("extract").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const logBox = document.getElementById("debugLogs");
  
  status.textContent = "Processing...";
  logBox.value = ""; 
  logDebug("Extraction initiated.");

  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tabs || tabs.length === 0) {
      logDebug("ERROR: No active tab found.");
      status.textContent = "No active tab found.";
      return;
    }
    
    const tab = tabs[0];
    logDebug(`Active tab resolved: ID ${tab.id}`);

    const messages = await getAllSelectedMessages(tab.id);
    
    if (!messages.length) {
      status.textContent = "No messages selected.";
      logDebug("Abort: No messages selected.");
      return;
    }

    let extractedData = new Map();

    logDebug(`Processing ${messages.length} messages...`);
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const raw = await browser.messages.getRaw(msg.id);
      if (!raw) continue;

      const email = findFailedRecipient(raw);
      if (email) {
        const cleanEmail = email.toLowerCase().trim();
        
        if (!extractedData.has(cleanEmail)) {
          let msgDate = "No date";
          if (msg.date) {
            msgDate = new Date(msg.date).toLocaleDateString();
          }
          extractedData.set(cleanEmail, msgDate);
        }
      }
    }

    const uniqueEntries = Array.from(extractedData.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    if (uniqueEntries.length > 0) {
      logDebug(`Extraction complete. Unique emails found: ${uniqueEntries.length}`);
      
      const resultText = uniqueEntries.map(([mail, date]) => `${mail}\t${date}`).join("\n");
      
      await navigator.clipboard.writeText(resultText);
      logDebug("Payload copied to clipboard successfully.");
      
      status.textContent = `Done!\nMessages processed: ${messages.length}\nUnique emails found: ${uniqueEntries.length}\n\nList and dates copied to clipboard.`;
    } else {
      logDebug("No failed recipients identified.");
      status.textContent = "No failed recipient addresses found in selected messages.";
    }

  } catch (e) {
    if (typeof logDebug === "function") {
      logDebug(`CRITICAL ERROR: ${e.message}`);
      if (e.stack) logDebug(`Stack trace: ${e.stack}`);
    }
    status.textContent = `Error: ${e.message || e}`;
  }
});

document.getElementById("toggleLogs").addEventListener("click", () => {
  const logBox = document.getElementById("debugLogs");
  logBox.style.display = (logBox.style.display === "none" || logBox.style.display === "") ? "block" : "none";
});
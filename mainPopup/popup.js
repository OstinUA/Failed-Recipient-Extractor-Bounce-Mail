/**
 * Appends timestamped debug messages to the hidden log console.
 * @param {string} msg - The message to log.
 */
function logDebug(msg) {
  const logBox = document.getElementById("debugLogs");
  if (logBox) {
    const time = new Date().toLocaleTimeString();
    logBox.value += `[${time}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
  }
}

/**
 * Extracts a valid email address from a raw text string.
 * @param {string} rawText - The string to parse.
 * @returns {string|null} The extracted email or null if no match is found.
 */
function cleanEmail(rawText) {
  if (!rawText) return null;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;
  const match = rawText.match(emailRegex);
  return match ? match[1] : null;
}

/**
 * Parses raw message headers and body parts to identify the failed recipient.
 * @param {string} content - The raw RFC822 message source.
 * @returns {string|null} The bounced email address.
 */
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

/**
 * Recursively fetches all selected messages, handling pagination.
 * @param {number} tabId - The ID of the active tab.
 * @returns {Promise<Array>} Array of message objects.
 */
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

// Main extraction pipeline
document.getElementById("extract").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const logBox = document.getElementById("debugLogs");
  
  status.textContent = "Processing...";
  logBox.value = ""; 
  logDebug("Extraction initiated.");

  try {
    // Workaround: browser.tabs.query is used over browser.mailTabs.query 
    // to bypass an "unexpected error" API bug in complex thread layouts.
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

    let extractedEmails = [];

    logDebug(`Processing ${messages.length} messages...`);
    for (let i = 0; i < messages.length; i++) {
      const raw = await browser.messages.getRaw(messages[i].id);
      if (!raw) continue;

      const email = findFailedRecipient(raw);
      if (email) {
        extractedEmails.push(email.toLowerCase().trim());
      }
    }

    // Deduplicate and sort
    const uniqueEmails = [...new Set(extractedEmails)].sort();

    if (uniqueEmails.length > 0) {
      logDebug(`Extraction complete. Unique emails found: ${uniqueEmails.length}`);
      const resultText = uniqueEmails.join("\n");
      
      await navigator.clipboard.writeText(resultText);
      logDebug("Payload copied to clipboard successfully.");
      
      status.textContent = `Done!\nMessages processed: ${messages.length}\nUnique emails found: ${uniqueEmails.length}\n\nList copied to clipboard.`;
    } else {
      logDebug("No failed recipients identified.");
      status.textContent = "No failed recipient addresses found in selected messages.";
    }

  } catch (e) {
    logDebug(`CRITICAL ERROR: ${e.message}`);
    if (e.stack) logDebug(`Stack trace: ${e.stack}`);
    status.textContent = `Error: ${e.message || e}`;
  }
});

// Toggle debug console visibility
document.getElementById("toggleLogs").addEventListener("click", () => {
  const logBox = document.getElementById("debugLogs");
  logBox.style.display = (logBox.style.display === "none" || logBox.style.display === "") ? "block" : "none";
});
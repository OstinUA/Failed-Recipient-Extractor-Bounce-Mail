/**
 * Appends a timestamped debug message to the popup log textarea.
 *
 * @param {string} msg Message text to append to the debug log output.
 * @returns {void}
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
 * Extracts the first email address found within a raw header or body string.
 *
 * @param {?string} rawText Source text that may contain an email address.
 * @returns {?string} The first matched email address, or null.
 */
function cleanEmail(rawText) {
  if (!rawText) return null;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;
  const match = rawText.match(emailRegex);
  return match ? match[1] : null;
}

/**
 * Finds the bounced recipient address in a raw email message.
 *
 * @param {string} content Full raw message source for a bounced email.
 * @returns {?string} The failed recipient email address, or null.
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
    if (potentialEmail && !potentialEmail.includes("mailer-daemon") && !potentialEmail.includes("postmaster")) {
      return potentialEmail;
    }
  }
  return null;
}

/**
 * Checks whether a message author looks like a bounce sender.
 *
 * @param {string} author The author/from field of a message.
 * @returns {boolean} True if the author matches known bounce sender patterns.
 */
function isBounceAuthor(author) {
  if (!author) return false;
  const lower = author.toLowerCase();
  return (
    lower.includes("mailer-daemon") ||
    lower.includes("postmaster") ||
    lower.includes("mail delivery") ||
    lower.includes("delivery subsystem") ||
    lower.includes("mail system") ||
    lower.includes("returned mail") ||
    lower.includes("undeliverable") ||
    lower.includes("noreply") && lower.includes("postmaster")
  );
}

// ── UI helpers ──────────────────────────────────────────────

/**
 * Updates the progress bar UI.
 *
 * @param {number} current Current item index.
 * @param {number} total Total item count.
 * @param {string} label Text to display below the bar.
 */
function updateProgress(current, total, label) {
  const container = document.getElementById("progressContainer");
  const fill = document.getElementById("progressFill");
  const text = document.getElementById("progressText");

  container.style.display = "block";
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  fill.style.width = pct + "%";
  text.textContent = label;
}

function hideProgress() {
  document.getElementById("progressContainer").style.display = "none";
}

function setButtons(disabled) {
  document.getElementById("extract").disabled = disabled;
  document.getElementById("scanAll").disabled = disabled;
}

// ── Clipboard + result formatting ───────────────────────────

/**
 * Formats extracted data and copies it to the clipboard.
 *
 * @param {Map<string,string>} extractedData Map of email → date.
 * @param {number} processedCount Number of messages processed.
 * @param {HTMLElement} status Status element to update.
 * @returns {Promise<void>}
 */
async function finalizeResults(extractedData, processedCount, status) {
  const uniqueEntries = Array.from(extractedData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (uniqueEntries.length > 0) {
    logDebug(`Extraction complete. Unique emails found: ${uniqueEntries.length}`);
    const resultText = uniqueEntries
      .map(([mail, date]) => `${mail}\t${date}`)
      .join("\n");

    await navigator.clipboard.writeText(resultText);
    logDebug("Payload copied to clipboard successfully.");

    status.textContent =
      `Done!\n` +
      `Messages processed: ${processedCount}\n` +
      `Unique emails found: ${uniqueEntries.length}\n\n` +
      `List and dates copied to clipboard.`;
  } else {
    logDebug("No failed recipients identified.");
    status.textContent = "No failed recipient addresses found.";
  }
}

// ── Extract from selection (original behavior) ──────────────

/**
 * Fetches every currently selected message from a Thunderbird mail tab.
 *
 * @param {number} tabId Identifier of the active Thunderbird mail tab.
 * @returns {Promise<Object[]>} Complete list of selected message objects.
 */
async function getAllSelectedMessages(tabId) {
  logDebug(`Fetching selected messages for tabId: ${tabId}`);
  let page = await browser.mailTabs.getSelectedMessages(tabId);
  const all = [];
  all.push(...(page.messages || []));

  while (page && page.id) {
    page = await browser.messages.continueList(page.id);
    if (page) all.push(...(page.messages || []));
  }
  return all;
}

async function handleExtractClick() {
  const status = document.getElementById("status");
  const logBox = document.getElementById("debugLogs");

  status.textContent = "Processing...";
  logBox.value = "";
  hideProgress();
  setButtons(true);
  logDebug("Extraction initiated (selected messages).");

  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      logDebug("ERROR: No active tab found.");
      status.textContent = "No active tab found.";
      return;
    }

    const messages = await getAllSelectedMessages(tabs[0].id);
    if (!messages.length) {
      status.textContent = "No messages selected.";
      logDebug("Abort: No messages selected.");
      return;
    }

    const extractedData = new Map();
    logDebug(`Processing ${messages.length} messages...`);

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      updateProgress(i + 1, messages.length, `Message ${i + 1} / ${messages.length}`);

      const raw = await browser.messages.getRaw(msg.id);
      if (!raw) continue;

      const email = findFailedRecipient(raw);
      if (email) {
        const norm = email.toLowerCase().trim();
        if (!extractedData.has(norm)) {
          const msgDate = msg.date ? new Date(msg.date).toLocaleDateString() : "No date";
          extractedData.set(norm, msgDate);
        }
      }
    }

    await finalizeResults(extractedData, messages.length, status);
  } catch (e) {
    logDebug(`CRITICAL ERROR: ${e.message}`);
    if (e.stack) logDebug(`Stack trace: ${e.stack}`);
    status.textContent = `Error: ${e.message || e}`;
  } finally {
    hideProgress();
    setButtons(false);
  }
}

// ── Scan all folders ────────────────────────────────────────

/**
 * Recursively collects all folders from a given root folder list.
 *
 * @param {Object[]} folders Array of Thunderbird MailFolder objects.
 * @returns {Object[]} Flat array of all folders including nested subfolders.
 */
function collectAllFolders(folders) {
  const result = [];
  for (const folder of folders) {
    result.push(folder);
    if (folder.subFolders && folder.subFolders.length > 0) {
      result.push(...collectAllFolders(folder.subFolders));
    }
  }
  return result;
}

/**
 * Scans every folder in every account for bounce messages and extracts recipients.
 *
 * @returns {Promise<void>}
 */
async function handleScanAllClick() {
  const status = document.getElementById("status");
  const logBox = document.getElementById("debugLogs");

  status.textContent = "Scanning all folders...";
  logBox.value = "";
  hideProgress();
  setButtons(true);
  logDebug("Full mailbox scan initiated.");

  try {
    // 1. Enumerate all accounts and folders
    const accounts = await browser.accounts.list();
    logDebug(`Found ${accounts.length} account(s).`);

    const allFolders = [];
    for (const account of accounts) {
      const folders = collectAllFolders(account.folders || []);
      logDebug(`Account "${account.name}" — ${folders.length} folder(s).`);
      allFolders.push(...folders);
    }

    logDebug(`Total folders to scan: ${allFolders.length}`);
    const extractedData = new Map();
    let totalProcessed = 0;
    let totalBounce = 0;

    // 2. Iterate through each folder
    for (let fi = 0; fi < allFolders.length; fi++) {
      const folder = allFolders[fi];
      const folderLabel = folder.path || folder.name || `folder-${fi}`;
      updateProgress(fi + 1, allFolders.length, `Folder ${fi + 1}/${allFolders.length}: ${folderLabel}`);
      logDebug(`Scanning folder: ${folderLabel}`);

      // 3. Page through all messages in the folder
      let page;
      try {
        page = await browser.messages.list(folder);
      } catch (err) {
        logDebug(`  Skipped (${err.message})`);
        continue;
      }

      let folderBounce = 0;

      while (page) {
        const msgs = page.messages || [];

        for (const msg of msgs) {
          // 4. Filter: only process messages from bounce senders
          if (!isBounceAuthor(msg.author)) continue;

          totalBounce++;
          folderBounce++;

          let raw;
          try {
            raw = await browser.messages.getRaw(msg.id);
          } catch (err) {
            logDebug(`  Failed to get raw for msg ${msg.id}: ${err.message}`);
            continue;
          }
          if (!raw) continue;

          const email = findFailedRecipient(raw);
          if (email) {
            const norm = email.toLowerCase().trim();
            if (!extractedData.has(norm)) {
              const msgDate = msg.date ? new Date(msg.date).toLocaleDateString() : "No date";
              extractedData.set(norm, msgDate);
            }
          }
        }

        totalProcessed += msgs.length;

        // Next page
        if (page.id) {
          try {
            page = await browser.messages.continueList(page.id);
          } catch {
            page = null;
          }
        } else {
          page = null;
        }
      }

      if (folderBounce > 0) {
        logDebug(`  Found ${folderBounce} bounce message(s) in ${folderLabel}.`);
      }
    }

    logDebug(`Scan finished. Total messages scanned: ${totalProcessed}, bounce messages: ${totalBounce}.`);
    await finalizeResults(extractedData, totalBounce, status);

    // Append scan summary to status
    const currentStatus = status.textContent;
    status.textContent =
      currentStatus + `\n\nScan summary:\n` +
      `Accounts: ${accounts.length}\n` +
      `Folders scanned: ${allFolders.length}\n` +
      `Total messages checked: ${totalProcessed}\n` +
      `Bounce messages found: ${totalBounce}`;

  } catch (e) {
    logDebug(`CRITICAL ERROR: ${e.message}`);
    if (e.stack) logDebug(`Stack trace: ${e.stack}`);
    status.textContent = `Error: ${e.message || e}`;
  } finally {
    hideProgress();
    setButtons(false);
  }
}

// ── Toggle debug logs ───────────────────────────────────────

function toggleLogsVisibility() {
  const logBox = document.getElementById("debugLogs");
  logBox.style.display = (logBox.style.display === "none" || logBox.style.display === "") ? "block" : "none";
}

// ── Event listeners ─────────────────────────────────────────

document.getElementById("extract").addEventListener("click", handleExtractClick);
document.getElementById("scanAll").addEventListener("click", handleScanAllClick);
document.getElementById("toggleLogs").addEventListener("click", toggleLogsVisibility);
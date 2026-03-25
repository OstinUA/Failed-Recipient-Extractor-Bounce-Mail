/**
 * Appends a timestamped debug message to the popup log textarea.
 *
 * @param {string} msg Message text to append to the debug log output.
 * @returns {void} This function does not return a value.
 *
 * @example
 * logDebug("Started scan");
 * // Appends "[10:30:15 AM] Started scan" to the debug text area.
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
 * @returns {?string} The first matched email address, or `null` when no match exists.
 *
 * @example
 * cleanEmail("Final-Recipient: rfc822; user@example.com");
 * // Returns: "user@example.com"
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
 * Parses common bounce headers in priority order, then falls back to embedded
 * `message/rfc822` payloads and finally a sanitized top-level `To:` header.
 *
 * @param {string} content Full raw message source for a bounced email.
 * @returns {?string} The failed recipient email address, or `null` if none is found.
 *
 * @example
 * findFailedRecipient("X-Failed-Recipients: jane@example.com\n...");
 * // Returns: "jane@example.com"
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
 * @returns {boolean} `true` if the author matches known bounce sender patterns.
 *
 * @example
 * isBounceAuthor("Mail Delivery Subsystem <mailer-daemon@example.com>");
 * // Returns: true
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

/**
 * Updates the progress bar to reflect current scan state.
 *
 * @param {number} current Current item index in the processing loop.
 * @param {number} total Total number of items expected in the loop.
 * @param {string} label Human-readable progress message shown below the bar.
 * @returns {void} This function does not return a value.
 *
 * @example
 * updateProgress(3, 10, "Message 3 / 10");
 * // Shows the progress bar at 30% with the provided label.
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

/**
 * Hides the progress UI container.
 *
 * @returns {void} This function does not return a value.
 *
 * @example
 * hideProgress();
 * // Hides the progress bar block in the popup.
 */
function hideProgress() {
  document.getElementById("progressContainer").style.display = "none";
}

/**
 * Enables or disables extraction action buttons.
 *
 * @param {boolean} disabled Whether action buttons should be disabled.
 * @returns {void} This function does not return a value.
 *
 * @example
 * setButtons(true);
 * // Disables both extract and full-scan buttons.
 */
function setButtons(disabled) {
  document.getElementById("extract").disabled = disabled;
  document.getElementById("scanAll").disabled = disabled;
}

/**
 * Formats extracted addresses, copies them to the clipboard, and updates status text.
 *
 * @param {Map<string,string>} extractedData Map of normalized email address to message date.
 * @param {number} processedCount Number of messages processed by the current flow.
 * @param {HTMLElement} status Status element used to display operation feedback.
 * @returns {Promise<void>} Resolves after clipboard copy and UI updates complete.
 * @throws {DOMException} If clipboard write access is denied by the runtime.
 *
 * @example
 * await finalizeResults(new Map([["user@example.com", "1/10/2026"]]), 18, statusEl);
 * // Copies one tab-delimited line and updates the popup status text.
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

/**
 * Fetches all currently selected messages from a Thunderbird mail tab.
 *
 * @param {number} tabId Identifier of the active Thunderbird mail tab.
 * @returns {Promise<Object[]>} Resolves with all selected message objects across pages.
 * @throws {Error} Propagates API errors from Thunderbird message listing calls.
 *
 * @example
 * const selected = await getAllSelectedMessages(42);
 * // Returns an array of message objects selected in tab 42.
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

/**
 * Handles the Extract button click for selected messages.
 *
 * @returns {Promise<void>} Resolves after the extraction workflow finishes.
 * @throws {Error} Handles runtime exceptions internally and surfaces them in UI status.
 *
 * @example
 * await handleExtractClick();
 * // Processes selected messages, extracts failed recipients, and copies results.
 */
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

/**
 * Recursively collects all folders from a Thunderbird folder tree.
 *
 * @param {Object[]} folders Array of Thunderbird MailFolder objects.
 * @returns {Object[]} Flat array of every folder, including nested subfolders.
 *
 * @example
 * const all = collectAllFolders([{ name: "Inbox", subFolders: [{ name: "Archive", subFolders: [] }] }]);
 * // Returns two folder objects: Inbox and Archive.
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
 * Handles the full-mailbox scan across all accounts and folders.
 *
 * @returns {Promise<void>} Resolves after folder traversal, extraction, and status updates.
 * @throws {Error} Handles runtime exceptions internally and reports them in UI status.
 *
 * @example
 * await handleScanAllClick();
 * // Scans all folders, extracts unique bounced recipients, and copies output.
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

/**
 * Toggles visibility for the debug log textarea.
 *
 * @returns {void} This function does not return a value.
 *
 * @example
 * toggleLogsVisibility();
 * // Shows or hides the debug log panel depending on current state.
 */
function toggleLogsVisibility() {
  const logBox = document.getElementById("debugLogs");
  logBox.style.display = (logBox.style.display === "none" || logBox.style.display === "") ? "block" : "none";
}

document.getElementById("extract").addEventListener("click", handleExtractClick);
document.getElementById("scanAll").addEventListener("click", handleScanAllClick);
document.getElementById("toggleLogs").addEventListener("click", toggleLogsVisibility);

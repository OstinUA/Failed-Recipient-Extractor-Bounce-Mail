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
  let page = await browser.mailTabs.getSelectedMessages(tabId);
  const all = [];
  all.push(...(page.messages || []));
  while (page && page.id) {
    page = await browser.messages.continueList(page.id);
    if (page) all.push(...(page.messages || []));
  }
  return all;
}

document.getElementById("extract").addEventListener("click", async () => {
  const status = document.getElementById("status");
  status.textContent = "Processing...";

  try {
    const [tab] = await browser.mailTabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const messages = await getAllSelectedMessages(tab.id);
    if (!messages.length) {
      status.textContent = "No messages selected.";
      return;
    }

    let extractedEmails = [];

    for (const m of messages) {
      const raw = await browser.messages.getRaw(m.id);
      const email = findFailedRecipient(raw);
      
      if (email) {
        extractedEmails.push(email.toLowerCase().trim());
      }
    }

    const uniqueEmails = [...new Set(extractedEmails)].sort();

    if (uniqueEmails.length > 0) {
      const resultText = uniqueEmails.join("\n");
      await navigator.clipboard.writeText(resultText);
      status.textContent = `Done!\nMessages processed: ${messages.length}\nUnique emails found: ${uniqueEmails.length}\n\nList copied to clipboard.`;
    } else {
      status.textContent = "No failed recipient addresses found in selected messages.";
    }

  } catch (e) {
    status.textContent = `Error: ${e.message || e}`;
  }
});
# Failed Email Extractor

### Overview

**Failed Email Extractor** is a specialized Thunderbird MailExtension designed for ad operations and email marketing professionals. It simplifies the process of managing email bounces by extracting unique recipient addresses from non-delivery reports (NDRs) directly within the Thunderbird interface.

### Key Features

* **Automated Extraction**: Scans selected messages for failed recipient headers including `X-Failed-Recipients`, `Final-Recipient`, and `Original-Recipient`.
* **Deep Parsing**: Detects recipient addresses within embedded `message/rfc822` parts of delivery status notifications.
* **Smart Filtering**: Automatically converts addresses to lowercase, removes duplicates, and sorts them alphabetically.
* **Clipboard Integration**: Copies the final list of unique emails directly to the system clipboard for easy export to Google Sheets or other tools.
* **Integrated Debug Console**: Features a hidden, built-in execution log (toggleable via UI) to track extraction steps, monitor API responses, and troubleshoot edge cases without needing external developer tools.

---

### Installation (Development Mode)

To use this extension without installing it from the official store:

1. Open Thunderbird and go to **Tools** > **Add-ons and Themes**.
2. Click the **Gear icon** and select **Debug Add-ons**.
3. Click **Load Temporary Add-on...**.
4. Select the `manifest.json` file from your project folder.

---

### How to Use

1. Select one or more non-delivery reports in your Thunderbird message list.
2. Click the **Failed Email Extractor** icon in the toolbar.
3. In the popup, click the **"Extract Unique Emails"** button.
4. The list of extracted addresses will be automatically copied to your clipboard.
5. *(Optional)* Click the **(bug)** icon in the popup to reveal the developer console and view real-time processing logs.

---

### Technical Information for Reviewers

**1. Development Environment**

* **Language**: Vanilla JavaScript (ES6+), HTML5, CSS3.
* **API**: Thunderbird MailExtension (WebExtension) API.
* **Build Tools**: No transpilers, minifiers, or machine-generation tools were used. All code is clean, heavily commented, and human-readable.

**2. Architecture Notes**

* **API Workaround**: The extraction pipeline utilizes `browser.tabs.query` (with `activeTab` permission) instead of `browser.mailTabs.query`. This is an intentional architectural decision to bypass a known Thunderbird bug where complex thread layouts cause `mailTabs.query` to throw an unexpected error.

**3. File Structure**

```text
/
├── manifest.json      # Extension metadata and permissions
├── icon.png           # Extension icon (48x48 / 128x128)
├── README.md          # Project documentation
└── mainPopup/
    ├── popup.html     # Popup interface with hidden debug console
    └── popup.js       # Extraction, parsing logic, and logging pipeline
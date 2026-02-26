# Failed Email Extractor [Bounce Mail]

![Version](https://img.shields.io/badge/version-1.3.1-blue.svg)
![Thunderbird Support](https://img.shields.io/badge/Thunderbird-102.0+-ca3026.svg?logo=thunderbird&logoColor=white)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

## Overview

**Failed Email Extractor** is a specialized Thunderbird MailExtension designed for ad operations and email marketing professionals. It significantly simplifies the process of managing email bounces by extracting unique recipient addresses from non-delivery reports (NDRs) directly within the Thunderbird interface. 

Instead of manually opening each bounce message, users can batch-process failed deliveries and export a clean list of emails in seconds.

## Key Features

* **Automated Extraction**: Scans selected messages for failed recipient headers, including `X-Failed-Recipients`, `Final-Recipient`, and `Original-Recipient`.
* **Deep Parsing**: Accurately detects recipient addresses hidden within embedded `message/rfc822` parts of delivery status notifications.
* **Smart Filtering**: Automatically converts all extracted addresses to lowercase, removes duplicates, and sorts them alphabetically for immediate use.
* **Clipboard Integration**: Copies the final list of unique emails (along with the bounce date) directly to the system clipboard for seamless export to Google Sheets, CRMs, or other analytical tools.
* **Integrated Debug Console**: Features a hidden, built-in execution log (toggleable via UI) to track extraction steps, monitor API responses, and troubleshoot edge cases locally without needing external developer tools.

## Installation (Development Mode)

To test or use this extension locally before installing it from the official store:

1. Open Thunderbird and navigate to **Tools** > **Add-ons and Themes**.
2. Click the **Gear icon** and select **Debug Add-ons**.
3. Click **Load Temporary Add-on...**.
4. Select the `manifest.json` file from your project directory.

## How to Use

1. Select one or more non-delivery reports in your Thunderbird message list.
2. Click the **Failed Email Extractor** (Fail-mail) icon in the Thunderbird toolbar.
3. In the extension popup, click the **"Extract Unique Emails"** button.
4. The list of extracted addresses will be automatically copied to your clipboard, ready to paste.
5. *(Optional)* Click the small, blank button next to the main extract button to reveal the developer console and view real-time processing logs.

## Technical Information for Reviewers

### 1. Development Environment
* **Stack**: Vanilla JavaScript (ES6+), HTML5, CSS3.
* **API Framework**: Thunderbird MailExtension (WebExtension) API.
* **Build Tools**: No transpilers, minifiers, or machine-generation tools were used. All code is clean, heavily commented, and built to be entirely human-readable.

### 2. Architecture Notes
* **API Usage**: The extraction pipeline intentionally utilizes `browser.tabs.query` to resolve the current context rather than relying exclusively on `browser.mailTabs.query`. This is a structural decision designed to bypass a known Thunderbird edge-case where complex thread layouts can cause `mailTabs.query` to throw unexpected UI-level errors. This ensures robust performance across different Thunderbird layouts without requiring additional host permissions.

### 3. File Structure
```text
/
├── manifest.json      # Extension metadata, required permissions, and versioning
├── README.md          # Project documentation and architectural overview
├── icons/             # Extension icons (32x32, 48x48, 128x128)
└── mainPopup/
    ├── popup.html     # Popup interface with hidden debug console
    └── popup.js       # Core extraction, parsing logic, and logging pipeline
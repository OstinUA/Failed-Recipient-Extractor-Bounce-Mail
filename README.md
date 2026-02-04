# Failed Email Extractor

### Overview

**Failed Email Extractor** is a specialized Thunderbird MailExtension designed for ad operations and email marketing professionals. It simplifies the process of managing email bounces by extracting unique recipient addresses from non-delivery reports (NDRs) directly within the Thunderbird interface.

### Key Features

* **Automated Extraction**: Scans selected messages for failed recipient headers including `X-Failed-Recipients`, `Final-Recipient`, and `Original-Recipient`.


* **Deep Parsing**: Detects recipient addresses within embedded `message/rfc822` parts of delivery status notifications.


* **Smart Filtering**: Automatically converts addresses to lowercase, removes duplicates, and sorts them alphabetically.


* **Clipboard Integration**: Copies the final list of unique emails directly to the system clipboard for easy export to Google Sheets or other tools.



---

### Installation (Development Mode)

To use this extension without installing it from the official store:

1. Open Thunderbird and go to **Tools** > **Add-ons and Themes**.


2. Click the **Gear icon** and select **Debug Add-ons**.


3. Click **Load Temporary Add-on...**.


4. Select the `manifest.json` file from your project folder.



### How to Use

1. Select one or more non-delivery reports in your Thunderbird message list.


2. Click the **Failed Email Extractor** icon in the toolbar.


3. In the popup, click the **"Extract Unique Emails"** button.


4. The list of extracted addresses will be automatically copied to your clipboard.



---

### Technical Information for Reviewers

**1. Development Environment**

* **Language**: Vanilla JavaScript (ES6+), HTML5, CSS3.


* **API**: Thunderbird MailExtension (WebExtension) API.


* **Build Tools**: No transpilers, minifiers, or machine-generation tools were used. All code is human-readable.



**2. File Structure**

```text
/
├── manifest.json      # Extension metadata and permissions
├── icon.png           # Extension icon (48x48 / 128x128)
└── mainPopup/
    ├── popup.html     # Popup interface
    └── popup.js       # Extraction and parsing logic

```

**3. Build Instructions**
To produce an exact copy of the `.xpi` package:

1. Navigate to the root directory containing `manifest.json`.


2. Select `manifest.json`, `icon.png`, and the `mainPopup` directory.


3. Compress these items into a standard ZIP archive.


4. Rename the resulting file to `failed-email-extractor.xpi`.



**4. Third-Party Libraries**

* This project contains **no third-party libraries**. All logic for email extraction and cleaning is implemented in `popup.js`.



---

### License

This project is provided for professional ad-tech operations and development purposes.

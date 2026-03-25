# Failed Recipient Extractor [Bounce Mail]

> A Thunderbird power-tool that mines bounce messages and outputs a deduplicated, clipboard-ready failed-recipient list in one click.

[![Version](https://img.shields.io/badge/version-1.4.1-1f6feb?style=for-the-badge)](manifest.json)
[![Thunderbird](https://img.shields.io/badge/Thunderbird-102.0%2B-ca3026?style=for-the-badge&logo=thunderbird&logoColor=white)](https://www.thunderbird.net/)
[![Build Status](https://img.shields.io/badge/build-passing-2ea44f?style=for-the-badge)](#testing)
[![Tests](https://img.shields.io/badge/tests-manual%20smoke%20tested-8250df?style=for-the-badge)](#testing)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge)](LICENSE)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Technical Block](#technical-block)
  - [Project Structure](#project-structure)
  - [Key Design Decisions](#key-design-decisions)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Usage](#usage)
- [Configuration](#configuration)
- [License](#license)
- [Contacts](#contacts)

## Features

- Batch-processes currently selected bounce/NDR messages in Thunderbird.
- Extracts recipients from multiple DSN-style headers:
  - `X-Failed-Recipients`
  - `Final-Recipient`
  - `Original-Recipient`
  - fallback parsing via `To` header and embedded `message/rfc822` content.
- Normalizes data pipeline output:
  - lowercases addresses,
  - trims noise,
  - removes duplicates,
  - sorts alphabetically.
- Stores email + message date as tab-separated rows for easy spreadsheet/CRM import.
- Pushes final payload directly to system clipboard (`clipboardWrite`) for zero-friction ops.
- Includes a hidden debug log panel in popup UI to inspect runtime extraction flow.
- Handles Thunderbird message pagination using continuation tokens (`messages.continueList`).

## Tech Stack

- **Language:** JavaScript (ES6+)
- **UI:** HTML5 + CSS3
- **Runtime/API:** Thunderbird MailExtension APIs (`manifest_version: 2`)
- **Packaging:** XPI-compatible extension structure (no bundler/transpiler required)
- **Permissions:** `messagesRead`, `clipboardWrite`

## Technical Block

### Project Structure

```text
.
├── manifest.json                  # Add-on metadata, permissions, TB min version
├── mainPopup/
│   ├── popup.html                 # Popup markup + inline styles
│   └── popup.js                   # Extraction logic, parsing, clipboard, debug logs
├── icons/
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── LICENSE                        # GPL-3.0 license
├── README.md
└── Thunderbird_addon_Fail Mail.xpi.zip  # Packaged distribution artifact
```

### Key Design Decisions

- **Active tab resolution via `browser.tabs.query`:**
  The extractor resolves the active tab first, then pulls selected messages through the mail tab API. This keeps behavior stable across different Thunderbird layouts where direct mail-tab-only resolution can be flaky.

- **Header-first + fallback parsing strategy:**
  The parser checks canonical bounce headers first, then drops to embedded RFC822 payload and final `To` fallback. This gives high extraction hit-rate without overcomplicating parsing logic.

- **Map-based deduplication with deterministic sorting:**
  A `Map` is used to ensure unique recipients while preserving associated date metadata. Final output is sorted alphabetically to keep downstream diff/review workflows deterministic.

- **Minimal dependency surface:**
  No Node.js runtime dependency, no lockfile, no build step. This keeps the extension auditable and easy to patch in restricted enterprise mail environments.

## Getting Started

### Prerequisites

Install the following on your machine:

- Mozilla Thunderbird `102.0+`
- A mailbox/folder containing bounce or NDR messages
- (Optional) Git, if you want to clone and iterate locally

### Installation

#### Option A: Load in Thunderbird for local development

```bash
# 1) Clone repository
git clone https://github.com/<your-org>/Failed-Recipient-Extractor-Bounce-Mail.git
cd Failed-Recipient-Extractor-Bounce-Mail

# 2) Open Thunderbird
# Tools -> Add-ons and Themes -> Gear icon -> Debug Add-ons
# 3) Click "Load Temporary Add-on..."
# 4) Select ./manifest.json
```

#### Option B: Use packaged artifact

```bash
# If you already have the repository contents locally,
# packaged addon artifact is available as:
ls "Thunderbird_addon_Fail Mail.xpi.zip"
```

> Tip: keep dev iteration on temporary add-on mode; Thunderbird reloads are faster than repackaging every tweak.

## Testing

This project currently relies on manual verification flows in Thunderbird.

```bash
# Basic syntax sanity check (optional but useful)
node --check mainPopup/popup.js
```

Manual smoke-test checklist:

1. Select one or more known bounce emails.
2. Click `Extract Unique Emails`.
3. Confirm status reports processed/unique counts.
4. Paste clipboard output into a text editor and validate `email<TAB>date` format.
5. Toggle hidden log panel and verify extraction trace entries appear.

If you plan to contribute larger parser changes, add reproducible fixture cases and include expected extraction results in your PR description.

## Deployment

There is no CI/CD pipeline in this repository right now; deployment is straightforward and manual.

Recommended release workflow:

```bash
# 1) Bump version in manifest.json
# 2) Validate syntax
node --check mainPopup/popup.js

# 3) Create release archive (example)
zip -r "Failed-Recipient-Extractor-vX.Y.Z.xpi" manifest.json mainPopup icons LICENSE README.md
```

Operational deployment options:

- Distribute signed package through Thunderbird add-on channels.
- Side-load internally in enterprise environments for controlled mailbox operations.
- Track release notes per version bump to keep parser behavior auditable.

## Usage

```text
# Workflow
1) In Thunderbird message list, select bounce/NDR emails.
2) Open extension popup from toolbar icon (Fail-mail).
3) Click "Extract Unique Emails".
4) Paste clipboard contents into spreadsheet/CRM.

# Output format (one row per recipient)
email@example.com<TAB>MM/DD/YYYY
another@example.org<TAB>MM/DD/YYYY
```

```javascript
// Conceptual output generation logic:
const rows = uniqueEntries
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([email, date]) => `${email}\t${date}`)
  .join("\n");

await navigator.clipboard.writeText(rows);
```

## Configuration

This extension has no `.env` and no external runtime config files.

Configuration points are code-based:

- `manifest.json`
  - `version`
  - `browser_specific_settings.gecko.strict_min_version`
  - declared `permissions`
- `mainPopup/popup.js`
  - recipient parsing regex logic,
  - excluded addresses (e.g., `mailer-daemon`, `postmaster`),
  - status/debug message strings.

If your org needs tenant-specific behavior, fork and parameterize parser rules in `popup.js`, then pin the forked build version.

## License

Distributed under **GPL-3.0**. See [`LICENSE`](LICENSE) for legal details.

## Contacts

## ❤️ Support the Project

If you find this tool useful, consider leaving a ⭐ on GitHub or supporting the author directly:

[![Patreon](https://img.shields.io/badge/Patreon-OstinFCT-f96854?style=flat-square&logo=patreon)](https://www.patreon.com/OstinFCT)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-fctostin-29abe0?style=flat-square&logo=ko-fi)](https://ko-fi.com/fctostin)
[![Boosty](https://img.shields.io/badge/Boosty-Support-f15f2c?style=flat-square)](https://boosty.to/ostinfct)
[![YouTube](https://img.shields.io/badge/YouTube-FCT--Ostin-red?style=flat-square&logo=youtube)](https://www.youtube.com/@FCT-Ostin)
[![Telegram](https://img.shields.io/badge/Telegram-FCTostin-2ca5e0?style=flat-square&logo=telegram)](https://t.me/FCTostin)

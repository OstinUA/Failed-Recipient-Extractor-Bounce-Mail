# Contributing to Failed Recipient Extractor [Bounce Mail]

Thanks for investing your time in this project. Contributions are welcome whether you're fixing parser edge-cases, tightening UX, or improving release ergonomics for Thunderbird operators.

This add-on is used in real-world bounce management workflows, so reliability and reproducibility matter more than flashy rewrites. Keep diffs surgical, test behavior against real samples, and document decisions.

## I Have a Question

Please **do not** open GitHub Issues for usage or support questions.

Issues are reserved for actionable bugs and concrete feature work. For questions, use one of these channels:

- GitHub Discussions (preferred, if enabled for this repository)
- Thunderbird/WebExtension community channels
- Your team/internal chat if you are using an organization fork

When asking questions, include:

- Thunderbird version
- What you tried already
- Relevant log output from the extension debug panel

## Reporting Bugs

Great bug reports drastically reduce turnaround time.

### Before opening a bug

- Search existing open/closed Issues for duplicates.
- Verify behavior on the latest repository version.
- Re-test with a minimal set of sample bounce messages.

### Include this environment block

```text
OS:                e.g. Windows 11 / Ubuntu 24.04 / macOS 14
Thunderbird:       e.g. 128.x
Add-on version:    e.g. 1.3.1
Install mode:      Temporary add-on / packaged build
Mail source type:  IMAP / POP / Local folder
```

### Steps to reproduce

Provide a deterministic sequence:

1. Which folder/account you opened.
2. Exactly how many and what type of messages were selected.
3. Which UI action was triggered.
4. What status/debug output appeared.
5. What clipboard output (if any) was produced.

### Expected vs actual behavior

Include both:

- **Expected:** what should have happened
- **Actual:** what happened instead

If possible, sanitize and attach a representative raw message snippet containing headers like `X-Failed-Recipients`, `Final-Recipient`, or `Original-Recipient`.

## Suggesting Enhancements

Feature requests are welcome when they solve concrete operator pain.

A high-signal enhancement proposal should include:

- **Problem statement:** what currently blocks or slows users.
- **Why now:** business/operational reason this feature matters.
- **Proposed behavior:** exact UX or parser behavior.
- **Use cases:** at least 1-2 real workflows this improves.
- **Trade-offs:** any complexity, permission, or compatibility impact.

Low-context requests like “add AI”, “support everything”, or “rewrite in framework X” will likely be deprioritized.

## Local Development / Setup

### 1) Fork and clone

```bash
# Fork on GitHub first, then clone your fork
git clone https://github.com/<your-user>/Failed-Recipient-Extractor-Bounce-Mail.git
cd Failed-Recipient-Extractor-Bounce-Mail
```

### 2) Create a working branch

```bash
git checkout -b feature/short-description
```

### 3) Load extension in Thunderbird

```text
Thunderbird -> Tools -> Add-ons and Themes
-> Gear icon -> Debug Add-ons -> Load Temporary Add-on...
-> Select ./manifest.json
```

### 4) Run local sanity checks

```bash
# JavaScript parse check
node --check mainPopup/popup.js
```

### 5) Validate behavior manually

- Select sample bounce messages.
- Run extraction.
- Verify clipboard payload and debug logs.

> There is currently no `.env` setup in this repo.

## Pull Request Process

### Branch naming strategy

Use descriptive branch names:

- `feature/<short-feature-name>`
- `bugfix/<issue-id-or-short-name>`
- `docs/<scope>`
- `chore/<scope>`

Examples:

- `feature/final-recipient-parser-hardening`
- `bugfix/42-empty-selection-status`

### Commit message format

Use Conventional Commits:

- `feat: add RFC822 fallback for nested bounce payloads`
- `fix: skip postmaster aliases in To-header fallback`
- `docs: rewrite README and contribution workflow`

### Keep branch synced

Before opening a PR, rebase/sync with the default branch:

```bash
git fetch upstream
git rebase upstream/main
```

(If your fork doesn’t have `upstream` configured, add it first.)

### PR description checklist

Your PR should include:

- Linked issue(s): `Closes #123` / `Refs #123`
- Problem summary and root cause
- What changed and why
- Manual test evidence
- Screenshots/gifs for visible UI changes in popup behavior
- Backward compatibility notes (especially around Thunderbird versions)

Small focused PRs are preferred over mega-diffs.

## Styleguides

### Code style

- Keep implementation vanilla and dependency-free unless there is a strong justification.
- Prefer explicit, readable logic over clever abstractions.
- Match existing project style in `mainPopup/popup.js` and `popup.html`.
- Avoid unrelated refactors in bugfix PRs.

### Linters/formatters

This repository does not currently enforce ESLint/Prettier in CI.

Contributor expectation:

- Keep formatting consistent with existing files.
- Run at least `node --check mainPopup/popup.js`.
- If you use local lint/format tooling, avoid reformatting unrelated lines.

### Architecture constraints

- Preserve Thunderbird MailExtension compatibility.
- Avoid introducing build tooling unless maintainers explicitly request it.
- Keep permission scope minimal in `manifest.json`.

## Testing

All behavior-affecting changes should be validated with manual test coverage.

Minimum expectation for parser/UI changes:

1. Positive case: known bounce messages produce expected recipients.
2. Negative case: non-bounce messages do not produce false positives.
3. Dedupe/sorting case: duplicate recipients collapse and remain ordered.
4. Clipboard case: output can be pasted as tab-separated rows.

Recommended command:

```bash
node --check mainPopup/popup.js
```

Add test notes directly to your PR so reviewers can replay your scenario quickly.

## Code Review Process

- Maintainers review incoming PRs for correctness, scope control, and maintainability.
- At least one maintainer approval is expected before merge.
- Requested changes should be addressed with follow-up commits or a clean rebase.
- Keep review discussion technical and focused; include logs/evidence when disputing behavior.
- PRs with failing checks, missing reproduction details, or unclear impact may be held until clarified.

Thanks again for contributing and helping keep this tool production-useful for bounce operations.

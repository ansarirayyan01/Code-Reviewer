## Code Reviewer

**Code Reviewer** is a simple VS Code extension that sends the current file or selection to your own local backend and shows an AI-generated code review.

### How it works

- You run a command in VS Code:
  - **AI Code Review: Review Current File**
  - **AI Code Review: Review Selection**
- The extension sends the code to your backend:
  - `POST /ai/get-review` on the base URL you configure (default `http://localhost:3000`)
  - Body: `{ "code": "..." }`
- Your backend (using Gemini in this project) returns JSON:
  - `{ "review": "markdown text..." }`
- The extension shows that markdown text in a side panel.

### Requirements

- VS Code `1.85.0` or newer.
- Your backend server running locally, for example:

```bash
cd BackEnd
node server.js
```

### Commands

- **AI Code Review: Review Current File**
  - Reviews the entire active editor file.
- **AI Code Review: Review Selection**
  - Reviews only the currently selected text.

You can find these via the Command Palette (`Ctrl+Shift+P`) by searching for **"AI Code Review"**.

### Settings

- **`aiCodeReviewer.apiBaseUrl`**
  - Default: `http://localhost:3000`
  - Set this if your backend runs on a different host/port.
- **`aiCodeReviewer.requestTimeoutMs`**
  - Default: `60000` (60 seconds)
  - Change this if your reviews are slow and you get timeouts.

### Icon and screenshots

- The extension icon is defined at `assets/icon.svg`.  
  You can replace this SVG with your own logo (recommended size: 128×128).
- To show screenshots on the Marketplace later, you can add images (e.g. `images/overview.png`) and reference them from this README with standard markdown:



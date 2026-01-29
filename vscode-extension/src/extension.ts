import * as vscode from "vscode";

type ReviewResponse = { review: string } | { error: string };

function getConfig() {
  const cfg = vscode.workspace.getConfiguration("aiCodeReviewer");
  const apiBaseUrl = cfg.get<string>("apiBaseUrl", "http://localhost:3000").replace(/\/+$/, "");
  const requestTimeoutMs = cfg.get<number>("requestTimeoutMs", 60_000);
  return { apiBaseUrl, requestTimeoutMs };
}

async function postJsonWithTimeout<T>(
  url: string,
  body: unknown,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await res.text();
    let json: unknown = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      // ignore
    }

    if (!res.ok) {
      const msg =
        typeof (json as any)?.error === "string"
          ? (json as any).error
          : `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return json as T;
  } finally {
    clearTimeout(id);
  }
}

function getOrCreatePanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
  const existing = context.workspaceState.get<string>("aiCodeReviewer.panel");
  // We can't resurrect a disposed panel from ID; keep it simple: always create new.
  const panel = vscode.window.createWebviewPanel(
    "aiCodeReviewerReview",
    "AI Code Review",
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );
  void context.workspaceState.update("aiCodeReviewer.panel", existing ?? "created");
  return panel;
}

function setPanelMarkdown(panel: vscode.WebviewPanel, markdown: string) {
  // Render markdown using VS Code's built-in markdown renderer inside a webview by
  // leveraging <pre> fallback (simple, safe, no scripts). This keeps MVP minimal.
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  panel.webview.html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; }
      pre { white-space: pre-wrap; word-break: break-word; line-height: 1.45; }
      .hint { opacity: 0.7; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <div class="hint">Tip: You can copy this and paste into a Markdown viewer if needed.</div>
    <pre>${escaped}</pre>
  </body>
</html>`;
}

async function reviewText(context: vscode.ExtensionContext, code: string) {
  const { apiBaseUrl, requestTimeoutMs } = getConfig();
  const panel = getOrCreatePanel(context);
  panel.title = "AI Code Review (running...)";
  setPanelMarkdown(panel, "Generating review...");

  try {
    const data = await postJsonWithTimeout<ReviewResponse>(
      `${apiBaseUrl}/ai/get-review`,
      { code },
      requestTimeoutMs
    );

    if ((data as any)?.review) {
      panel.title = "AI Code Review";
      setPanelMarkdown(panel, (data as any).review as string);
      return;
    }

    const err = (data as any)?.error || "Unknown error";
    throw new Error(err);
  } catch (e: any) {
    panel.title = "AI Code Review (error)";
    setPanelMarkdown(panel, `Error: ${e?.message || String(e)}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const reviewSelection = vscode.commands.registerCommand(
    "aiCodeReviewer.reviewSelection",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const sel = editor.selection;
      const text = editor.document.getText(sel).trim();
      if (!text) {
        vscode.window.showWarningMessage("Select some code to review.");
        return;
      }

      await reviewText(context, text);
    }
  );

  const reviewFile = vscode.commands.registerCommand("aiCodeReviewer.reviewFile", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const text = editor.document.getText().trim();
    if (!text) {
      vscode.window.showWarningMessage("Current file is empty.");
      return;
    }

    await reviewText(context, text);
  });

  context.subscriptions.push(reviewSelection, reviewFile);
}

export function deactivate() {}


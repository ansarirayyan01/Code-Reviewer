"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function getConfig() {
    const cfg = vscode.workspace.getConfiguration("aiCodeReviewer");
    const apiBaseUrl = cfg.get("apiBaseUrl", "http://localhost:3000").replace(/\/+$/, "");
    const requestTimeoutMs = cfg.get("requestTimeoutMs", 60_000);
    return { apiBaseUrl, requestTimeoutMs };
}
async function postJsonWithTimeout(url, body, timeoutMs) {
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
        let json = {};
        try {
            json = text ? JSON.parse(text) : {};
        }
        catch {
            // ignore
        }
        if (!res.ok) {
            const msg = typeof json?.error === "string"
                ? json.error
                : `Request failed (${res.status})`;
            throw new Error(msg);
        }
        return json;
    }
    finally {
        clearTimeout(id);
    }
}
function getOrCreatePanel(context) {
    const existing = context.workspaceState.get("aiCodeReviewer.panel");
    // We can't resurrect a disposed panel from ID; keep it simple: always create new.
    const panel = vscode.window.createWebviewPanel("aiCodeReviewerReview", "AI Code Review", vscode.ViewColumn.Beside, { enableScripts: false });
    void context.workspaceState.update("aiCodeReviewer.panel", existing ?? "created");
    return panel;
}
function setPanelMarkdown(panel, markdown) {
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
async function reviewText(context, code) {
    const { apiBaseUrl, requestTimeoutMs } = getConfig();
    const panel = getOrCreatePanel(context);
    panel.title = "AI Code Review (running...)";
    setPanelMarkdown(panel, "Generating review...");
    try {
        const data = await postJsonWithTimeout(`${apiBaseUrl}/ai/get-review`, { code }, requestTimeoutMs);
        if (data?.review) {
            panel.title = "AI Code Review";
            setPanelMarkdown(panel, data.review);
            return;
        }
        const err = data?.error || "Unknown error";
        throw new Error(err);
    }
    catch (e) {
        panel.title = "AI Code Review (error)";
        setPanelMarkdown(panel, `Error: ${e?.message || String(e)}`);
    }
}
function activate(context) {
    const reviewSelection = vscode.commands.registerCommand("aiCodeReviewer.reviewSelection", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const sel = editor.selection;
        const text = editor.document.getText(sel).trim();
        if (!text) {
            vscode.window.showWarningMessage("Select some code to review.");
            return;
        }
        await reviewText(context, text);
    });
    const reviewFile = vscode.commands.registerCommand("aiCodeReviewer.reviewFile", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const text = editor.document.getText().trim();
        if (!text) {
            vscode.window.showWarningMessage("Current file is empty.");
            return;
        }
        await reviewText(context, text);
    });
    context.subscriptions.push(reviewSelection, reviewFile);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map
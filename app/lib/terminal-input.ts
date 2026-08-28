/**
 * Types a command into the terminal panel on the learner's behalf.
 *
 * The frame is same-origin (the app proxies /terminal under its own origin),
 * so we can reach into it. xterm.js keeps a hidden textarea for IME and
 * clipboard work and handles `paste` on it, forwarding the text down the same
 * WebSocket a keystroke would take -- so the shell cannot tell this from
 * typing. Nothing is submitted: no Enter is sent, because running the command
 * is the learner's move (FR-030).
 *
 * Returns false when the frame is not reachable -- TERMINAL_URL can point at
 * another origin, and then the browser correctly refuses. Callers fall back to
 * the clipboard.
 */
export function pasteIntoTerminal(command: string): boolean {
  if (typeof document === "undefined") return false;

  const frame = document.querySelector<HTMLIFrameElement>("iframe[data-terminal]");
  if (!frame) return false;

  try {
    const doc = frame.contentDocument;
    const target = doc?.querySelector<HTMLTextAreaElement>(".xterm-helper-textarea");
    if (!doc || !target) return false;

    const data = new DataTransfer();
    data.setData("text/plain", command);
    const pasted = target.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
    // dispatchEvent returns false only when a handler called preventDefault --
    // which is exactly what xterm does once it has taken the text.
    if (pasted) return false;

    // Focus last: the learner's next keystroke should land in the terminal,
    // right after the command we just put there.
    frame.contentWindow?.focus();
    target.focus();
    return true;
  } catch {
    // Cross-origin frame. Not an error -- just not available.
    return false;
  }
}

/**
 * Types a command into the terminal panel on the learner's behalf.
 *
 * The frame is same-origin (the app proxies /terminal under its own origin),
 * so we can reach into it. xterm.js keeps a hidden textarea for IME and
 * clipboard work and handles `paste` on it, forwarding the text down the same
 * WebSocket a keystroke would take -- so the shell cannot tell this from
 * typing.
 *
 * `submit` then presses Enter. It is a separate keydown rather than a \r
 * appended to the pasted text: the agent reads a paste in bracketed-paste
 * mode, where an embedded newline is a newline INSIDE the prompt, not a send.
 * The keystroke also has to arrive after the client has finished ingesting the
 * paste -- dispatched in the same task it lands on a prompt that is still
 * empty -- hence the small delay.
 *
 * Returns false when the frame is not reachable -- TERMINAL_URL can point at
 * another origin, and then the browser correctly refuses. Callers fall back to
 * the clipboard.
 */
// Long enough for the client to finish taking the paste before Enter lands,
// short enough that the button still feels like one action.
const SUBMIT_DELAY_MS = 250;

export function pasteIntoTerminal(command: string, submit = true): boolean {
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

    if (submit) {
      setTimeout(() => {
        try {
          target.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            }),
          );
        } catch {
          // Frame gone between the paste and the tick. The text is already in
          // the prompt, so the learner can still press Enter themselves.
        }
      }, SUBMIT_DELAY_MS);
    }
    return true;
  } catch {
    // Cross-origin frame. Not an error -- just not available.
    return false;
  }
}

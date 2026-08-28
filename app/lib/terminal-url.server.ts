/**
 * URL the browser should point the terminal iframe at.
 *
 * The default is a same-origin relative path because Vite proxies /terminal to
 * the terminal process inside the container, so the terminal is never exposed
 * on its own host port.
 */
export function getTerminalUrl(): string {
  const configured = process.env.TERMINAL_URL;
  if (configured) return configured;
  return "/terminal/";
}

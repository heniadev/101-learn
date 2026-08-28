import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Which port the dev server listens on inside the container.
// devcontainer/run.sh publishes whatever DEVCONTAINER_PORTS says and passes the
// resulting mapping in as DEVCONTAINER_PORT_MAP (space-separated
// "container:host" pairs, e.g. "7888:7888"). This container currently runs with
// 7888, so hardcoding 5173 would make the app unreachable from the host browser.
const containerPortFromMap = (): number | undefined => {
  const firstPair = (process.env.DEVCONTAINER_PORT_MAP ?? "").trim().split(/\s+/)[0];
  const containerPort = Number(firstPair?.split(":")[0]);
  return Number.isFinite(containerPort) && containerPort > 0 ? containerPort : undefined;
};

const devPort = Number(process.env.PORT) || containerPortFromMap() || 5173;

// ttyd runs alongside us inside the container; we proxy to it instead of
// publishing its port.
const terminalTarget = `http://127.0.0.1:${process.env.TERMINAL_PORT || 7681}`;

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    // Vite binds to loopback by default, and then Docker's published port
    // reaches nothing.
    host: "0.0.0.0",
    port: devPort,
    proxy: {
      "/terminal": {
        target: terminalTarget,
        // REQUIRED: ttyd upgrades to a WebSocket after the initial page load.
        // HTTP-only proxying yields a terminal that renders and then freezes.
        ws: true,
        changeOrigin: true,
        // ttyd serves from its root, so strip the /terminal prefix.
        rewrite: (path) => path.replace(/^\/terminal/, ""),
      },
    },
  },
});

FROM node:22-slim

# System deps the agent legitimately needs inside the isolated workspace.
# iptables sets up the network firewall (entrypoint.sh); gosu drops root
# privileges cleanly after that setup, before anything touches the repo.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    curl \
    nano \
    vim \
    iptables \
    gosu \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code

# ttyd: the web terminal the course page embeds -- the app serves a real shell
# in the browser, so this binary has to be present for the lesson to work at
# all. Baked in at build time for the same reason as the Playwright libs below:
# the runtime user is non-root and sudo-less, so it can never install this
# later. It also keeps the demo entirely offline -- nothing is fetched from the
# network when the container runs. Pinned version + hardcoded per-arch sha256,
# computed directly from the downloaded release assets, because upstream
# publishes no checksums file to verify against.
RUN TTYD_VERSION="1.7.7" \
    && case "$(dpkg --print-architecture)" in \
         amd64) TTYD_ARCH="x86_64"; TTYD_SHA="8a217c968aba172e0dbf3f34447218dc015bc4d5e59bf51db2f2cd12b7be4f55" ;; \
         arm64) TTYD_ARCH="aarch64"; TTYD_SHA="b38acadd89d1d396a0f5649aa52c539edbad07f4bc7348b27b4f4b7219dd4165" ;; \
         *) echo "unsupported architecture for ttyd: $(dpkg --print-architecture)" >&2; exit 1 ;; \
       esac \
    && curl -fsSLo /usr/local/bin/ttyd \
    "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.${TTYD_ARCH}" \
    && echo "${TTYD_SHA}  /usr/local/bin/ttyd" | sha256sum -c - \
    && chmod +x /usr/local/bin/ttyd

# gh: the GitHub CLI. Needed to publish the mockup to GitHub Pages (and to
# enable Pages itself, which is an API call, not a git push). Baked in for the
# same reason as ttyd above: the runtime user is non-root and sudo-less, and gh
# is not in Debian bookworm. Pinned version + hardcoded per-arch sha256,
# computed from the downloaded release assets.
RUN GH_VERSION="2.63.2" \
    && case "$(dpkg --print-architecture)" in \
         amd64) GH_SHA="912fdb1ca29cb005fb746fc5d2b787a289078923a29d0f9ec19a0b00272ded00" ;; \
         arm64) GH_SHA="0f31e2a8549c64b5c1679f0b99ce5e0dac7c91da9e86f6246adb8805b0f0b4bb" ;; \
         *) echo "unsupported architecture for gh: $(dpkg --print-architecture)" >&2; exit 1 ;; \
       esac \
    && GH_ARCH="$(dpkg --print-architecture)" \
    && curl -fsSLo /tmp/gh.tar.gz \
    "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${GH_ARCH}.tar.gz" \
    && echo "${GH_SHA}  /tmp/gh.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/gh.tar.gz -C /tmp \
    && install -m 0755 "/tmp/gh_${GH_VERSION}_linux_${GH_ARCH}/bin/gh" /usr/local/bin/gh \
    && rm -rf /tmp/gh.tar.gz "/tmp/gh_${GH_VERSION}_linux_${GH_ARCH}"

# Playwright/Chromium runtime libs: the devcontainer runs as a non-root,
# sudo-less user after entrypoint.sh drops privileges, so `npx playwright
# install-deps` (which needs apt/root) can never run at container-runtime —
# these must be baked in at image-build time instead, while we're still root.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libdbus-1-3 \
    libcups2 \
    libxcb1 \
    libxkbcommon0 \
    libasound2 \
    libgbm1 \
    libx11-6 \
    libxext6 \
    libcairo2 \
    libpango-1.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# The container starts as root (entrypoint.sh needs NET_ADMIN/NET_RAW to set
# up the firewall) and drops to `--user`-equivalent via gosu before running
# anything from the repo. This directory must be writable by whatever
# arbitrary target UID gosu drops into at runtime, not just a UID baked in
# at build time.
RUN mkdir -p /home/agent && chmod 0777 /home/agent
# Same story one directory over: a named volume is mounted at
# /workspace/node_modules at runtime, and the container drops to an arbitrary
# host UID via gosu, so there is no build-time owner to chown to -- 0777 is the
# only permission that works for every UID, exactly as for /home/agent above.
RUN mkdir -p /workspace/node_modules && chmod 0777 /workspace/node_modules
ENV HOME=/home/agent
# This variable tells executed tools that they should emit sparse output
# - saving context space in AI Agents.
ENV AI_AGENT=1

COPY entrypoint.sh /entrypoint.sh
COPY user-entrypoint.sh /usr/local/bin/user-entrypoint.sh
RUN chmod +x /entrypoint.sh /usr/local/bin/user-entrypoint.sh

WORKDIR /workspace

ENTRYPOINT ["/entrypoint.sh"]

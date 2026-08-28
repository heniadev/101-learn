#!/usr/bin/env node
// Renames recordings to the keys the current normaliser produces.
//
// WHY: a recording's key is in its filename, so any change to keyForText in
// server.mjs makes every existing recording unfindable -- the server hashes
// the same conversation to a new digest and looks for a file nobody named
// that. Re-recording the walk would cost an hour and a stack of API calls for
// answers already captured and reviewed.
//
// It does not have to. A recording's header stores the flattened conversation
// verbatim, which is exactly what the digest is computed from, so every key
// can be re-derived offline. This script imports keyForText from the server
// rather than reimplementing it: a second copy of the normaliser would drift
// and rename files to keys the server never asks for.
//
//   node scripts/mock-llm/rekey.mjs --dry-run   # show what would change
//   node scripts/mock-llm/rekey.mjs             # rename in place
import { readFile, readdir, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { keyForText } from "./server.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RECORDINGS = process.env.MOCK_LLM_RECORDINGS ?? join(HERE, "recordings");
const DRY = process.argv.includes("--dry-run");

const files = (await readdir(RECORDINGS)).filter((n) => n.endsWith(".sse")).sort();
if (!files.length) {
  console.error(`rekey: no recordings in ${RECORDINGS}`);
  process.exit(1);
}

const planned = [];
for (const name of files) {
  const raw = await readFile(join(RECORDINGS, name), "utf8");
  const header = JSON.parse(raw.slice(0, raw.indexOf("\n")));
  const { digest, slug } = keyForText(header.model, header.prompt ?? "");
  planned.push({ from: name, to: `${digest}.${slug}.sse`, digest });
}

// A collision means two conversations now hash the same, and one recording
// would silently answer for both. Refuse the whole run rather than rename a
// corpus into that state -- and name the pair, because the fix is a normaliser
// that keeps more, not a retry.
const byDigest = new Map();
for (const p of planned) byDigest.set(p.digest, [...(byDigest.get(p.digest) ?? []), p.from]);
const collisions = [...byDigest.entries()].filter(([, v]) => v.length > 1);
if (collisions.length) {
  console.error(`rekey: ${collisions.length} digest collision(s) -- nothing renamed:`);
  for (const [digest, names] of collisions) console.error(`  ${digest}: ${names.join(", ")}`);
  process.exit(1);
}

const changed = planned.filter((p) => p.from !== p.to);
console.log(`${files.length} recordings, ${changed.length} need a new name.`);
for (const p of changed) console.log(`  ${p.from.slice(0, 16)} -> ${p.to.slice(0, 16)}`);

if (DRY) {
  console.log("--dry-run: nothing renamed.");
  process.exit(0);
}

// Two passes through a temporary name: a one-pass rename can clobber a file
// whose old name is another file's new name.
for (const p of changed) {
  await rename(join(RECORDINGS, p.from), join(RECORDINGS, `${p.from}.rekey-tmp`));
}
for (const p of changed) {
  await rename(join(RECORDINGS, `${p.from}.rekey-tmp`), join(RECORDINGS, p.to));
}
console.log(`renamed ${changed.length}.`);

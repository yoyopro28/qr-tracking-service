import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}

const output = "dist";
const builtFiles = await files(output);
const sourceMaps = builtFiles.filter((file) => extname(file) === ".map");
if (sourceMaps.length) throw new Error(`Public source maps found: ${sourceMaps.map((file) => relative(output, file)).join(", ")}`);

const secretPatterns = [
  /sb_secret_[A-Za-z0-9_-]{20,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
];
for (const file of builtFiles.filter((value) => /\.(?:html|js|css|json|txt)$/.test(value))) {
  const content = await readFile(file, "utf8");
  if (secretPatterns.some((pattern) => pattern.test(content))) throw new Error(`Possible privileged key found in browser asset: ${relative(output, file)}`);
}

console.log(JSON.stringify({ checkedFiles: builtFiles.length, sourceMaps: 0, privilegedKeys: 0 }));

import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyIfExists(sourcePath, targetPath) {
  if (!(await pathExists(sourcePath))) {
    return;
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, {
    recursive: true,
    force: true,
  });
}

await copyIfExists(
  path.join(projectRoot, "public"),
  path.join(standaloneRoot, "public"),
);

await copyIfExists(
  path.join(projectRoot, ".next", "static"),
  path.join(standaloneRoot, ".next", "static"),
);

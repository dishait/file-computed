import destr from "destr";
import { dirname } from "node:path";
import { debounce } from "perfect-debounce";
import { lstat, mkdir, writeFile } from "node:fs/promises";
import { createReadStream, existsSync, lstatSync, mkdirSync } from "node:fs";

export function getMtimeSync(
  filepath: string,
) {
  const { mtime } = lstatSync(filepath);
  return mtime.getTime();
}

export async function getMtime(
  filepath: string,
) {
  const { mtime } = await lstat(filepath);
  return mtime.getTime();
}

export function ensureDirSync(dirpath: string) {
  if (!existsSync(dirpath)) {
    mkdirSync(dirpath, {
      recursive: true,
    });
  }
}

export async function exists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    return false;
  }
}

export async function ensureFile(
  path: string,
  content = "",
) {
  if (await exists(path)) {
    return;
  }
  await mkdir(dirname(path), {
    recursive: true,
  });

  await writeFile(path, content);
}

export function writeJsonFile(
  path: string,
  content: string,
) {
  return writeFile(path, content);
}

export const debouncedWriteJsonFile = debounce(
  writeJsonFile,
  500,
);

export function readJsonFileWithStream<T>(
  path: string,
): Promise<T> {
  let chunk = "";
  return new Promise((resolve, reject) => {
    createReadStream(path, {
      encoding: "utf-8",
    })
      .on("data", (v) => {
        chunk += v;
      })
      .once("end", () => {
        resolve(destr(chunk));
      })
      .once("error", (err) => {
        reject(err);
      });
  });
}

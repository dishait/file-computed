import destr from "destr";
import { ensureDirSync } from "./fs";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import closeWithGrace from "close-with-grace";
import { normalizeCachePath, normalizePath } from "./path";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

export function createFsStorage(cachePath?: string) {
  const storage = createStorage({
    driver: fsDriver({
      base: normalizeCachePath(cachePath),
    }),
  });

  closeWithGrace({ delay: 500 }, async function () {
    await storage.dispose();
  });

  return storage;
}

export function createFsStorageSync(cachePath?: string) {
  cachePath = normalizeCachePath(cachePath);
  ensureDirSync(cachePath);

  const storage = {
    clear() {
      rmSync(cachePath);
    },
    getItem(key: string) {
      const path = normalizePath(cachePath, key);
      if (!existsSync(path)) {
        return null;
      }
      const value = readFileSync(path);
      if (value) {
        return destr(value.toString());
      }
      return null;
    },
    setItem(key: string, value: any) {
      const path = normalizePath(cachePath, key);
      writeFileSync(path, JSON.stringify(value));
    },
    removeItem(key: string) {
      const path = normalizePath(cachePath, key);
      if (existsSync(path)) {
        rmSync(path);
        return true;
      }
      return false;
    },
  };

  return storage;
}

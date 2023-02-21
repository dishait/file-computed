import type {
  AnyFunction,
  MayBeArray,
  UnPromiseReturnType,
} from "m-type-tools";
import {
  debouncedWriteJsonFile,
  ensureFile,
  exists,
  getFileModifyTimeStamp,
  getFileModifyTimeStampSync,
  readJsonFileWithStream,
} from "./fs";

import { asyncExitHook } from "exit-hook";
import { createHooks } from "hookable";
import type { Hookable } from "hookable";
import { isArray } from "m-type-tools";
import fastJson from "fast-json-stringify";
import { lstat, readFile } from "fs/promises";
import { existsSync, lstatSync, readFileSync } from "fs";
import { normalizeCachePath, normalizePath } from "./path";
import { createFsStorage, createFsStorageSync } from "./storage";
import { hash, log, murmurHash, parallel, untilCheckScope } from "./utils";

// 缓冲如果 1.5 秒内没有写完，则不写缓存了
const BeforeExitMinimumWait = 1500;

interface ICreateFsComputedOptions {
  cachePath?: string;
  beforeExit?: boolean;
}

interface IItem {
  result: any;
  metas: Array<{
    path: string;
    hash: number;
    type: "file" | "dir";
    modifyTimeStamp: number;
  }>;
}

let hooks: Hookable;

asyncExitHook(async () => {
  if (hooks) {
    await hooks.callHookParallel("setItem");
  }
}, {
  minimumWait: BeforeExitMinimumWait,
});

export function createFsComputed(
  options: ICreateFsComputedOptions = {},
) {
  const { cachePath, beforeExit = false } = options;
  const storage = createFsStorage(cachePath);

  hooks ??= beforeExit ? createHooks() : null;

  async function computed<T extends AnyFunction>(
    paths: MayBeArray<string>,
    fn: T,
  ): Promise<UnPromiseReturnType<T>> {
    type Value = UnPromiseReturnType<T>;

    if (!isArray(paths)) {
      paths = [paths];
    }

    const key = hash([paths, fn]);
    const oldItem = (await storage.getItem(key)) as IItem;

    if (!oldItem) {
      const { metas, loadExistsFileHashs } = await createMetas(paths);
      await loadExistsFileHashs();
      const result = await fn();

      if (!beforeExit) {
        await storage.setItem(key, { result, metas });
      } else {
        hooks.hookOnce(
          "setItem",
          () => storage.setItem(key, { result, metas }),
        );
      }

      return result;
    }

    const { metas: oldMetas, result } = oldItem;

    const {
      metas: newMetas,
      loadExistsFileHashs,
      existsFileIndexs,
    } = await createMetas(paths);

    async function refresh() {
      const newResult = await fn();

      if (!beforeExit) {
        storage.setItem(key, {
          result: newResult,
          metas: newMetas,
        } as IItem);
      } else {
        hooks.hookOnce(
          "setItem",
          () =>
            storage.setItem(key, {
              result: newResult,
              metas: newMetas,
            } as IItem),
        );
      }

      return newResult as Value;
    }

    // check mtime
    const changedMeta = newMetas.find((newMeta, index) => {
      const oldMeta = oldMetas[index];
      return (
        newMeta.modifyTimeStamp !== oldMeta.modifyTimeStamp
      );
    });

    if (!changedMeta) {
      return result as Value;
    }

    await loadExistsFileHashs();

    // if dir modifyTimeStamp changed
    if (changedMeta.type === "dir") {
      return (await refresh()) as Value;
    }

    // check hash
    const changed = existsFileIndexs.some((index) => {
      const oldMetaHash = oldMetas[index].hash;
      const newMetaHash = newMetas[index].hash;
      return oldMetaHash !== newMetaHash;
    });

    if (!changed) {
      return result as Value;
    }

    return (await refresh()) as Value;
  }

  computed.remove = async function (key: string) {
    await storage.removeItem(key);
  };

  computed.clear = async function () {
    await storage.clear();
  };

  return computed;
}

export function createFsComputedSync(
  options: ICreateFsComputedOptions = {},
) {
  const { cachePath, beforeExit = false } = options;
  const storage = createFsStorageSync(cachePath);

  hooks ??= beforeExit ? createHooks() : null;

  function computed<T extends AnyFunction>(
    paths: MayBeArray<string>,
    fn: T,
  ): ReturnType<T> {
    type Value = ReturnType<T>;

    if (!isArray(paths)) {
      paths = [paths];
    }

    const key = hash([paths, fn]);
    const oldItem = storage.getItem(key) as IItem;

    if (!oldItem) {
      const { metas, loadExistsFileHashs } = createMetasSync(paths);

      loadExistsFileHashs();

      const result = fn();
      if (!beforeExit) {
        storage.setItem(key, {
          result,
          metas,
        });
      } else {
        hooks.hookOnce("setItem", () =>
          storage.setItem(key, {
            result,
            metas,
          }));
      }

      return result as Value;
    }

    const { metas: oldMetas, result } = oldItem;

    const {
      metas: newMetas,
      existsFileIndexs,
      loadExistsFileHashs,
    } = createMetasSync(paths);

    function refresh() {
      const newResult = fn();

      if (!beforeExit) {
        storage.setItem(key, {
          result: newResult,
          metas: newMetas,
        } as IItem);
      } else {
        hooks.hookOnce("setItem", () =>
          storage.setItem(key, {
            result: newResult,
            metas: newMetas,
          } as IItem));
      }

      return newResult as Value;
    }

    const changedMeta = newMetas.find((newMeta, index) => {
      const oldMeta = oldMetas[index];
      return (
        newMeta.modifyTimeStamp !== oldMeta.modifyTimeStamp
      );
    });

    if (!changedMeta) {
      return result as Value;
    }

    loadExistsFileHashs();

    // if dir modifyTimeStamp changed
    if (changedMeta.type === "dir") {
      return refresh() as Value;
    }

    const changed = existsFileIndexs.some((index) => {
      const oldMetaHash = oldMetas[index].hash;
      const newMetaHash = newMetas[index].hash;
      return oldMetaHash !== newMetaHash;
    });

    if (!changed) {
      return result as Value;
    }

    return refresh() as Value;
  }

  computed.remove = function (key: string) {
    storage.removeItem(key);
  };

  computed.clear = function () {
    storage.clear();
  };

  return computed;
}

type StreamItem = IItem & { key: string };

const stringify = fastJson({
  title: "StreamItemsSchema",
  type: "array",
  items: {
    anyOf: [
      {
        type: "object",
        properties: {
          key: {
            type: "string",
          },
          result: {},
          metas: {
            type: "array",
            items: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    path: {
                      type: "string",
                    },
                    type: {
                      type: "string",
                    },
                    hash: {
                      type: "number",
                    },
                    modifyTimeStamp: {
                      type: "number",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    ],
  },
});

export function createFsComputedWithStream(
  options: ICreateFsComputedOptions = {},
) {
  const { cachePath, beforeExit = false } = options;
  const itemsFile = normalizePath(
    normalizeCachePath(cachePath),
    "items.json",
  );

  let readed = false;
  let items: StreamItem[] = [];

  ensureFile(itemsFile, "[]")
    .then(() => {
      return readJsonFileWithStream<StreamItem[]>(itemsFile);
    })
    .then((_items) => {
      readed = true;
      items = _items;
    });

  async function computed<T extends AnyFunction>(
    paths: MayBeArray<string>,
    fn: T,
  ): Promise<UnPromiseReturnType<T>> {
    type Value = UnPromiseReturnType<T>;
    await untilCheckScope(() => readed);

    if (!isArray(paths)) {
      paths = [paths];
    }

    const key = hash([paths, fn]);

    const oldItem = items.find((item) => key === item.key);

    if (oldItem === undefined) {
      const { metas, loadExistsFileHashs } = await createMetas(paths);
      await loadExistsFileHashs();
      const result = await fn();

      items.push({
        key,
        metas,
        result,
      });

      if (!beforeExit) {
        await debouncedWriteJsonFile(itemsFile, stringify(items));
      }
      return result;
    }
    const { metas: oldMetas, result } = oldItem;

    const {
      metas: newMetas,
      loadExistsFileHashs,
      existsFileIndexs,
    } = await createMetas(paths);

    async function refresh() {
      const newResult = await fn();

      oldItem.metas = newMetas;
      oldItem.result = newResult;

      if (!beforeExit) {
        debouncedWriteJsonFile(itemsFile, stringify(items));
      }

      return newResult as Value;
    }

    // check mtime
    const changedMeta = newMetas.find((newMeta, index) => {
      const oldMeta = oldMetas[index];
      return (
        newMeta.modifyTimeStamp !== oldMeta.modifyTimeStamp
      );
    });

    if (!changedMeta) {
      return result as Value;
    }

    await loadExistsFileHashs();

    // if dir modifyTimeStamp changed
    if (changedMeta.type === "dir") {
      return (await refresh()) as Value;
    }

    // check hash
    const changed = existsFileIndexs.some((index) => {
      const oldMetaHash = oldMetas[index].hash;
      const newMetaHash = newMetas[index].hash;
      return oldMetaHash !== newMetaHash;
    });

    if (!changed) {
      return result as Value;
    }

    return (await refresh()) as Value;
  }

  if (beforeExit) {
    asyncExitHook(() => debouncedWriteJsonFile(itemsFile, stringify(items)), {
      minimumWait: BeforeExitMinimumWait,
    });
  }

  return computed;
}

export async function createMetas(paths: string[]) {
  const existsFileIndexs: number[] = [];

  const metas = (await parallel(
    paths.map(async (path, index) => {
      path = normalizePath(path);
      if (!(await exists(path))) {
        log.warn(`the ${path} does not exist`);
        return {
          path,
          hash: 0,
          type: "file",
          modifyTimeStamp: 0,
        };
      }
      const stat = await lstat(path);

      const modifyTimeStamp = await getFileModifyTimeStamp(
        path,
      );
      if (stat.isDirectory()) {
        return {
          path,
          hash: 0,
          type: "dir",
          modifyTimeStamp,
        };
      }

      existsFileIndexs.push(index);

      return {
        path,
        type: "file",
        modifyTimeStamp,
      };
    }),
  )) as IItem["metas"];

  function loadExistsFileHashs() {
    return parallel(
      existsFileIndexs.map(async (existsFileIndex) => {
        metas[existsFileIndex]["hash"] = murmurHash(
          await readFile(metas[existsFileIndex]["path"]),
        );
      }),
    );
  }

  return { metas, loadExistsFileHashs, existsFileIndexs };
}

export function createMetasSync(paths: string[]) {
  const existsFileIndexs: number[] = [];

  const metas = paths.map((path, index) => {
    path = normalizePath(path);
    if (!existsSync(path)) {
      log.warn(`the ${path} does not exist`);
      return {
        path,
        hash: 0,
        type: "file",
        modifyTimeStamp: 0,
      };
    }
    const stat = lstatSync(path);

    const modifyTimeStamp = getFileModifyTimeStampSync(path);
    if (stat.isDirectory()) {
      return {
        path,
        hash: 0,
        type: "dir",
        modifyTimeStamp,
      };
    }

    existsFileIndexs.push(index);

    return {
      path,
      type: "file",
      modifyTimeStamp,
    };
  }) as IItem["metas"];

  function loadExistsFileHashs() {
    existsFileIndexs.forEach(async (existsFileIndex) => {
      metas[existsFileIndex]["hash"] = murmurHash(
        readFileSync(metas[existsFileIndex]["path"]),
      );
    });
  }

  return { metas, loadExistsFileHashs, existsFileIndexs };
}

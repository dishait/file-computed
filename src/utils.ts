import mem from "mem";
import consola from "consola";
import type { AnyFunction } from "m-type-tools";
import { hash as _hash, murmurHash as _murmurHash } from "ohash";

export const hash = mem(_hash);

export const murmurHash = mem(_murmurHash);

export function untilCheck() {
  return new Promise((resolve) => setImmediate(resolve));
}

export async function untilCheckScope(fusing: AnyFunction) {
  while (true) {
    const exit = await fusing();
    if (exit) {
      return;
    }
    await untilCheck();
  }
}

export const log = consola.withTag("file-computed");

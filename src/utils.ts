import mem from 'mem'
import {
	hash as _hash,
	murmurHash as _murmurHash
} from 'ohash'
import type {
	AnyFunction,
	AsyncFunciton,
	UnPromiseReturnType
} from 'm-type-tools'

export const hash = mem(_hash)

export const murmurHash = mem(_murmurHash)

export function deepCopy<T>(origin: T) {
	return JSON.parse(JSON.stringify(origin)) as T
}

export const parallel: typeof Promise.all =
	Promise.all.bind(Promise)

export function diffModifyTimeStamps(
	newModifyTimeStamps: number[],
	oldModifyTimeStamps: number[]
) {
	const changedIndexs: number[] = []
	for (let i = 0; i < newModifyTimeStamps.length; i++) {
		const newModifyTimeStamp = newModifyTimeStamps[i]
		const oldModifyTimeStamp = oldModifyTimeStamps[i]
		if (newModifyTimeStamp !== oldModifyTimeStamp) {
			changedIndexs.push(i)
		}
	}

	return {
		changedIndexs,
		changed: changedIndexs.length > 0
	}
}

export function untilCheck() {
	return new Promise(resolve => setImmediate(resolve))
}

export async function untilCheckScope<
	T extends AnyFunction
>(
	fn: T,
	fusing: AnyFunction
): null | Promise<UnPromiseReturnType<T>> {
	while (true) {
		const result = await fn()
		if (result) {
			return result
		}
		const exit = await fusing()
		if (exit) {
			return null
		}
		await untilCheck()
	}
}

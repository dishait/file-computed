import mem from 'mem'
import {
	hash as _hash,
	murmurHash as _murmurHash
} from 'ohash'

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

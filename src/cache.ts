import { hash } from 'ohash'
import { readFile } from 'fs/promises'
import type { AnyFunction } from './type'
import { getFileModifyTimeStamp } from './fs'

export const createCacheInTimes = <T extends AnyFunction>(
	counter = 0,
	fn: T
) => {
	let result
	return ((...args) => {
		if (counter === 0 || result === undefined) {
			result = fn(...args)
			return result
		}
		counter--
		return result
	}) as T
}

export const cacheReadFileInTwice = createCacheInTimes(
	2,
	readFile
)

export const cacheGetFileModifyTimeStampInTwice =
	createCacheInTimes(2, getFileModifyTimeStamp)

export const cacheHashInTwice = createCacheInTimes(2, hash)

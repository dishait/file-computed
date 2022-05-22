import { hash } from 'ohash'
import { readFile } from 'fs/promises'
import type { AnyFunction } from './type'
import { getFileModifyTimeStamp } from './fs'

export const createCacheOnce = <T extends AnyFunction>(
	fn: T
) => {
	let counter = 1
	let result
	return ((...args) => {
		if (counter <= 0 || result === undefined) {
			result = fn(...args)
			counter = 1
			return result
		}
		counter--
		return result
	}) as T
}

export const cacheReadFileOnce = createCacheOnce(readFile)

export const cacheGetFileModifyTimeStampOnce =
	createCacheOnce(getFileModifyTimeStamp)

export const cacheHashOnce = createCacheOnce(hash)

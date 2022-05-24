import { hash } from 'ohash'
import { readFile } from 'fs/promises'
import { createCacheFn } from './cache'
import type { Storage } from 'unstorage'
import type { AnyFunction } from './type'
import { createFsStorage } from './storage'
import { getFileModifyTimeStamp } from './fs'

interface ICreateFsComputed {
	cachePath?: string
}

interface Item<T = any> {
	lastResult: T
	lastFilehash: string
	lastModifyTime: number
}

export function createFsComputed(
	options: ICreateFsComputed = {}
) {
	const { cachePath } = options
	const storage = createFsStorage(cachePath)

	async function fsComputed<T extends AnyFunction>(
		filePath: string,
		fn: T
	) {
		const effects = createCacheEffects(filePath)

		const fnhash = hash(fn)
		const key = filePath + '/' + fnhash

		// 是否无变化
		const isNotChanged = await notChanged({
			key,
			storage,
			effects
		})

		// 无变化时返回上一次的结果
		if (isNotChanged) {
			const lastResult = (await storage.getItem(
				key
			)) as Item<ReturnType<T>>
			return lastResult.lastResult
		}

		// 文件更新的时间戳
		const modifyTime = effects.getFileModifyTimeStamp()
		// 目标文件 hash
		const fileHash = await effects.hashFile()
		// 计算结果
		const result = (await fn()) as ReturnType<T>

		await storage.setItem(key, {
			lastResult: result,
			lastFilehash: fileHash,
			lastModifyTime: modifyTime
		})

		return result
	}

	fsComputed.clear = async () => await storage.clear()

	fsComputed.remove = async (
		filePath: string,
		fn: Function
	) => await storage.removeItem(filePath + '/' + hash(fn))

	return fsComputed
}

interface INotChangedOptions {
	key: string
	storage: Storage
	effects: ReturnType<typeof createCacheEffects>
}

export const notChanged = async (
	options: INotChangedOptions
) => {
	const { key, storage, effects } = options

	const item = (await storage.getItem(key)) as Item

	if (!item) {
		return false
	}

	const { lastModifyTime, lastFilehash } = item

	// 检查更新时间是否有变
	const nowModifyTime = effects.getFileModifyTimeStamp()
	if (nowModifyTime != lastModifyTime) {
		// 如果更新时间变了，再检查目标文件是不是真的变了
		const nowFilehash = await effects.hashFile()
		console.log(typeof item)

		console.log('nowFilehash', nowFilehash)
		console.log('lastFilehash', lastFilehash)
		if (nowFilehash != lastFilehash) {
			return false
		}
	}
	return true
}

export const createCacheEffects = (filePath: string) => {
	const readFileEffect = createCacheFn(() => {
		return readFile(filePath)
	})
	return {
		readFile: readFileEffect,
		hashFile: createCacheFn(async () => {
			const file = await readFileEffect()
			return hash(file)
		}),
		getFileModifyTimeStamp: createCacheFn(() => {
			return getFileModifyTimeStamp(filePath)
		})
	}
}

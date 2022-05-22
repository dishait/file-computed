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

export function createFsComputed(
	options: ICreateFsComputed = {}
) {
	const { cachePath } = options
	const storage = createFsStorage(cachePath)
	return async <T extends AnyFunction>(
		filePath: string,
		fn: T
	) => {
		const keys = createKeys(filePath)
		const effects = createCacheEffects(filePath, fn)

		// 是否无变化
		const isNotChanged = await notChanged({
			keys,
			storage,
			effects
		})

		// 无变化时返回上一次的结果
		if (isNotChanged) {
			const lastResult = await storage.getItem(keys.result)
			return lastResult as ReturnType<T>
		}

		// 设置计算函数的 hash
		await storage.setItem(keys.fnhash, effects.hashFn())

		// 设置文件更新的时间戳
		await storage.setItem(
			keys.mtime,
			effects.getFileModifyTimeStamp()
		)

		// 设置目标文件的 hash
		const fileHash = await effects.hashFile()
		await storage.setItem(keys.filehash, fileHash)

		// 计算结果
		const nowResult = fn() as ReturnType<T>

		await storage.setItem(keys.result, nowResult)

		return nowResult
	}
}

interface INotChangedOptions {
	storage: Storage
	keys: ReturnType<typeof createKeys>
	effects: ReturnType<typeof createCacheEffects>
}

export const notChanged = async (
	options: INotChangedOptions
) => {
	const { keys, storage, effects } = options
	// 检查计算函数是否有变
	const lastFnhash = await storage.getItem(keys.fnhash)
	const nowFnhash = effects.hashFn()
	if (nowFnhash !== lastFnhash) {
		return false
	}

	// 检查更新时间是否有变
	const lastModifyTime = await storage.getItem(keys.mtime)
	const nowModifyTime = effects.getFileModifyTimeStamp()
	if (nowModifyTime !== lastModifyTime) {
		// 如果更新时间变了，再检查目标文件是不是真的变了
		const lastFilehash = await storage.getItem(
			keys.filehash
		)
		const nowFilehash = await effects.hashFile()
		if (nowFilehash !== lastFilehash) {
			return false
		}
	}
	return true
}

export const createKeys = (filePath: string) => {
	return {
		mtime: filePath + ':mtime',
		fnhash: filePath + ':fnhash',
		result: filePath + ':result',
		filehash: filePath + ':filehash'
	}
}

export const createCacheEffects = <T extends AnyFunction>(
	filePath: string,
	fn: T
) => {
	const readFileEffect = createCacheFn(() => {
		return readFile(filePath)
	})

	const effects = {
		readFile: readFileEffect,
		hashFn: createCacheFn(() => {
			return hash(fn)
		}),
		hashFile: createCacheFn(async () => {
			const file = await readFileEffect()
			return hash(file)
		}),
		getFileModifyTimeStamp: createCacheFn(() => {
			return getFileModifyTimeStamp(filePath)
		})
	}

	return effects
}

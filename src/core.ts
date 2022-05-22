import { hash } from 'ohash'
import type { Storage } from 'unstorage'
import { createFsStorage } from './storage'
import type {
	AnyFunction,
	PromisedReturnType
} from './type'
import {
	cacheHashInTwice,
	cacheReadFileInTwice,
	cacheGetFileModifyTimeStampInTwice
} from './cache'

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
	): PromisedReturnType<T> => {
		const keys = {
			mtime: filePath + ':mtime',
			fnhash: filePath + ':fnhash',
			result: filePath + ':result',
			filehash: filePath + ':filehash'
		}

		// 是否无变化
		const isNotChanged = await notChanged({
			fn,
			keys,
			storage,
			filePath
		})

		// 无变化时返回上一次的结果
		if (isNotChanged) {
			const lastResult = await storage.getItem(keys.result)
			return lastResult as ReturnType<T>
		}

		// 设置计算函数的 hash
		await storage.setItem(keys.fnhash, cacheHashInTwice(fn))

		// 设置文件更新的时间戳
		await storage.setItem(
			keys.mtime,
			cacheGetFileModifyTimeStampInTwice(filePath)
		)

		// 设置目标文件的 hash
		await storage.setItem(
			keys.filehash,
			cacheHashInTwice(cacheReadFileInTwice(filePath))
		)

		// 计算结果
		const nowResult = fn() as ReturnType<T>

		await storage.setItem(keys.result, nowResult)

		return nowResult
	}
}

interface INotChangedOptions {
	fn: Function
	filePath: string
	storage: Storage
	keys: {
		mtime: string
		fnhash: string
		filehash: string
	}
}

export const notChanged = async (
	options: INotChangedOptions
) => {
	const { keys, storage, filePath, fn } = options
	// 检查计算函数是否有变
	const lastFnhash = await storage.getItem(keys.fnhash)
	const nowFnhash = cacheHashInTwice(fn)
	if (nowFnhash !== lastFnhash) {
		return false
	}

	// 检查更新时间是否有变
	const lastModifyTime = await storage.getItem(keys.mtime)
	const nowModifyTime =
		cacheGetFileModifyTimeStampInTwice(filePath).toString()
	if (nowModifyTime !== lastModifyTime) {
		// 如果更新时间变了，再检查目标文件是不是真的变了
		const lastFilehash = await storage.getItem(
			keys.filehash
		)
		const fileBuffer = await cacheReadFileInTwice(filePath)
		const nowFilehash = hash(fileBuffer.toString())
		if (nowFilehash !== lastFilehash) {
			return false
		}
	}

	return true
}

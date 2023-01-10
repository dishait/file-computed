import { isEqual } from 'ohash'
import { isArray } from 'm-type-tools'
import { lstat, readFile } from 'fs/promises'
import { hash, parallel, murmurHash } from './utils'
import { existsSync, lstatSync, readFileSync } from 'fs'
import type { AnyFunction, MayBeArray } from 'm-type-tools'
import {
	createFsStorage,
	createFsStorageSync
} from './storage'
import {
	getFileModifyTimeStamp,
	getFileModifyTimeStampSync
} from './fs'

interface ICreateFsComputedOptions {
	cachePath?: string
}

interface IFileMeta {
	type: 'file'
	hash: number
	modifyTimeStamp: number
}

interface IDirMeta {
	type: 'dir'
	modifyTimeStamp: number
}

interface IItem {
	metas: Array<IFileMeta | IDirMeta>
	fns: Array<{
		result: any
		hash: string
	}>
}

export function createFsComputed(
	options: ICreateFsComputedOptions = {}
) {
	const { cachePath } = options
	const storage = createFsStorage(cachePath)

	async function computed<T extends AnyFunction>(
		paths: MayBeArray<string>,
		fn: T
	): Promise<ReturnType<T>> {
		type Value = ReturnType<T>

		if (!isArray(paths)) {
			paths = [paths]
		}

		const key = hash(paths)
		const oldItem = (await storage.getItem(key)) as IItem

		if (!oldItem) {
			const metas = await createMetas(paths)
			const newFn = {
				hash: hash(fn),
				result: (await fn()) as Value
			}
			await storage.setItem(key, {
				metas,
				fns: [newFn]
			})

			return newFn.result
		}

		const { metas: oldMetas, fns: oldFns } = oldItem

		const newFnHash = hash(fn)

		const oldFn = oldFns.find(oldFn => {
			return isEqual(oldFn.hash, newFnHash)
		})
		if (!oldFn) {
			const newResult = await fn()
			oldFns.push({
				hash: newFnHash,
				result: newResult
			})

			await storage.setItem(key, {
				...oldItem,
				fns: oldFns
			} as IItem)
			return newResult as Value
		}

		const newMetas = await createMetas(paths)

		if (isEqual(oldMetas, newMetas)) {
			return oldFn.result as Value
		}

		const newResult = await fn()
		oldFn.result = newResult
		await storage.setItem(key, {
			fns: oldFns,
			metas: newMetas
		} as IItem)

		return newResult as Value
	}

	computed.remove = async function (key: string) {
		await storage.removeItem(key)
	}

	computed.clear = async function () {
		await storage.clear()
	}

	return computed
}

export function createFsComputedSync(
	options: ICreateFsComputedOptions = {}
) {
	const { cachePath } = options
	const storage = createFsStorageSync(cachePath)

	function computed<T extends AnyFunction>(
		paths: MayBeArray<string>,
		fn: T
	): ReturnType<T> {
		type Value = ReturnType<T>

		if (!isArray(paths)) {
			paths = [paths]
		}

		const key = hash(paths)
		const oldItem = storage.getItem(key) as IItem

		if (!oldItem) {
			const metas = createMetasSync(paths)
			const newFn = {
				hash: hash(fn),
				result: fn() as Value
			}
			storage.setItem(key, {
				metas,
				fns: [newFn]
			})

			return newFn.result
		}

		const { metas: oldMetas, fns: oldFns } = oldItem

		const newFnHash = hash(fn)
		const oldFn = oldFns.find(oldFn => {
			return isEqual(oldFn.hash, newFnHash)
		})
		if (!oldFn) {
			const newResult = fn()
			oldFns.push({
				hash: newFnHash,
				result: newResult
			})

			storage.setItem(key, {
				...oldItem,
				fns: oldFns
			} as IItem)
			return newResult as Value
		}

		const newMetas = createMetasSync(paths)
		if (isEqual(oldMetas, newMetas)) {
			return oldFn.result as Value
		}
		const newResult = fn()
		oldFn.result = newResult
		storage.setItem(key, {
			fns: oldFns,
			metas: newMetas
		} as IItem)

		return newResult as Value
	}

	computed.remove = function (key: string) {
		storage.removeItem(key)
	}

	computed.clear = function () {
		storage.clear()
	}

	return computed
}

async function createMetas(paths: string[]) {
	return parallel(
		paths.map(async path => {
			if (!existsSync(path)) {
				return {
					hash: 0,
					type: 'file',
					modifyTimeStamp: 0
				}
			}
			const stat = await lstat(path)

			const modifyTimeStamp = await getFileModifyTimeStamp(
				path
			)
			if (stat.isDirectory()) {
				return {
					type: 'dir',
					modifyTimeStamp
				}
			}

			return {
				type: 'file',
				modifyTimeStamp,
				hash: murmurHash(await readFile(path))
			}
		})
	)
}

function createMetasSync(paths: string[]) {
	return paths.map(path => {
		if (!existsSync(path)) {
			return {
				hash: 0,
				type: 'file',
				modifyTimeStamp: 0
			}
		}
		const stat = lstatSync(path)

		const modifyTimeStamp = getFileModifyTimeStampSync(path)
		if (stat.isDirectory()) {
			return {
				type: 'dir',
				modifyTimeStamp
			}
		}

		return {
			type: 'file',
			modifyTimeStamp,
			hash: murmurHash(readFileSync(path))
		}
	})
}

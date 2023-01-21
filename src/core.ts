import { isEqual } from 'ohash'
import { isArray } from 'm-type-tools'
import { normalizePath } from './path'
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

interface IItem {
	metas: Array<{
		path: string
		hash: number
		type: 'file' | 'dir'
		modifyTimeStamp: number
	}>
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
			const { metas: nweMetas, loadExistsFileHashs } =
				await createMetas(paths)
			await loadExistsFileHashs()
			const newFn = {
				hash: hash(fn),
				result: (await fn()) as Value
			}
			await storage.setItem(key, {
				fns: [newFn],
				metas: nweMetas
			})

			return newFn.result
		}

		const { metas: oldMetas, fns: oldFns = [] } = oldItem

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

		const {
			metas: newMetas,
			loadExistsFileHashs,
			existsFileIndexs
		} = await createMetas(paths)

		const mayBeChanged = newMetas.some((newMeta, index) => {
			const oldMeta = oldMetas[index]
			return (
				newMeta.modifyTimeStamp !== oldMeta.modifyTimeStamp
			)
		})

		if (!mayBeChanged) {
			return oldFn.result as Value
		}

		await loadExistsFileHashs()

		const changed = existsFileIndexs.some(index => {
			const oldMetaHash = oldMetas[index].hash
			const newMetaHash = newMetas[index].hash
			return oldMetaHash !== newMetaHash
		})

		if (!changed) {
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
			const { metas: nweMetas, loadExistsFileHashs } =
				createMetasSync(paths)

			loadExistsFileHashs()
			const newFn = {
				hash: hash(fn),
				result: fn() as Value
			}

			storage.setItem(key, {
				fns: [newFn],
				metas: nweMetas
			})

			return newFn.result
		}

		const { metas: oldMetas, fns: oldFns = [] } = oldItem

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

		const {
			metas: newMetas,
			existsFileIndexs,
			loadExistsFileHashs
		} = createMetasSync(paths)

		const mayBeChanged = newMetas.some((newMeta, index) => {
			const oldMeta = oldMetas[index]
			return (
				newMeta.modifyTimeStamp !== oldMeta.modifyTimeStamp
			)
		})

		if (!mayBeChanged) {
			return oldFn.result as Value
		}

		loadExistsFileHashs()

		const changed = existsFileIndexs.some(index => {
			const oldMetaHash = oldMetas[index].hash
			const newMetaHash = newMetas[index].hash
			return oldMetaHash !== newMetaHash
		})

		if (!changed) {
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

export async function createMetas(paths: string[]) {
	const existsFileIndexs: number[] = []

	const metas = await parallel(
		paths.map(async (path, index) => {
			path = normalizePath(path)
			if (!existsSync(path)) {
				return {
					path,
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
					path,
					hash: 0,
					type: 'dir',
					modifyTimeStamp
				}
			}

			existsFileIndexs.push(index)

			return {
				path,
				type: 'file',
				modifyTimeStamp
			}
		})
	)

	function loadExistsFileHashs() {
		return parallel(
			existsFileIndexs.map(async existsFileIndex => {
				metas[existsFileIndex]['hash'] = murmurHash(
					await readFile(metas[existsFileIndex]['path'])
				)
			})
		)
	}

	return { metas, loadExistsFileHashs, existsFileIndexs }
}

export function createMetasSync(paths: string[]) {
	const existsFileIndexs: number[] = []

	const metas = paths.map((path, index) => {
		path = normalizePath(path)
		if (!existsSync(path)) {
			return {
				path,
				hash: 0,
				type: 'file',
				modifyTimeStamp: 0
			}
		}
		const stat = lstatSync(path)

		const modifyTimeStamp = getFileModifyTimeStampSync(path)
		if (stat.isDirectory()) {
			return {
				path,
				hash: 0,
				type: 'dir',
				modifyTimeStamp
			}
		}

		existsFileIndexs.push(index)

		return {
			path,
			type: 'file',
			modifyTimeStamp
		}
	})

	function loadExistsFileHashs() {
		existsFileIndexs.forEach(async existsFileIndex => {
			metas[existsFileIndex]['hash'] = murmurHash(
				readFileSync(metas[existsFileIndex]['path'])
			)
		})
	}

	return { metas, loadExistsFileHashs, existsFileIndexs }
}

import { isArray, UnPromiseReturnType } from 'm-type-tools'
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
	result: any
	metas: Array<{
		path: string
		hash: number
		type: 'file' | 'dir'
		modifyTimeStamp: number
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
	): Promise<UnPromiseReturnType<T>> {
		type Value = UnPromiseReturnType<T>

		if (!isArray(paths)) {
			paths = [paths]
		}

		const key = hash([paths, fn])
		const oldItem = (await storage.getItem(key)) as IItem

		if (!oldItem) {
			const { metas, loadExistsFileHashs } =
				await createMetas(paths)
			await loadExistsFileHashs()
			const result = await fn()
			await storage.setItem(key, { result, metas })
			return result
		}

		const { metas: oldMetas, result } = oldItem

		const {
			metas: newMetas,
			loadExistsFileHashs,
			existsFileIndexs
		} = await createMetas(paths)

		async function refresh() {
			const newResult = await fn()
			await storage.setItem(key, {
				result: newResult,
				metas: newMetas
			} as IItem)

			return newResult as Value
		}

		// check mtime
		const changedMeta = newMetas.find((newMeta, index) => {
			const oldMeta = oldMetas[index]
			return (
				newMeta.modifyTimeStamp !== oldMeta.modifyTimeStamp
			)
		})

		if (!changedMeta) {
			return result as Value
		}

		await loadExistsFileHashs()

		// if dir modifyTimeStamp changed
		if (changedMeta.type === 'dir') {
			return (await refresh()) as Value
		}

		// check hash
		const changed = existsFileIndexs.some(index => {
			const oldMetaHash = oldMetas[index].hash
			const newMetaHash = newMetas[index].hash
			return oldMetaHash !== newMetaHash
		})

		if (!changed) {
			return result as Value
		}

		return (await refresh()) as Value
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
			const { metas, loadExistsFileHashs } =
				createMetasSync(paths)

			loadExistsFileHashs()

			const result = fn()
			storage.setItem(key, {
				result,
				metas
			})

			return result as Value
		}

		const { metas: oldMetas, result } = oldItem

		const {
			metas: newMetas,
			existsFileIndexs,
			loadExistsFileHashs
		} = createMetasSync(paths)

		function refresh() {
			const newResult = fn()
			storage.setItem(key, {
				result: newResult,
				metas: newMetas
			} as IItem)

			return newResult as Value
		}

		const changedMeta = newMetas.find((newMeta, index) => {
			const oldMeta = oldMetas[index]
			return (
				newMeta.modifyTimeStamp !== oldMeta.modifyTimeStamp
			)
		})

		if (!changedMeta) {
			return result as Value
		}

		loadExistsFileHashs()

		// if dir modifyTimeStamp changed
		if (changedMeta.type === 'dir') {
			return refresh() as Value
		}

		const changed = existsFileIndexs.some(index => {
			const oldMetaHash = oldMetas[index].hash
			const newMetaHash = newMetas[index].hash
			return oldMetaHash !== newMetaHash
		})

		if (!changed) {
			return result as Value
		}

		return refresh() as Value
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

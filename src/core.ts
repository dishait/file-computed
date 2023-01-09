import mem from 'mem'
import { isEqual } from 'ohash'
import { readFileSync } from 'fs'
import { isArray } from 'm-type-tools'
import type { MayBeArray, AnyFunction } from 'm-type-tools'
import {
	createFsStorage,
	createFsStorageSync
} from './storage'
import {
	readFile,
	getFileModifyTimeStamp,
	getFileModifyTimeStampSync
} from './fs'
import {
	hash,
	parallel,
	deepCopy,
	murmurHash,
	diffModifyTimeStamps
} from './utils'

interface ICreateFsComputedOptions {
	cachePath?: string
}

interface IItem<R> {
	result: R
	fnHash: string
	fileHashs: number[]
	modifyTimeStamps: number[]
}

export function createFsComputed(
	options: ICreateFsComputedOptions = {}
) {
	const { cachePath } = options
	const storage = createFsStorage(cachePath)

	async function computed<
		T extends AnyFunction,
		I extends IItem<ReturnType<T>>
	>(paths: MayBeArray<string>, fn: T) {
		if (!isArray(paths)) {
			paths = [paths]
		}

		const createFnHash = mem(() => hash(fn))

		const createFileHashs = mem(
			async (changedIndexs: number[] = []) => {
				// first time refresh
				if (changedIndexs.length === 0) {
					const contents = await parallel(
						(paths as string[]).map(path => readFile(path))
					)

					return contents.map(content =>
						murmurHash(content)
					)
				}

				const newFileHashs = deepCopy(oldFileHashs)

				await parallel(
					changedIndexs.map(async i => {
						newFileHashs[i] = murmurHash(
							await readFile(paths[i])
						)
					})
				)

				return newFileHashs
			}
		)

		const createModifyTimeStamps = mem(async function () {
			const modifyTimeStamps = await parallel(
				(paths as string[]).map(path =>
					getFileModifyTimeStamp(path)
				)
			)
			return modifyTimeStamps
		})

		const createResult = mem(fn)

		const key = hash(paths)
		const oldItem = (await storage.getItem(key)) as I

		async function refresh() {
			const result = await createResult()
			await storage.setItem(key, {
				result,
				fnHash: createFnHash(),
				fileHashs: await createFileHashs(),
				modifyTimeStamps: await createModifyTimeStamps()
			} as I)
			return result
		}

		if (!oldItem) {
			return refresh()
		}

		const {
			fnHash: oldFnHash,
			result: oldResult,
			fileHashs: oldFileHashs,
			modifyTimeStamps: oldModifyTimeStamps
		} = oldItem

		const newFnHash = createFnHash()
		// check fn
		if (!isEqual(newFnHash, oldFnHash)) {
			return refresh()
		}

		const newModifyTimeStamps =
			await createModifyTimeStamps()

		const { changed: mayBeChanged, changedIndexs } =
			diffModifyTimeStamps(
				newModifyTimeStamps,
				oldModifyTimeStamps
			)
		// check modifyTimeStamps
		if (!mayBeChanged) {
			return oldResult
		}

		const newFileHashs = await createFileHashs(
			changedIndexs
		)
		// check hash
		if (isEqual(newFileHashs, oldFileHashs)) {
			return oldResult
		}

		return refresh()
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

	function computedSync<
		T extends AnyFunction,
		I extends IItem<ReturnType<T>>
	>(paths: MayBeArray<string>, fn: T) {
		if (!isArray(paths)) {
			paths = [paths]
		}

		const createFnHash = mem(() => hash(fn))

		const createFileHashs = mem(
			(changedIndexs: number[] = []) => {
				// first time refresh
				if (changedIndexs.length === 0) {
					const contents = (paths as string[]).map(path =>
						readFileSync(path)
					)
					return contents.map(content =>
						murmurHash(content)
					)
				}

				const newFileHashs = deepCopy(oldFileHashs)

				changedIndexs.forEach(i => {
					newFileHashs[i] = murmurHash(
						readFileSync(paths[i])
					)
				})

				return newFileHashs
			}
		)

		const createModifyTimeStamps = mem(function () {
			const modifyTimeStamps = (paths as string[]).map(
				path => getFileModifyTimeStampSync(path)
			)
			return modifyTimeStamps
		})

		const createResult = mem(fn)

		const key = hash(paths)
		const oldItem = storage.getItem(key) as I

		const {
			fnHash: oldFnHash,
			result: oldResult,
			fileHashs: oldFileHashs,
			modifyTimeStamps: oldModifyTimeStamps
		} = oldItem

		function refresh() {
			const result = createResult()
			storage.setItem(key, {
				result,
				fnHash: createFnHash(),
				fileHashs: createFileHashs(),
				modifyTimeStamps: createModifyTimeStamps()
			} as I)
			return result
		}

		if (!oldItem) {
			return refresh()
		}

		const newFnHash = createFnHash()
		// check fn
		if (!isEqual(newFnHash, oldFnHash)) {
			return refresh()
		}

		const newModifyTimeStamps = createModifyTimeStamps()
		const { changed: mayBeChanged, changedIndexs } =
			diffModifyTimeStamps(
				newModifyTimeStamps,
				oldModifyTimeStamps
			)
		// check modifyTimeStamps
		if (!mayBeChanged) {
			return oldResult
		}

		const newFileHashs = createFileHashs(changedIndexs)
		// check hash
		if (isEqual(newFileHashs, oldFileHashs)) {
			return oldResult
		}

		return refresh()
	}

	computedSync.remove = function (key: string) {
		storage.removeItem(key)
	}

	computedSync.clear = function () {
		storage.clear()
	}

	return computedSync
}

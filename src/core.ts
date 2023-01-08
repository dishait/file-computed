import mem from 'mem'
import { readFileSync } from 'fs'
import { isArray } from 'm-type-tools'
import {
	isEqual,
	hash as _hash,
	murmurHash as _murmurHash
} from 'ohash'
import {
	readFile,
	getFileModifyTimeStamp,
	getFileModifyTimeStampSync
} from './fs'
import type { MayBeArray, AnyFunction } from 'm-type-tools'
import {
	createFsStorage,
	createFsStorageSync
} from './storage'

const hash = mem(_hash)

const murmurHash = mem(_murmurHash)

function deepCopy<T>(origin: T) {
	return JSON.parse(JSON.stringify(origin)) as T
}

const parallel: typeof Promise.all =
	Promise.all.bind(Promise)

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

	async function computed<T extends AnyFunction>(
		paths: MayBeArray<string>,
		fn: T
	) {
		type Item = IItem<ReturnType<T>>

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

				const oldFileHashs = deepCopy(item.fileHashs)

				await parallel(
					changedIndexs.map(async i => {
						oldFileHashs[i] = murmurHash(
							await readFile(paths[i])
						)
					})
				)

				return oldFileHashs
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
		const item = (await storage.getItem(key)) as Item

		async function refresh() {
			const result = await createResult()
			await storage.setItem(key, {
				result,
				fnHash: createFnHash(),
				fileHashs: await createFileHashs(),
				modifyTimeStamps: await createModifyTimeStamps()
			} as Item)
			return result
		}

		if (!item) {
			return refresh()
		}

		const fnHash = createFnHash()
		// check fn
		if (!isEqual(fnHash, item.fnHash)) {
			return refresh()
		}

		const newModifyTimeStamps =
			await createModifyTimeStamps()

		const { changed: mayBeChanged, changedIndexs } =
			diffModifyTimeStamps(
				newModifyTimeStamps,
				item.modifyTimeStamps
			)
		// check modifyTimeStamps
		if (!mayBeChanged) {
			return item.result
		}

		const newFileHashs = await createFileHashs(
			changedIndexs
		)
		// check hash
		if (isEqual(newFileHashs, item.fileHashs)) {
			return item.result
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

	function computedSync<T extends AnyFunction>(
		paths: MayBeArray<string>,
		fn: T
	) {
		type Item = IItem<ReturnType<T>>

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

				const oldFileHashs = deepCopy(item.fileHashs)

				changedIndexs.forEach(i => {
					oldFileHashs[i] = murmurHash(
						readFileSync(paths[i])
					)
				})

				return oldFileHashs
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
		const item = storage.getItem(key) as Item

		function refresh() {
			const result = createResult()
			storage.setItem(key, {
				result,
				fnHash: createFnHash(),
				fileHashs: createFileHashs(),
				modifyTimeStamps: createModifyTimeStamps()
			} as Item)
			return result
		}

		if (!item) {
			return refresh()
		}

		const fnHash = createFnHash()
		// check fn
		if (!isEqual(fnHash, item.fnHash)) {
			return refresh()
		}

		const newModifyTimeStamps = createModifyTimeStamps()
		const { changed: mayBeChanged, changedIndexs } =
			diffModifyTimeStamps(
				newModifyTimeStamps,
				item.modifyTimeStamps
			)
		// check modifyTimeStamps
		if (!mayBeChanged) {
			return item.result
		}

		const newFileHashs = createFileHashs(changedIndexs)
		// check hash
		if (isEqual(newFileHashs, item.fileHashs)) {
			return item.result
		}

		return refresh()
	}

	computedSync.remove = async function (key: string) {
		storage.removeItem(key)
	}

	computedSync.clear = async function () {
		storage.clear()
	}

	return computedSync
}

function diffModifyTimeStamps(
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

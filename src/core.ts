import mem from 'mem'
import { isArray } from 'm-type-tools'
import { isEqual, hash as _hash } from 'ohash'
import {
	getFileModifyTimeStamp,
	getFileModifyTimeStampSync,
	readFile
} from './fs'
import type { MayBeArray, AnyFunction } from 'm-type-tools'
import {
	createFsStorage,
	createFsStorageSync
} from './storage'
import { readFileSync } from 'fs'

const hash = mem(_hash)

const parallel = Promise.all.bind(Promise)

interface ICreateFsComputedOptions {
	cachePath?: string
}

interface IItem<R> {
	result: R
	hash: string
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

		const createHash = mem(async function () {
			const contents = await parallel(
				(paths as string[]).map(path => readFile(path))
			)
			return hash(contents)
		})

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
				hash: await createHash(),
				modifyTimeStamps: await createModifyTimeStamps()
			} as Item)
			return result
		}

		if (!item) {
			return refresh()
		}

		const modifyTimeStamps = await createModifyTimeStamps()
		// check modifyTimeStamps
		if (isEqual(modifyTimeStamps, item.modifyTimeStamps)) {
			return item.result
		}

		const nowHash = await createHash()
		// check hash
		if (isEqual(nowHash, item.hash)) {
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

		const createHash = mem(function () {
			const contents = (paths as string[]).map(path =>
				readFileSync(path)
			)
			return hash(contents)
		})

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
				hash: createHash(),
				modifyTimeStamps: createModifyTimeStamps()
			} as Item)
			return result
		}

		if (!item) {
			return refresh()
		}

		const modifyTimeStamps = createModifyTimeStamps()
		// check modifyTimeStamps
		if (isEqual(modifyTimeStamps, item.modifyTimeStamps)) {
			return item.result
		}

		const nowHash = createHash()
		// check hash
		if (isEqual(nowHash, item.hash)) {
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

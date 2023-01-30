import { describe, it, expect } from 'vitest'
import {
	normalizePath,
	createFsStorage,
	createFsComputed,
	createFsStorageSync,
	createFsComputedSync,
	createFsComputedWithStream
} from '../src'

describe('createFsComputed', () => {
	const fsStorage = createFsStorage()
	const syncCachePath = normalizePath(
		'node_modules',
		'.cache/.file-computed-sync'
	)
	const fsStorageSync = createFsStorageSync(syncCachePath)

	it('basic', async () => {
		const fsComputed = createFsComputed()

		const fn = async () => {
			let n =
				((await fsStorage.getItem('n1')) as number) || 0
			n++
			await fsStorage.setItem('n1', n)
			return n
		}

		const result = await fsComputed(
			'test/fixture/foo.txt',
			fn
		)

		expect(result).toMatchInlineSnapshot('1')
	})

	it('multiple', async () => {
		const fsComputed = createFsComputed()

		const fn = async () => {
			let n2 =
				((await fsStorage.getItem('n2')) as number) || 0
			n2++
			await fsStorage.setItem('n2', n2)
			return n2
		}

		const result = await fsComputed(
			['test/fixture/foo.txt', 'test/fixture/bar.txt'],
			fn
		)

		expect(result).toMatchInlineSnapshot('1')
	})

	it('sync', async () => {
		const fsComputedSync = createFsComputedSync({
			cachePath: syncCachePath
		})

		const fn = () => {
			let n = (fsStorageSync.getItem('n3') as number) || 0
			n++
			fsStorageSync.setItem('n3', n)

			return n
		}

		const result = fsComputedSync(
			['test/fixture/foo.txt', 'test/fixture/bar.txt'],
			fn
		)

		expect(result).toMatchInlineSnapshot('1')
	})

	it('dir', async () => {
		const fsComputed = createFsComputed()

		const fn = async () => {
			let n =
				((await fsStorage.getItem('n4')) as number) || 0
			n++
			await fsStorage.setItem('n4', n)
			return n
		}

		const result = await fsComputed(['test/fixture'], fn)

		expect(result).toMatchInlineSnapshot('1')
	})

	it('stream', async () => {
		const fsComputed = createFsComputedWithStream()

		const fn = async () => {
			let n =
				((await fsStorage.getItem('n5')) as number) || 0
			n++
			await fsStorage.setItem('n5', n)
			return n
		}

		const result = await fsComputed(
			['test/fixture/bar.txt'],
			fn
		)

		expect(result).toMatchInlineSnapshot('1')
	})
})

import { describe, it, expect } from 'vitest'
import {
	normalizePath,
	createFsStorage,
	createFsComputed,
	createFsStorageSync,
	createFsComputedSync
} from '../src'

describe('createFsComputed', () => {
	const fsStorage = createFsStorage()
	const syncCachePath = normalizePath(
		'node_modules',
		'.file-computed-sync'
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

		const result = await fsComputed('examples/foo.txt', fn)

		expect(result).toMatchInlineSnapshot('2')
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
			['examples/foo.txt', 'examples/bar.txt'],
			fn
		)

		expect(result).toMatchInlineSnapshot('3')
	})

	it('sync', async () => {
		const fsComputedSync = createFsComputedSync({
			cachePath: syncCachePath
		})

		const fn = () => {
			let n = (fsStorageSync.getItem('n3') as number) || 0
			console.log('n', n)
			n++
			fsStorageSync.setItem('n3', n)
			return n
		}

		const result = fsComputedSync(
			['examples/foo.txt', 'examples/bar.txt'],
			fn
		)

		expect(result).toMatchInlineSnapshot('2')
	})
})

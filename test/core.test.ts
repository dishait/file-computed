import { describe, it, expect } from 'vitest'
import { createFsComputed, createFsStorage } from '../src'

describe('createFsComputed', () => {
	const fsStorage = createFsStorage()

	it('basic', async () => {
		const fsComputed = createFsComputed()
		const fn = async () => {
			let n =
				((await fsStorage.getItem('n')) as number) || 0
			n++
			await fsStorage.setItem('n', n)
			return n
		}

		const result = await fsComputed('examples/test.txt', fn)

		expect(result).toMatchInlineSnapshot('2')
	})
})

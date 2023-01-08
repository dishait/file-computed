import { describe, it, expect } from 'vitest'
import { createFsComputed, createFsStorage } from '../src'

describe('createFsComputed', () => {
	const fsStorage = createFsStorage()

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

		expect(result).toMatchInlineSnapshot('1')
	})

	it('multiple', async () => {
		const fsComputed = createFsComputed()

		const fn = async () => {
			let n =
				((await fsStorage.getItem('n2')) as number) || 0
			n++
			await fsStorage.setItem('n2', n)
			return n
		}

		const result = await fsComputed(
			['examples/foo.txt', 'examples/bar.txt'],
			fn
		)

		expect(result).toMatchInlineSnapshot('2')
	})
})

import { describe, expect, it } from 'vitest'
import { createFsStorage } from '../src/storage'

describe('storage', () => {
	it('basic', async () => {
		const fsStorage = createFsStorage()
		await fsStorage.setItem('foo', 'foo')
		const result = await fsStorage.getItem('foo')
		expect(result).toMatchInlineSnapshot('"foo"')
	})

	it('change cache path', async () => {
		const fsStorage = createFsStorage('temp')
		await fsStorage.setItem('bar', 'bar')
		const result = await fsStorage.getItem('bar')
		expect(result).toMatchInlineSnapshot('"bar"')
	})
})

import { createCacheOnce } from '../src'
import { describe, expect, it } from 'vitest'

describe('cache', () => {
	it('createCacheOnce', async () => {
		let counter = 0
		const cacheInc = createCacheOnce(() => ++counter)

		expect(cacheInc()).toMatchInlineSnapshot('1')
		expect(cacheInc()).toMatchInlineSnapshot('1')
		expect(cacheInc()).toMatchInlineSnapshot('2')
		expect(cacheInc()).toMatchInlineSnapshot('2')
		expect(cacheInc()).toMatchInlineSnapshot('3')
		expect(cacheInc()).toMatchInlineSnapshot('3')
	})
})

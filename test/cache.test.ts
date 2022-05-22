import { createCacheFn } from '../src'
import { describe, it, expect } from 'vitest'

describe('cache', () => {
	it('createCacheFn', () => {
		let n = 0
		const fn = createCacheFn(() => ++n)

		expect(fn()).toMatchInlineSnapshot('1')
		expect(fn()).toMatchInlineSnapshot('1')

		const fn2 = createCacheFn(() => ++n)

		expect(fn2()).toMatchInlineSnapshot('2')
	})
})

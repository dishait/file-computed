import { describe, expect, it } from 'vitest'
import {
	slash,
	normalizePath,
	normalizeCachePath
} from '../src'

describe('path', () => {
	it('slash', () => {
		const path = slash(
			`D:\\Code\\Work\\file-computed\\test\\path.test.ts`
		)
		expect(path).toMatchInlineSnapshot(
			'"D:/Code/Work/file-computed/test/path.test.ts"'
		)
	})

	it('normalizePath', () => {
		const path = normalizePath(
			`D:\\Code\\Work\\file-computed\\test\\path.test.ts`,
			'../'
		)
		expect(path).toMatchInlineSnapshot(
			'"D:/Code/Work/file-computed/test"'
		)
	})

	it('normalizeCachePath', () => {
		// default to ./node_modules/.file-computed
		expect(normalizeCachePath()).toMatchInlineSnapshot(
			'"D:/Code/Work/file-computed/node_modules/.file-computed"'
		)

		// of course, other paths are also supported
		expect(
			normalizeCachePath('./temp')
		).toMatchInlineSnapshot(
			'"D:/Code/Work/file-computed/temp"'
		)
	})
})

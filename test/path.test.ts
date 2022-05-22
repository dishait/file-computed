import { describe, expect, it } from 'vitest'
import {
	slash,
	normalizePath,
	createCachePath
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

	it('createCachePath', () => {
		// default to ./node_modules/@file-computed-temp
		expect(createCachePath()).toMatchInlineSnapshot(
			'"D:/Code/Work/file-computed/node_modules/@file-computed-temp"'
		)

		// of course, other paths are also supported
		expect(createCachePath('./temp')).toMatchInlineSnapshot(
			'"D:/Code/Work/file-computed/temp"'
		)
	})
})

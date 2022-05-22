import { getFileModifyTimeStamp } from '../src'
import { describe, expect, it } from 'vitest'

describe('fs', () => {
	it('getFileModifyTime', async () => {
		expect(
			getFileModifyTimeStamp('./package.json')
		).toMatchInlineSnapshot('1653198943645')
	})
})

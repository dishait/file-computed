import { getFileModifyTimeStamp } from '../src'
import { describe, expect, it } from 'vitest'

describe('fs', () => {
	it('getFileModifyTimeStamp', async () => {
		expect(
			getFileModifyTimeStamp('./package.json')
		).toMatchInlineSnapshot('1653214373683')
	})
})

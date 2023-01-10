import {
	getFileModifyTimeStamp,
	getFileModifyTimeStampSync
} from '../src'
import { describe, expect, it } from 'vitest'

describe('fs', () => {
	it('getFileModifyTimeStamp', async () => {
		expect(
			await getFileModifyTimeStamp('./package.json')
		).toMatchInlineSnapshot('1673327916056')
	})

	it('getFileModifyTimeStampSync', () => {
		expect(
			getFileModifyTimeStampSync('./package.json')
		).toMatchInlineSnapshot('1673327916056')
	})
})

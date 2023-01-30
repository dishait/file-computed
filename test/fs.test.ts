import {
	getFileModifyTimeStamp,
	getFileModifyTimeStampSync
} from '../src'
import { describe, expect, it } from 'vitest'

describe('fs', () => {
	it('getFileModifyTimeStamp', async () => {
		expect(
			await getFileModifyTimeStamp('./package.json')
		).toMatchInlineSnapshot('1675087752504')
	})

	it('getFileModifyTimeStampSync', () => {
		expect(
			getFileModifyTimeStampSync('./package.json')
		).toMatchInlineSnapshot('1675087752504')
	})

	it('getFileModifyTimeStamp', async () => {
		expect(
			await getFileModifyTimeStamp('test/fixture')
		).toMatchInlineSnapshot('1674287259878')
	})
})

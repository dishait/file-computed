import { lstatSync } from 'fs'
import { lstat } from 'fs/promises'

export function getFileModifyTimeStampSync(
	filePath: string
) {
	try {
		const { mtime } = lstatSync(filePath)
		return mtime.getTime()
	} catch (error) {
		throw error
	}
}

export async function getFileModifyTimeStamp(
	filePath: string
) {
	const { mtime } = await lstat(filePath)
	return mtime.getTime()
}

import mem from 'mem'
import { lstatSync } from 'fs'
import { lstat } from 'fs/promises'
import { readFile as _readFile } from 'fs/promises'

export function getFileModifyTimeStampSync(
	filepath: string
) {
	const { mtime } = lstatSync(filepath)
	return mtime.getTime()
}

export async function getFileModifyTimeStamp(
	filepath: string
) {
	const { mtime } = await lstat(filepath)
	return mtime.getTime()
}

export const readFile = mem(_readFile)

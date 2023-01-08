import mem from 'mem'
import { lstat } from 'fs/promises'
import { readFile as _readFile } from 'fs/promises'
import { lstatSync, existsSync, mkdirSync } from 'fs'

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

export function ensureDirSync(dirpath: string) {
	if (!existsSync(dirpath)) {
		mkdirSync(dirpath, {
			recursive: true
		})
	}
}

import mem from 'mem'
import { dirname } from 'path'
import { debounce } from 'perfect-debounce'
import { lstat, writeFile } from 'fs/promises'
import { lstatSync, existsSync, mkdirSync } from 'fs'
import { readFile as _readFile, mkdir } from 'fs/promises'

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

export async function exists(path: string) {
	try {
		await lstat(path)
		return true
	} catch (error) {
		return false
	}
}

export async function ensureFile(
	path: string,
	content = ''
) {
	if (await exists(path)) {
		return
	}
	await mkdir(dirname(path), {
		recursive: true
	})

	await writeFile(path, content)
}

export function writeJsonFile(path: string, content: any) {
	return writeFile(path, JSON.stringify(content, null, 2))
}

export const debouncedWriteJsonFile = debounce(
	writeJsonFile,
	500
)

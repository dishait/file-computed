import mem from 'mem'
import destr from 'destr'
import { dirname } from 'path'
import { debounce } from 'perfect-debounce'
import { lstat, writeFile } from 'fs/promises'
import { readFile as _readFile, mkdir } from 'fs/promises'
import {
	lstatSync,
	existsSync,
	mkdirSync,
	createReadStream
} from 'fs'

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

export function readJsonFileWithStream<T>(
	path: string
): Promise<T> {
	let chunk = ''
	return new Promise((resolve, reject) => {
		createReadStream(path, {
			encoding: 'utf-8'
		})
			.on('data', v => {
				chunk += v
			})
			.once('end', () => {
				resolve(destr(chunk))
			})
			.once('error', err => {
				reject(err)
			})
	})
}

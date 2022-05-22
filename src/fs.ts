import { lstatSync } from 'fs'

export function getFileModifyTimeStamp(filePath: string) {
	try {
		const { mtime } = lstatSync(filePath)
		return mtime.getTime()
	} catch (error) {
		console.log('该文件不存在', error.message)
		throw error
	}
}

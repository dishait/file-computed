import mem from 'mem'
import { resolve } from 'path'
import { findUpSync } from 'find-up'

export function slash(path: string) {
	return path.replace(/\\/g, '/')
}

export function normalizePath(...paths: string[]) {
	return slash(resolve(...paths))
}

export const findUpDefaultCachePath = mem(function () {
	const path = findUpSync('node_modules', {
		type: 'directory'
	})
	return normalizePath(path, '.cache/file-computed')
})

export function normalizeCachePath(path?: string) {
	if (!path) {
		return findUpDefaultCachePath()
	}
	return normalizePath(path)
}

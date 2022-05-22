import { resolve } from 'path'
import { findUpSync } from 'find-up'

export function slash(path: string) {
	return path.replace(/\\/g, '/')
}

export function normalizePath(...paths: string[]) {
	return slash(resolve(...paths))
}

export function createCachePath(target?: string) {
	if (!target) {
		const nodeModulesPath = findUpSync('node_modules', {
			type: 'directory'
		})
		return normalizePath(
			nodeModulesPath,
			'@file-computed-temp'
		)
	}
	return normalizePath(target)
}

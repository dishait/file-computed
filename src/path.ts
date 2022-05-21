import { resolve } from 'path'
import { findUpSync } from 'find-up'

export const slash = (path: string) => {
	return path.replace(/\\/g, '/')
}

export const normalizePath = (...paths: string[]) => {
	return slash(resolve(...paths))
}

export const createCachePath = (target?: string) => {
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

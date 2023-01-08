import { createStorage } from 'unstorage'
// @ts-ignore
import fsDriver from 'unstorage/drivers/fs'
import { normalizeCachePath } from './path'

export function createFsStorage(cachePath?: string) {
	const storage = createStorage({
		driver: fsDriver({
			base: normalizeCachePath(cachePath)
		})
	})

	process.once('beforeExit', async function () {
		await storage.dispose()
	})

	return storage
}

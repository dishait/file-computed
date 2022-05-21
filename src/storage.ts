import { createCachePath } from './path'
import { createStorage } from 'unstorage'
// @ts-ignore
import fsDriver from 'unstorage/drivers/fs'

export const createFsStorage = (cachePath?: string) => {
	const storage = createStorage({
		driver: fsDriver({ base: createCachePath(cachePath) })
	})

	process.once('beforeExit', async () => {
		await storage.dispose()
	})

	return storage
}

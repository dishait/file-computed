import { AnyFunction } from './type'

export function createCacheFn<T extends AnyFunction>(
	fn: T
) {
	let result
	return ((...args) => {
		if (result) {
			return result
		}
		result = fn(...args)
		return result
	}) as T
}

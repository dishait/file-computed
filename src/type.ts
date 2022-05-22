export type AnyFunction = (...args: any) => any

export type PromisedReturnType<T extends AnyFunction> =
	Promise<ReturnType<T>>

export type PrettifyDeep<T> = T extends string
	? `${T}`
	: T extends
				| number
				| boolean
				| bigint
				| symbol
				| null
				| undefined
				| ((...args: never[]) => unknown)
		? T
		: T extends readonly unknown[]
			? {
					[K in keyof T]: PrettifyDeep<T[K]>;
				}
			: T extends object
				? {
						[K in keyof T as K extends string
							? `${K}`
							: K]: PrettifyDeep<T[K]>;
					} & {}
				: T;

export type Replace<T, K extends keyof T, V> = PrettifyDeep<
	Omit<T, K> & { [P in K]: V }
>;

export type ReplaceMany<
	T,
	R extends Partial<Record<keyof T, unknown>>,
> = PrettifyDeep<Omit<T, keyof R> & R>;

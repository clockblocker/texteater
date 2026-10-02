export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type PrettifyDeep<T> = T extends string
	? T
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

export type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;

export type Assert<Condition extends true> = Condition;

export type Expect<Value extends true> = Value;

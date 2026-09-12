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

export type Replace<T, K extends keyof T, V> = PrettifyDeep<
	Omit<T, K> & { [P in K]: V }
>;

export type ReplaceMany<
	T,
	R extends Partial<Record<keyof T, unknown>>,
> = PrettifyDeep<Omit<T, keyof R> & R>;

export type LooseAutocomplete<T extends string> = T | (string & {});

export type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;

export type Assert<Condition extends true> = Condition;

export type Expect<Value extends true> = Value;

export type ExpectFalse<Value extends false> = Value;

export type IsAny<Value> = 0 extends 1 & Value ? true : false;

export type ValueOf<ObjectType> = ObjectType[keyof ObjectType];

export type DistributiveOmit<
	Union,
	Keys extends PropertyKey,
> = Union extends unknown ? Omit<Union, Keys> : never;

export type DistributivePick<
	Union,
	Keys extends PropertyKey,
> = Union extends unknown ? Pick<Union, Extract<keyof Union, Keys>> : never;

declare const brand: unique symbol;

export type Brand<Value, Name> = Value & {
	readonly [brand]: Name;
};

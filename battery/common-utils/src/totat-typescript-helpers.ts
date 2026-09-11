export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type LooseAutocomplete<T extends string> = T | (string & {});

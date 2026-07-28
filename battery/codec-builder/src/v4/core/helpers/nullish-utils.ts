export type Nullish<T> = T | null | undefined;

export function mapNullishToNullable<TInput, TOutput>(
	value: Nullish<TInput>,
	map: (value: TInput) => TOutput,
): TOutput | null {
	return value == null ? null : map(value);
}

export function makeNullableFromNullish<T>(value: Nullish<T>): T | null {
	return value ?? null;
}

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type DeepReadonly<Value> = Value extends Primitive
	? Value
	: Value extends (...args: never[]) => unknown
		? Value
		: Value extends readonly unknown[]
			? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
			: Value extends object
				? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
				: Value;

export function deepFreeze<Value>(value: Value): DeepReadonly<Value> {
	if (
		typeof value !== "object" ||
		value === null ||
		ArrayBuffer.isView(value) ||
		Object.isFrozen(value)
	) {
		return value as DeepReadonly<Value>;
	}
	for (const nested of Object.values(value)) deepFreeze(nested);
	return Object.freeze(value) as DeepReadonly<Value>;
}

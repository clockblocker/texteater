/** Deep equality of JSON values, key order aside. */
export function sameValue(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true;
	if (Array.isArray(left))
		return (
			Array.isArray(right) &&
			left.length === right.length &&
			left.every((item, index) => sameValue(item, right[index]))
		);
	if (
		left === null ||
		right === null ||
		typeof left !== "object" ||
		typeof right !== "object" ||
		Array.isArray(right)
	)
		return false;
	const leftEntries: [string, unknown][] = Object.entries(left);
	const rightValues = new Map<string, unknown>(Object.entries(right));
	return (
		leftEntries.length === rightValues.size &&
		leftEntries.every(
			([key, value]) =>
				rightValues.has(key) && sameValue(value, rightValues.get(key)),
		)
	);
}

/**
 * A spelling of a JSON value that every `sameValue`-equal value shares, so
 * it can key an index whose candidates `sameValue` then confirms. Object keys
 * are sorted, and an array spells only its indices, a hole as undefined, as
 * `sameValue` reads them. Undefined for a value it can't spell: a cycle, a
 * function or a symbol.
 */
export function sameValueKey(value: unknown): string | undefined {
	return spell(value, new Set());
}

function spell(value: unknown, open: Set<object>): string | undefined {
	switch (typeof value) {
		case "string":
			return JSON.stringify(value);
		case "number":
			return `n${value}`;
		case "bigint":
			return `b${value}`;
		case "boolean":
			return value ? "t" : "f";
		case "undefined":
			return "u";
		case "object":
			return value === null ? "z" : spellObject(value, open);
		default:
			return undefined;
	}
}

function spellObject(value: object, open: Set<object>): string | undefined {
	if (open.has(value)) return undefined;
	open.add(value);
	const parts: (string | undefined)[] = Array.isArray(value)
		? Array.from({ length: value.length }, (_, index) =>
				spell(value[index], open),
			)
		: Object.entries(value)
				.sort(([left], [right]) => (left < right ? -1 : 1))
				.map(([key, item]) => {
					const spelled = spell(item, open);
					return spelled === undefined
						? undefined
						: `${JSON.stringify(key)}:${spelled}`;
				});
	open.delete(value);
	if (parts.some((part) => part === undefined)) return undefined;
	const body = parts.join(",");
	return Array.isArray(value) ? `[${body}]` : `{${body}}`;
}

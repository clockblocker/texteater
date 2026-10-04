/**
 * One JSON text per value, whatever the order its object keys were written
 * in, so equal values give equal strings for hashing, cache keys,
 * fingerprints and equality checks.
 *
 * - Object keys sort by UTF-16 code unit, which is what JavaScript's `<`
 *   compares and what RFC 8785 (JSON Canonicalization Scheme) prescribes.
 *   True code-point order differs only between keys holding characters
 *   above U+FFFF and keys holding U+E000 to U+FFFF. The order is the same in
 *   every runtime, unlike `localeCompare`.
 * - A member holding `undefined` is left out, as `JSON.stringify` leaves it
 *   out, so `{ a: undefined }` and `{}` give one text.
 * - Strings and numbers are written as `JSON.stringify` writes them, so the
 *   output matches RFC 8785 for any value made of JSON's own types.
 * - Anything JSON can't hold throws a `TypeError` naming where it sits:
 *   `undefined` outside an object member (the value itself or an array
 *   element), `NaN` and the infinities, bigints, functions, symbols, cycles,
 *   and objects other than arrays and plain objects (`Date`, `Map`, `Set`,
 *   class instances and the like).
 */
export function canonicalJson(value: unknown): string {
	return write(value, [], new Set());
}

function write(
	value: unknown,
	path: (string | number)[],
	ancestors: Set<object>,
): string {
	switch (typeof value) {
		case "string":
			return JSON.stringify(value);
		case "boolean":
			return value ? "true" : "false";
		case "number":
			if (!Number.isFinite(value)) throw unsupported(String(value), path);
			return JSON.stringify(value);
		case "object":
			if (value === null) return "null";
			return writeObject(value, path, ancestors);
		default:
			throw unsupported(
				typeof value === "undefined"
					? "undefined"
					: `a ${typeof value}`,
				path,
			);
	}
}

function writeObject(
	value: object,
	path: (string | number)[],
	ancestors: Set<object>,
): string {
	if (ancestors.has(value)) throw unsupported("a cycle", path);
	ancestors.add(value);
	let text: string;
	if (Array.isArray(value)) {
		const elements: string[] = [];
		for (let index = 0; index < value.length; index++) {
			path.push(index);
			elements.push(write(value[index], path, ancestors));
			path.pop();
		}
		text = `[${elements.join(",")}]`;
	} else {
		if (!isPlainObject(value))
			throw unsupported(
				`a ${value.constructor?.name ?? "non-plain"} object`,
				path,
			);
		const members: string[] = [];
		const record = value as Record<string, unknown>;
		for (const key of Object.keys(record).sort(byCodeUnit)) {
			const member = record[key];
			if (member === undefined) continue;
			path.push(key);
			members.push(
				`${JSON.stringify(key)}:${write(member, path, ancestors)}`,
			);
			path.pop();
		}
		text = `{${members.join(",")}}`;
	}
	ancestors.delete(value);
	return text;
}

/** An object whose prototype is some realm's `Object.prototype`, or none. */
function isPlainObject(value: object): boolean {
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === null || Object.getPrototypeOf(prototype) === null;
}

function byCodeUnit(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function unsupported(what: string, path: (string | number)[]): TypeError {
	const at = path
		.map((step) =>
			typeof step === "number"
				? `[${step}]`
				: /^[A-Za-z_$][\w$]*$/u.test(step)
					? `.${step}`
					: `[${JSON.stringify(step)}]`,
		)
		.join("");
	return new TypeError(`Canonical JSON cannot hold ${what} at $${at}`);
}

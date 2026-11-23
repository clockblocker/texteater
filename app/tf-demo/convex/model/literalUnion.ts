import { v } from "convex/values";

export function literalUnion<const Value extends string>(
	values: readonly [Value, ...Value[]],
) {
	const [first, ...rest] = values;
	return v.union(v.literal(first), ...rest.map((value) => v.literal(value)));
}

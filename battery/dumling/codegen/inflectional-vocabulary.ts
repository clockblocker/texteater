import { z } from "zod";

/**
 * The features an inflectional bag schema may mark, each with every value it
 * may take, merged over the bag's branches: the German verb's finite,
 * imperative, infinitive and participle branches give one vocabulary. A
 * value set (`number: ["Dual", "Sing"]`) contributes its member values. The
 * features and their values are sorted, so the output is stable.
 */
export function inflectionalVocabulary(bag: unknown): Record<string, string[]> {
	const vocabulary = new Map<string, Set<string>>();
	for (const branch of objectBranches(bag))
		for (const [name, field] of Object.entries(branch.shape)) {
			const values = vocabulary.get(name) ?? new Set<string>();
			for (const value of valuesOf(field)) values.add(value);
			vocabulary.set(name, values);
		}
	return Object.fromEntries(
		[...vocabulary]
			.filter(([, values]) => values.size > 0)
			.sort(([left], [right]) => compare(left, right))
			.map(([name, values]) => [name, [...values].sort(compare)]),
	);
}

function objectBranches(schema: unknown): z.ZodObject[] {
	if (schema instanceof z.ZodObject) return [schema];
	if (schema instanceof z.ZodUnion)
		return schema.options.flatMap((option) => objectBranches(option));
	throw Error("An inflectional bag is an object or a union of objects");
}

function valuesOf(schema: unknown): string[] {
	if (schema instanceof z.ZodNull) return [];
	if (schema instanceof z.ZodNullable) return valuesOf(schema.unwrap());
	if (schema instanceof z.ZodEnum) return schema.options.map(String);
	if (schema instanceof z.ZodLiteral) return [...schema.values].map(String);
	if (schema instanceof z.ZodUnion)
		return schema.options.flatMap((option) => valuesOf(option));
	if (schema instanceof z.ZodTuple) {
		const { items, rest } = schema.def;
		return [...items, ...(rest ? [rest] : [])].flatMap((item) =>
			valuesOf(item),
		);
	}
	throw Error(
		`An inflectional feature holds enum or literal values, not ${String((schema as { def?: { type?: string } })?.def?.type)}`,
	);
}

/** Code-point order, the same in every runtime. */
function compare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

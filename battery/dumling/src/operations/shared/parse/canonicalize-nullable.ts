import type { Constraint } from "common-utils";

export function canonicalizeNullableProperties(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
	value: unknown,
): unknown {
	const resolved = resolveConstraint(constraint, definitions);
	switch (resolved[0]) {
		case "array":
			return Array.isArray(value)
				? value.map((item) =>
						canonicalizeNullableProperties(
							resolved[1],
							definitions,
							item,
						),
					)
				: value;
		case "nullable":
			return value === null
				? null
				: canonicalizeNullableProperties(
						resolved[1],
						definitions,
						value,
					);
		case "object": {
			if (
				value === null ||
				typeof value !== "object" ||
				Array.isArray(value)
			) {
				return value;
			}
			const result: Record<string, unknown> = {
				...(value as Record<string, unknown>),
			};
			for (const [key, child] of Object.entries(resolved[1])) {
				if (
					(!(key in result) || result[key] === undefined) &&
					acceptsNull(child, definitions)
				) {
					result[key] = null;
				} else if (key in result) {
					result[key] = canonicalizeNullableProperties(
						child,
						definitions,
						result[key],
					);
				}
			}
			return result;
		}
		case "pipe":
			return canonicalizeNullableProperties(
				resolved[1],
				definitions,
				value,
			);
		case "preprocess":
			return canonicalizeNullableProperties(
				resolved[2],
				definitions,
				value,
			);
		case "union": {
			const selected = resolved[1].reduce<Constraint | undefined>(
				(best, candidate) =>
					best === undefined ||
					compatibilityScore(candidate, value, definitions) <
						compatibilityScore(best, value, definitions)
						? candidate
						: best,
				undefined,
			);
			return selected === undefined
				? value
				: canonicalizeNullableProperties(selected, definitions, value);
		}
		default:
			return value;
	}
}

function acceptsNull(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
): boolean {
	const resolved = resolveConstraint(constraint, definitions);
	if (resolved[0] === "null" || resolved[0] === "nullable") return true;
	if (resolved[0] === "pipe") return acceptsNull(resolved[1], definitions);
	if (resolved[0] === "preprocess")
		return acceptsNull(resolved[2], definitions);
	return (
		resolved[0] === "union" &&
		resolved[1].some((candidate) => acceptsNull(candidate, definitions))
	);
}

function compatibilityScore(
	constraint: Constraint,
	value: unknown,
	definitions: Readonly<Record<string, Constraint>>,
): number {
	const resolved = resolveConstraint(constraint, definitions);
	switch (resolved[0]) {
		case "array":
			return Array.isArray(value) ? 0 : Number.POSITIVE_INFINITY;
		case "boolean":
			return typeof value === "boolean" ? 0 : Number.POSITIVE_INFINITY;
		case "enum":
			return resolved[1].includes(value as never)
				? 0
				: Number.POSITIVE_INFINITY;
		case "literal":
			return Object.is(value, resolved[1]) ? 0 : Number.POSITIVE_INFINITY;
		case "null":
			return value === null ? 0 : Number.POSITIVE_INFINITY;
		case "nullable":
			return value === null
				? 0
				: compatibilityScore(resolved[1], value, definitions);
		case "object": {
			if (
				value === null ||
				typeof value !== "object" ||
				Array.isArray(value)
			) {
				return Number.POSITIVE_INFINITY;
			}
			const record = value as Record<string, unknown>;
			let score = 0;
			for (const [key, child] of Object.entries(resolved[1])) {
				if (key in record) {
					score += compatibilityScore(
						child,
						record[key],
						definitions,
					);
				} else if (!acceptsNull(child, definitions)) {
					score += 1;
				}
			}
			return score;
		}
		case "pipe":
			return compatibilityScore(resolved[1], value, definitions);
		case "preprocess":
			return compatibilityScore(resolved[2], value, definitions);
		case "string":
			return typeof value === "string" ? 0 : Number.POSITIVE_INFINITY;
		case "union":
			return Math.min(
				...resolved[1].map((candidate) =>
					compatibilityScore(candidate, value, definitions),
				),
			);
		default:
			return 0;
	}
}

function resolveConstraint(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
): Exclude<Constraint, readonly ["ref", string]> {
	if (constraint[0] !== "ref") return constraint;
	const referenced = definitions[constraint[1]];
	if (referenced === undefined) {
		throw new ReferenceError(
			`Unknown validation artifact reference: ${constraint[1]}`,
		);
	}
	return resolveConstraint(referenced, definitions);
}

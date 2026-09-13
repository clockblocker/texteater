import type { Constraint } from "common-utils";

/** Emit only the compiler constructs with an established structural output. */
export function outputType(
	root: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
): string {
	const emit = (node: Constraint): string => {
		switch (node[0]) {
			case "ref": {
				const target = definitions[node[1]];
				if (!target) throw Error(`Missing definition ${node[1]}`);
				return emit(target);
			}
			case "pipe":
				for (const effect of node[2])
					if (
						effect[0] === "operation" &&
						!new Set([
							"dumling.feature-bag.marked",
							"dumling.emoji-description",
							"dumling.normalize-form",
						]).has(effect[1])
					)
						throw Error(`No output-type contract for ${effect[1]}`);
				return emit(node[1]);
			case "literal":
				return JSON.stringify(node[1]);
			case "enum":
				return node[1]
					.map((value) => JSON.stringify(value))
					.join(" | ");
			case "string":
			case "number":
			case "boolean":
			case "unknown":
			case "null":
				return node[0];
			case "nullable":
				return `(${emit(node[1])}) | null`;
			case "optional":
				return `(${emit(node[1])}) | undefined`;
			case "array":
				return `Array<${emit(node[1])}>`;
			case "union":
				return node[1].map((child) => `(${emit(child)})`).join(" | ");
			case "tuple":
				return `[${node[1].map(emit).join(", ")}${node[2] ? `${node[1].length ? ", " : ""}...Array<${emit(node[2])}>` : ""}]`;
			case "object":
				if (Object.keys(node[1]).length === 0 && node[2] === "strict")
					return "Record<string, never>";
				if (node[2] === "passthrough")
					throw Error(
						"Flat output emission requires known object keys",
					);
				return `{${Object.entries(node[1])
					.map(
						([key, value]) =>
							`${JSON.stringify(key)}${optional(value) ? "?" : ""}: ${emit(value)};`,
					)
					.join(" ")}}`;
			default:
				throw Error(`No output-type contract for ${node[0]}`);
		}
	};
	const optional = (node: Constraint): boolean => {
		if (node[0] === "optional") return true;
		if (node[0] !== "ref") return false;
		const target = definitions[node[1]];
		if (!target) throw Error(`Missing definition ${node[1]}`);
		return optional(target);
	};
	return emit(root);
}

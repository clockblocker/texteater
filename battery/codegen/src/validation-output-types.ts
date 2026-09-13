import type { ZodValidationArtifactRegistry } from "./zod-validation-artifact.js";

type Artifact = Pick<ZodValidationArtifactRegistry, "definitions" | "roots">;
type Constraint = Artifact["roots"][string];

/** Materialize structural outputs, retaining shared and recursive references. */
export function emitValidationOutputTypes(options: {
	artifact: Artifact;
	exports: Readonly<Record<string, string>>;
	/** Operations whose output has the same structural type as their input. */
	typePreservingOperations: readonly string[];
}): string {
	const { definitions, roots } = options.artifact;
	const operations = new Set(options.typePreservingOperations);
	const names = new Map<string, string>();
	const declarations: string[] = [];
	const definition = (id: string): Constraint => {
		const node = definitions[id];
		if (!node) throw Error(`Missing definition ${id}`);
		return node;
	};
	const optional = (node: Constraint, seen = new Set<string>()): boolean => {
		if (node[0] === "optional") return true;
		if (node[0] === "nullable" || node[0] === "pipe")
			return optional(node[1], seen);
		if (node[0] === "union")
			return node[1].some((child) => optional(child, new Set(seen)));
		if (node[0] !== "ref") return false;
		if (seen.has(node[1]))
			throw Error(`Circular optional reference ${node[1]}`);
		seen.add(node[1]);
		return optional(definition(node[1]), seen);
	};
	const emit = (node: Constraint): string => {
		switch (node[0]) {
			case "ref": {
				const existing = names.get(node[1]);
				if (existing) return existing;
				const name = `_Output${names.size}`;
				names.set(node[1], name);
				declarations.push(
					`type ${name} = ${emit(definition(node[1]))};`,
				);
				return name;
			}
			case "pipe":
				for (const effect of node[2])
					if (effect[0] === "operation" && !operations.has(effect[1]))
						throw Error(`No output-type contract for ${effect[1]}`);
				return emit(node[1]);
			case "literal":
				return JSON.stringify(node[1]);
			case "enum":
				return (
					node[1].map((value) => JSON.stringify(value)).join(" | ") ||
					"never"
				);
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
				return (
					node[1].map((child) => `(${emit(child)})`).join(" | ") ||
					"never"
				);
			case "tuple":
				return `[${node[1].map(emit).join(", ")}${node[2] ? `${node[1].length ? ", " : ""}...Array<${emit(node[2])}>` : ""}]`;
			case "object":
				if (Object.keys(node[1]).length === 0 && node[2] === "strict")
					return "Record<string, never>";
				if (node[2] === "passthrough")
					throw Error(
						"Structural output emission requires known object keys",
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
	const exports = Object.entries(options.exports).map(([name, key]) => {
		if (!/^[A-Z][A-Za-z0-9_]*$/.test(name))
			throw Error(`Expected a PascalCase output type name: ${name}`);
		const root = roots[key];
		if (!root) throw Error(`Missing root ${key}`);
		return `export type ${name} = ${emit(root)};`;
	});
	return [...declarations, ...exports].join("\n");
}

import type { ZodValidationArtifactRegistry } from "./zod-validation-artifact.js";

type Artifact = Pick<ZodValidationArtifactRegistry, "definitions" | "roots">;
type Constraint = Artifact["roots"][string];

/** Output types another package owns, referenced instead of copied. */
export type ExternalOutputTypes = {
	/** The statement that brings the referenced types into scope. */
	readonly import: string;
	readonly artifact: Artifact;
	/** Roots of `artifact` mapped to the type expression that names them. */
	readonly types: Readonly<Record<string, string>>;
	readonly typePreservingOperations: readonly string[];
};

/**
 * Materialize structural outputs as a consumer should read them: exported
 * schemas by their export names, shapes another package owns by that
 * package's names, and everything else inline. A recursive schema needs an
 * export name, so no generated alias ever reaches a hover.
 */
export function emitValidationOutputTypes(options: {
	artifact: Artifact;
	exports: Readonly<Record<string, string>>;
	/** Operations whose output has the same structural type as their input. */
	typePreservingOperations: readonly string[];
	/** Consulted in order; the first owner of a shape names it. */
	external?: readonly ExternalOutputTypes[];
}): string {
	const { roots } = options.artifact;
	const exportNames = new Map<string, string>();
	for (const [name, key] of Object.entries(options.exports)) {
		if (!/^[A-Z][A-Za-z0-9_]*$/.test(name))
			throw Error(`Expected a PascalCase output type name: ${name}`);
		const root = roots[key];
		if (!root) throw Error(`Missing root ${key}`);
		if (root[0] === "ref" && !exportNames.has(root[1]))
			exportNames.set(root[1], name);
	}
	const external = new Map<string, { expression: string; owner: number }>();
	for (const [owner, source] of (options.external ?? []).entries()) {
		const shapes = structuralEmitter(
			source.artifact,
			source.typePreservingOperations,
		);
		for (const [key, expression] of Object.entries(source.types)) {
			const root = source.artifact.roots[key];
			if (!root) throw Error(`Missing external root ${key}`);
			// A root whose operations have no type contract here cannot match
			// any shape this artifact emits, so it is not a candidate.
			const shape = attempt(() => shapes.emit(root));
			if (shape !== undefined && !external.has(shape))
				external.set(shape, { expression, owner });
		}
	}
	const usedOwners = new Set<number>();
	const shapes = structuralEmitter(
		options.artifact,
		options.typePreservingOperations,
	);
	const expressions = new Map<string, string>();
	const pending = new Set<string>();
	const named = structuralEmitter(
		options.artifact,
		options.typePreservingOperations,
		(id, emitDefinition) => {
			const name = exportNames.get(id);
			if (name) return name;
			const known = expressions.get(id);
			if (known !== undefined) return known;
			if (pending.has(id))
				throw Error(`Recursive output type ${id} needs an export name`);
			const owned = external.get(shapes.emit(["ref", id]));
			if (owned) {
				usedOwners.add(owned.owner);
				return owned.expression;
			}
			pending.add(id);
			const expression = emitDefinition();
			pending.delete(id);
			expressions.set(id, expression);
			return expression;
		},
	);
	const declarations = Object.entries(options.exports).map(([name, key]) => {
		const root = roots[key] as Constraint;
		const body =
			root[0] === "ref" && exportNames.get(root[1]) === name
				? named.emitDefinition(root[1])
				: named.emit(root);
		return `export type ${name} = ${body};`;
	});
	const imports = (options.external ?? [])
		.filter((_, owner) => usedOwners.has(owner))
		.map((source) => source.import);
	return [...imports, ...declarations].join("\n");
}

/**
 * Emits a constraint as TypeScript. Without `reference`, every reference is
 * inlined, which yields a shape's canonical text. A recursive reference then
 * yields a marker counting the references back to its target, so the same
 * recursive shape reads the same in every artifact.
 */
function structuralEmitter(
	artifact: Artifact,
	typePreservingOperations: readonly string[],
	reference?: (id: string, emitDefinition: () => string) => string,
) {
	const { definitions } = artifact;
	const operations = new Set(typePreservingOperations);
	const inlined = new Map<string, string>();
	const open: string[] = [];
	// The outermost open reference the text being emitted points back to.
	let outermost = Number.POSITIVE_INFINITY;
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
	const emitDefinition = (id: string): string => emit(definition(id));
	const inline = (id: string): string => {
		const known = inlined.get(id);
		if (known !== undefined) return known;
		const depth = open.indexOf(id);
		if (depth >= 0) {
			outermost = Math.min(outermost, depth);
			return `Recursive<${open.length - depth}>`;
		}
		const enclosing = outermost;
		outermost = Number.POSITIVE_INFINITY;
		open.push(id);
		const text = emitDefinition(id);
		open.pop();
		// Text that points back past this reference depends on where it is
		// emitted, so only self-contained text is reused.
		if (outermost >= open.length) inlined.set(id, text);
		outermost = Math.min(enclosing, outermost);
		return text;
	};
	const emit = (node: Constraint): string => {
		switch (node[0]) {
			case "ref":
				return reference
					? reference(node[1], () => emitDefinition(node[1]))
					: inline(node[1]);
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
	return { emit, emitDefinition };
}

function attempt(emit: () => string): string | undefined {
	try {
		return emit();
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.startsWith("No output-type contract for ")
		)
			return undefined;
		throw error;
	}
}

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Constraint } from "common-utils";
import { emitSplitRegistry, type Registry } from "./split-registries";

/** Structural equality includes field/union order because it affects diagnostics. */
export function ruleSignature(
	registry: Registry,
	constraint: Constraint,
): string {
	const pending = new Set<string>();
	const memo = new Map<string, string>();
	function signature(value: unknown): string {
		if (Array.isArray(value) && value[0] === "ref") {
			const name = value[1];
			if (memo.has(name)) return memo.get(name)!;
			if (pending.has(name))
				throw new Error("Recursive reuse requires a separate proof");
			if (!Object.hasOwn(registry.definitions, name))
				throw new Error(`Missing definition ${name}`);
			pending.add(name);
			const result = signature(registry.definitions[name]);
			pending.delete(name);
			memo.set(name, result);
			return result;
		}
		const text = Array.isArray(value)
			? `[${value.map(signature).join(",")}]`
			: value && typeof value === "object"
				? `{${Object.entries(value)
						.map(
							([key, child]) =>
								`${JSON.stringify(key)}:${signature(child)}`,
						)
						.join(",")}}`
				: JSON.stringify(value);
		return createHash("sha256").update(text).digest("hex");
	}
	return signature(constraint);
}

/** Verify every unit-union branch matches an existing routed Dumling validator. */
export function proveReusableUnits(production: Registry, units: Registry) {
	const proofs: Record<string, string[]> = {};
	for (const [name, kind] of [
		["lemmaSchema", "Lemma"],
		["readingSchema", "Reading"],
		["attestationSchema", "Attestation"],
	] as const) {
		let union = production.roots[name]!;
		while (union[0] === "ref") union = production.definitions[union[1]]!;
		if (union[0] !== "union")
			throw new Error(`Expected unit union: ${name}`);
		const routes = Object.entries(units.roots).filter(([route]) =>
			route.startsWith(`${kind}/`),
		);
		const available = new Map(
			routes.map(([route, root]) => [ruleSignature(units, root), route]),
		);
		const matched = union[1].map((branch) => {
			const route = available.get(ruleSignature(production, branch));
			if (!route)
				throw new Error(`No identical Dumling validator for ${name}`);
			return route;
		});
		if (
			new Set(matched).size !== routes.length ||
			matched.length !== routes.length
		)
			throw new Error(
				`Incomplete or overlapping route coverage: ${name}`,
			);
		proofs[name] = matched;
	}
	return proofs;
}

export async function applyRuleReuse(root: string, reuse: boolean) {
	const directory = join(root, "battery/dumgen/src");
	const production = JSON.parse(
		(await import(join(directory, "generated/validation.ts")))
			.encodedValidation,
	);
	const units = JSON.parse(
		(
			await import(
				join(root, "battery/dumling/src/generated/validation.ts")
			)
		).encodedValidation,
	);
	const proofs = proveReusableUnits(production, units);
	for (const [name, signature] of Object.entries(units.operationSignatures))
		if (
			JSON.stringify(signature) !==
			JSON.stringify(production.operationSignatures[name])
		)
			throw new Error(`Operation version differs: ${name}`);
	// Each root is one demand group. Shared constraint blocks remain decoded once.
	const generated = emitSplitRegistry(production, (name) => name, true);
	await writeFile(
		join(directory, "experiment-operation-registry.ts"),
		generated.source,
	);
	const consumer = join(directory, "universal/validation.ts");
	let source = await readFile(consumer, "utf8");
	if (!source.includes("JSON.parse(encodedValidation)"))
		throw new Error("Validation consumer patch drift");
	source = source
		.replace(
			'import { encodedValidation } from "../generated/validation.js";',
			'import { operationRegistry } from "../experiment-operation-registry.js";',
		)
		.replace("JSON.parse(encodedValidation)", "operationRegistry");
	if (reuse) {
		await writeFile(
			join(directory, "experiment-linguistic-reuse.ts"),
			`
import { parseUnit } from "dumling";
const unitKinds: Record<string,string> = {lemmaSchema:"Lemma",readingSchema:"Reading",attestationSchema:"Attestation"};
const counts={hits:0,fallbacks:0};
// Accessors, custom prototypes, cycles, and mutable observations use the original
// interpreter. The successful path handles plain JSON-style data only.
function plainData(value: unknown, seen=new Set<object>()): boolean {
 if(value===null||typeof value!=="object")return true;
 if(seen.has(value))return false;
 const prototype=Object.getPrototypeOf(value);
 if(!Array.isArray(value)&&prototype!==Object.prototype&&prototype!==null)return false;
 seen.add(value);
 for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
  if(!("value" in descriptor)||!plainData(descriptor.value,seen))return false;
 }
 seen.delete(value);return true;
}
export function reuseLinguisticUnit(name:string,input:unknown): {value:unknown}|undefined {
 const kind=unitKinds[name];if(!kind)return undefined;
 if(!input||typeof input!=="object"||!plainData(input)||Object.getOwnPropertyDescriptor(input,"unitKind")?.value!==kind) {counts.fallbacks++;return undefined;}
 const result=parseUnit(input);
 if(result.success){counts.hits++;return {value:result.chain.value};}
 counts.fallbacks++;return undefined;
}
export const linguisticReuseState=()=>({...counts});
`,
		);
		source =
			'import { reuseLinguisticUnit } from "../experiment-linguistic-reuse.js";\n' +
			source;
		source = source.replace(
			"\tconst root = registry.roots[name];",
			"\tconst reused = reuseLinguisticUnit(name, input);\n\tif (reused) return reused.value as T;\n\tconst root = registry.roots[name];",
		);
	}
	await writeFile(consumer, source);
	await writeFile(
		join(
			root,
			"battery/experiments/dum-validation/rule-reuse-statistics.json",
		),
		JSON.stringify(
			{
				reuse,
				proofs,
				statistics: generated.statistics,
				limitations:
					"Strings remain in the initial bundle. Original unit rules remain available for exact invalid-input diagnostics; reuse defers their decoding rather than deleting all duplicated rule encodings. No change to nested correlated input validation.",
			},
			null,
			2,
		) + "\n",
	);
}

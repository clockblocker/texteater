import { createHash } from "node:crypto";
import { required } from "./required.js";
import type { Constraint } from "./validation-artifact.js";

type Registry = {
	readonly roots: Readonly<Record<string, Constraint>>;
	readonly definitions: Readonly<Record<string, Constraint>>;
};

export type LinkInput = Registry & {
	readonly version: 1;
	readonly operationSignatures: Readonly<Record<string, unknown>>;
};

/** Only visit constraint positions: enum values and check tuples are data. */
function children(
	c: Constraint,
	visit: (c: Constraint) => Constraint,
): Constraint {
	switch (c[0]) {
		case "ref":
			return visit(c);
		case "array":
			return [c[0], visit(c[1]), c[2]];
		case "nullable":
		case "optional":
			return [c[0], visit(c[1])];
		case "pipe":
			return [c[0], visit(c[1]), c[2]];
		case "preprocess":
			return [c[0], c[1], visit(c[2])];
		case "record":
			return ["record", visit(c[1]), visit(c[2])];
		case "partial-record":
			return ["partial-record", visit(c[1]), visit(c[2])];
		case "object":
			return [
				c[0],
				Object.fromEntries(
					Object.entries(c[1]).map(([k, v]) => [k, visit(v)]),
				),
				c[2],
			];
		case "union":
			return [c[0], c[1].map(visit)];
		case "tuple":
			return c[2]
				? [c[0], c[1].map(visit), visit(c[2])]
				: [c[0], c[1].map(visit)];
		default:
			return c;
	}
}

function mapRefs(
	c: Constraint,
	visit: (ref: Extract<Constraint, readonly ["ref", string]>) => Constraint,
): Constraint {
	return c[0] === "ref"
		? visit(c)
		: children(c, (child) => mapRefs(child, visit));
}

/**
 * Compiler link pass over the existing IR, after flat types have been emitted.
 * Ordered graph partition refinement handles recursive rules as well as DAGs.
 * Nodes share a class only when their full local rule and ordered child classes
 * agree. Enum/check payloads and operation signatures remain part of equality.
 */
export function linkRegistries(
	inputs: readonly { owner: string; registry: LinkInput }[],
) {
	const operations = new Map<string, string>();
	const nodes: { owner: number; body: Constraint }[] = [];
	const rootGraphs = inputs.map(({ owner, registry }, ownerIndex) => {
		if (registry.version !== 1)
			throw Error(`Unsupported artifact version: ${owner}`);
		for (const [name, signature] of Object.entries(
			registry.operationSignatures,
		)) {
			const encoded = JSON.stringify(signature);
			if (operations.has(name) && operations.get(name) !== encoded)
				throw Error(`Incompatible operation: ${name}`);
			operations.set(name, encoded);
		}
		const memo = new Map<string, number>();
		function graph(c: Constraint): Constraint {
			if (c[0] === "ref") {
				let id = c[1];
				const aliases = new Set<string>();
				while (true) {
					if (!Object.hasOwn(registry.definitions, id))
						throw Error(`Missing definition: ${owner}/${id}`);
					const target = required(
						registry.definitions[id],
						`Missing definition: ${owner}/${id}`,
					);
					if (target[0] !== "ref") break;
					if (aliases.has(id))
						throw Error(
							`Unproductive reference cycle: ${owner}/${id}`,
						);
					aliases.add(id);
					id = target[1];
				}
				if (memo.has(id))
					return [
						"ref",
						String(required(memo.get(id), "Missing memoized node")),
					];
				const index = nodes.length;
				memo.set(id, index);
				nodes.push({ owner: ownerIndex, body: ["unknown"] });
				required(nodes[index], "Missing graph node").body = children(
					required(
						registry.definitions[id],
						`Missing definition: ${owner}/${id}`,
					),
					graph,
				);
				return ["ref", String(index)];
			}
			return children(c, graph);
		}
		return Object.fromEntries(
			Object.keys(registry.roots)
				.sort()
				.map((name) => [
					name,
					graph(
						required(
							registry.roots[name],
							`Missing root: ${owner}/${name}`,
						),
					),
				]),
		);
	});
	let colors = nodes.map(() => 0),
		rounds = 0;
	while (true) {
		const classes = new Map<string, number>();
		const refined = nodes.map((node) => {
			const key = JSON.stringify(
				mapRefs(node.body, (c) => [
					"ref",
					String(colors[Number(c[1])]),
				]),
			);
			if (!classes.has(key)) classes.set(key, classes.size);
			return required(classes.get(key), "Missing refinement class");
		});
		rounds++;
		if (refined.every((color, index) => color === colors[index])) break;
		colors = refined;
		if (rounds > nodes.length + 1)
			throw Error("Graph partition failed to converge");
	}
	const owners = inputs.map(() => ({
		definitions: {} as Record<string, Constraint>,
		next: 0,
	}));
	const classIds = new Map<number, string>();
	for (const [index, node] of nodes.entries()) {
		const color = required(colors[index], "Missing node color");
		if (!classIds.has(color))
			classIds.set(
				color,
				`${node.owner}:${required(owners[node.owner], "Missing owner").next++}`,
			);
	}
	const remap = (c: Constraint): Constraint => {
		const color = required(
			colors[Number(c[1])],
			"Missing referenced color",
		);
		return [
			"ref",
			required(classIds.get(color), "Missing referenced class"),
		];
	};
	const emitted = new Set<number>();
	for (const [index, node] of nodes.entries()) {
		const color = required(colors[index], "Missing node color");
		if (emitted.has(color)) continue;
		emitted.add(color);
		required(owners[node.owner], "Missing owner").definitions[
			required(classIds.get(color), "Missing class identifier")
		] = mapRefs(node.body, remap);
	}
	let inherited: Record<string, Constraint> = Object.create(null);
	let previousFingerprint: string | undefined;
	return inputs.map(({ owner, registry }, index) => {
		const definitions = required(
			owners[index],
			"Missing owner",
		).definitions;
		const roots = Object.fromEntries(
			Object.entries(
				required(rootGraphs[index], "Missing root graph"),
			).map(([name, ref]) => [name, mapRefs(ref, remap)]),
		);
		const artifact = { version: 1 as const, roots, definitions };
		const encoded = JSON.stringify(artifact);
		const fingerprint = createHash("sha256")
			.update(
				JSON.stringify({
					encoded,
					operations: registry.operationSignatures,
					previousFingerprint,
				}),
			)
			.digest("hex");
		const requiredFingerprint = previousFingerprint;
		previousFingerprint = fingerprint;
		const runtime = {
			...artifact,
			definitions: Object.assign(
				Object.create(inherited),
				definitions,
			) as Record<string, Constraint>,
		};
		inherited = runtime.definitions;
		return {
			owner,
			artifact,
			runtime,
			encoded,
			fingerprint,
			requiredFingerprint,
			statistics: {
				originalDefinitions: Object.keys(registry.definitions).length,
				ownedDefinitions: Object.keys(definitions).length,
				originalBytes: Buffer.byteLength(
					JSON.stringify({
						version: 1,
						roots: registry.roots,
						definitions: registry.definitions,
					}),
				),
				linkedBytes: Buffer.byteLength(encoded),
				refinementRounds: rounds,
			},
		};
	});
}

/**
 * Emit one owner's runtime module. Inputs contain the canonical compiler graphs
 * in dependency order; only the final owner's unique definitions are emitted.
 * The preceding owner must publish its generated module at compiled-validation.
 * Build-time reference graphs never enter this emitted module.
 */
export function emitLinkedValidationRegistry(
	inputs: readonly { owner: string; registry: LinkInput }[],
): string {
	if (!inputs.length) throw Error("A validation owner is required");
	const linked = linkRegistries(inputs);
	const current = required(
		linked.at(-1),
		"A linked validation owner is required",
	);
	const provider = linked.at(-2);
	return `// Generated shared validation. Run the owning package's generator.\nimport {bindValidationRegistry} from "dumval/runtime";\n${provider ? `import {validationRegistry as provider} from ${JSON.stringify(`${provider.owner}/compiled-validation`)};\n` : ""}export const validationRegistry=bindValidationRegistry<${
		Object.keys(current.artifact.roots)
			.map((name) => JSON.stringify(name))
			.join("|") || "never"
	}>(${JSON.stringify(current.encoded)},${JSON.stringify(current.fingerprint)}${provider ? `,{registry:provider,fingerprint:${JSON.stringify(current.requiredFingerprint)}}` : ""});\n`;
}

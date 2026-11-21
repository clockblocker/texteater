type ValidationEffect = readonly [string, ...unknown[]];
type ArtifactConstraint =
	| readonly ["array", ArtifactConstraint, readonly unknown[]]
	| readonly ["boolean"]
	| readonly ["enum", readonly unknown[]]
	| readonly ["literal", unknown]
	| readonly ["null"]
	| readonly ["nullable", ArtifactConstraint]
	| readonly ["number"]
	| readonly ["number", readonly unknown[]]
	| readonly ["object", Readonly<Record<string, ArtifactConstraint>>, string]
	| readonly ["optional", ArtifactConstraint]
	| readonly ["partial-record", ArtifactConstraint, ArtifactConstraint]
	| readonly ["pipe", ArtifactConstraint, readonly ValidationEffect[]]
	| readonly ["preprocess", string, ArtifactConstraint]
	| readonly ["record", ArtifactConstraint, ArtifactConstraint]
	| readonly ["ref", string]
	| readonly ["string"]
	| readonly ["string", readonly unknown[]]
	| readonly ["tuple", readonly ArtifactConstraint[], ArtifactConstraint?]
	| readonly ["union", readonly ArtifactConstraint[]]
	| readonly ["unknown"];

interface EncodedArtifact {
	readonly definitions: Readonly<Record<string, ArtifactConstraint>>;
	readonly operationSignatures: Readonly<Record<string, unknown>>;
	readonly requiredOperations: readonly string[];
	readonly roots: Readonly<Record<string, ArtifactConstraint>>;
	readonly version: 1;
}

function prefixRefs(
	constraint: ArtifactConstraint,
	prefix: string,
): ArtifactConstraint {
	switch (constraint[0]) {
		case "ref":
			return ["ref", `${prefix}:${constraint[1]}`];
		case "array":
			return ["array", prefixRefs(constraint[1], prefix), constraint[2]];
		case "nullable":
		case "optional":
			return [constraint[0], prefixRefs(constraint[1], prefix)];
		case "pipe":
			return ["pipe", prefixRefs(constraint[1], prefix), constraint[2]];
		case "preprocess":
			return [
				"preprocess",
				constraint[1],
				prefixRefs(constraint[2], prefix),
			];
		case "record":
		case "partial-record":
			return [
				constraint[0],
				prefixRefs(constraint[1], prefix),
				prefixRefs(constraint[2], prefix),
			];
		case "object":
			return [
				"object",
				Object.fromEntries(
					Object.entries(constraint[1]).map(([key, value]) => [
						key,
						prefixRefs(value, prefix),
					]),
				),
				constraint[2],
			];
		case "union":
			return [
				"union",
				constraint[1].map((branch) => prefixRefs(branch, prefix)),
			];
		case "tuple":
			return constraint[2]
				? [
						"tuple",
						constraint[1].map((item) => prefixRefs(item, prefix)),
						prefixRefs(constraint[2], prefix),
					]
				: [
						"tuple",
						constraint[1].map((item) => prefixRefs(item, prefix)),
					];
		default:
			return constraint;
	}
}

function collectOperations(
	constraint: ArtifactConstraint,
	definitions: Readonly<Record<string, ArtifactConstraint>>,
	visited: Set<string>,
	orderedOperations: string[],
	seenOperations: Set<string>,
): void {
	const record = (name: string) => {
		if (!seenOperations.has(name)) {
			seenOperations.add(name);
			orderedOperations.push(name);
		}
	};
	switch (constraint[0]) {
		case "ref": {
			const id = constraint[1];
			if (visited.has(id)) return;
			visited.add(id);
			const target = definitions[id];
			if (target !== undefined)
				collectOperations(
					target,
					definitions,
					visited,
					orderedOperations,
					seenOperations,
				);
			return;
		}
		case "array":
		case "nullable":
		case "optional":
			collectOperations(
				constraint[1],
				definitions,
				visited,
				orderedOperations,
				seenOperations,
			);
			return;
		case "pipe":
			collectOperations(
				constraint[1],
				definitions,
				visited,
				orderedOperations,
				seenOperations,
			);
			for (const effect of constraint[2]) {
				if (effect[0] === "operation" && typeof effect[1] === "string")
					record(effect[1]);
			}
			return;
		case "preprocess":
			record(constraint[1]);
			collectOperations(
				constraint[2],
				definitions,
				visited,
				orderedOperations,
				seenOperations,
			);
			return;
		case "record":
		case "partial-record":
			collectOperations(
				constraint[1],
				definitions,
				visited,
				orderedOperations,
				seenOperations,
			);
			collectOperations(
				constraint[2],
				definitions,
				visited,
				orderedOperations,
				seenOperations,
			);
			return;
		case "object":
			for (const child of Object.values(constraint[1]))
				collectOperations(
					child,
					definitions,
					visited,
					orderedOperations,
					seenOperations,
				);
			return;
		case "union":
			for (const branch of constraint[1])
				collectOperations(
					branch,
					definitions,
					visited,
					orderedOperations,
					seenOperations,
				);
			return;
		case "tuple":
			for (const item of constraint[1])
				collectOperations(
					item,
					definitions,
					visited,
					orderedOperations,
					seenOperations,
				);
			if (constraint[2] !== undefined)
				collectOperations(
					constraint[2],
					definitions,
					visited,
					orderedOperations,
					seenOperations,
				);
			return;
		default:
			return;
	}
}

/**
 * Composes per-language encoded validation artifacts into one combined
 * artifact, preserving sorted root order and DFS operation-signature order so
 * downstream linked registries produce identical graphs and fingerprints.
 */
export function mergeEncodedValidationArtifacts(
	entries: readonly (readonly [language: string, encoded: string])[],
): string {
	const definitions: Record<string, ArtifactConstraint> = {};
	const allRoots: Record<string, ArtifactConstraint> = {};
	const allSignatures = new Map<string, unknown>();
	const requiredOperations = new Set<string>();

	for (const [language, encoded] of entries) {
		const artifact = JSON.parse(encoded) as EncodedArtifact;
		for (const [id, definition] of Object.entries(artifact.definitions)) {
			definitions[`${language}:${id}`] = prefixRefs(definition, language);
		}
		for (const [rootName, rootRef] of Object.entries(artifact.roots)) {
			allRoots[rootName] = prefixRefs(rootRef, language);
		}
		for (const [name, signature] of Object.entries(
			artifact.operationSignatures,
		)) {
			if (!allSignatures.has(name)) allSignatures.set(name, signature);
		}
		for (const name of artifact.requiredOperations) {
			requiredOperations.add(name);
		}
	}

	const sortedRootNames = Object.keys(allRoots).toSorted();
	const roots: Record<string, ArtifactConstraint> = {};
	const visited = new Set<string>();
	const orderedOperations: string[] = [];
	const seenOperations = new Set<string>();
	for (const name of sortedRootNames) {
		const root = allRoots[name];
		if (root === undefined) continue;
		roots[name] = root;
		collectOperations(
			root,
			definitions,
			visited,
			orderedOperations,
			seenOperations,
		);
	}

	const operationSignatures: Record<string, unknown> = {};
	for (const name of orderedOperations) {
		if (allSignatures.has(name)) {
			operationSignatures[name] = allSignatures.get(name);
		}
	}
	for (const [name, signature] of allSignatures) {
		if (!(name in operationSignatures)) {
			operationSignatures[name] = signature;
		}
	}

	return JSON.stringify({
		definitions,
		operationSignatures,
		requiredOperations: [...requiredOperations].toSorted(),
		roots,
		version: 1,
	});
}

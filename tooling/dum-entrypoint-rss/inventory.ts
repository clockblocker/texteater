export type OperationalEntryPoint = {
	readonly classification: "operational";
	readonly operation: {
		readonly description: string;
		readonly id: string;
	};
	readonly rationale: string;
	readonly specifier: string;
};

export type ExemptEntryPoint = {
	readonly classification:
		| "metadata"
		| "schema-authoring-exempt"
		| "type-only";
	readonly operation?: never;
	readonly rationale: string;
	readonly specifier: string;
};

export type DumEntryPoint = OperationalEntryPoint | ExemptEntryPoint;

/**
 * Canonical classification of every public export from Dumling, Dumrel,
 * Dumdict, and Dumgen. Tests compare this list to the package manifests so a
 * new public subpath cannot silently escape the memory audit.
 */
export const DUM_ENTRYPOINTS: readonly DumEntryPoint[] = [
	{
		classification: "operational",
		operation: {
			description:
				"Parse a valid German NOUN Lemma through the language API.",
			id: "dumling.parse-lemma",
		},
		rationale: "Package root exposes Dumling runtime operations.",
		specifier: "dumling",
	},
	{
		classification: "type-only",
		rationale:
			"Published JavaScript is empty; the subpath is a type surface.",
		specifier: "dumling/types",
	},
	{
		classification: "schema-authoring-exempt",
		rationale:
			"Deliberately Zod-bearing public schema composition surface.",
		specifier: "dumling/schema",
	},
	{
		classification: "schema-authoring-exempt",
		rationale:
			"Deliberately dangerous route-specific schema tree costing roughly 100 MiB RSS.",
		specifier: "dumling/dangerously-heavy-schema-tree",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Encode and decode a canonical Lemma ID through the lean codec facade.",
			id: "dumling.id-round-trip",
		},
		rationale:
			"Lean canonical ID codecs operate without a schema or parser-artifact import.",
		specifier: "dumling/id",
	},
	{
		classification: "operational",
		operation: {
			description: "Compute the stable fingerprint of a Reading.",
			id: "dumling.reading-fingerprint",
		},
		rationale: "Runtime Reading identity operation.",
		specifier: "dumling/reading",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Read and verify the public Dumling runtime vocabulary.",
			id: "dumling.read-vocabulary",
		},
		rationale: "Runtime constants consumed without a schema import.",
		specifier: "dumling/vocabulary",
	},
	{
		classification: "metadata",
		rationale: "Package metadata, not executable application code.",
		specifier: "dumling/package.json",
	},
	{
		classification: "operational",
		operation: {
			description: "Apply a normalized Definition Knowledge Change.",
			id: "dumrel.apply-knowledge-change",
		},
		rationale: "Package root exposes Knowledge and relation operations.",
		specifier: "dumrel",
	},
	{
		classification: "type-only",
		rationale:
			"Published JavaScript is empty; the subpath is a type surface.",
		specifier: "dumrel/types",
	},
	{
		classification: "operational",
		operation: {
			description: "Project a minimal direct Semantic Relation graph.",
			id: "dumrel.project-relations",
		},
		rationale: "Lean relation-algebra runtime surface.",
		specifier: "dumrel/relations",
	},
	{
		classification: "schema-authoring-exempt",
		rationale:
			"Deliberately Zod-bearing public schema composition surface.",
		specifier: "dumrel/schema",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Read and verify the frozen default Knowledge Settings.",
			id: "dumrel.read-default-settings",
		},
		rationale: "Runtime settings data consumed without a schema import.",
		specifier: "dumrel/settings",
	},
	{
		classification: "operational",
		operation: {
			description: "Read and verify the public relation vocabulary.",
			id: "dumrel.read-vocabulary",
		},
		rationale: "Runtime constants consumed without a schema import.",
		specifier: "dumrel/vocabulary",
	},
	{
		classification: "metadata",
		rationale: "Package metadata, not executable application code.",
		specifier: "dumrel/package.json",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Apply a Definition Knowledge Change to a Reading Entry.",
			id: "dumdict.apply-knowledge-change",
		},
		rationale:
			"Package root exposes dictionary workflows and runtime schemas.",
		specifier: "dumdict",
	},
	{
		classification: "schema-authoring-exempt",
		rationale:
			"Deliberately Zod-bearing public schema composition surface.",
		specifier: "dumdict/schema",
	},
	{
		classification: "schema-authoring-exempt",
		rationale:
			"Deliberately dangerous language-specific schema tree costing roughly 100 MiB RSS.",
		specifier: "dumdict/dangerously-heavy-schema-tree",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Apply a Definition Knowledge Change to a Reading Entry.",
			id: "dumdict.apply-knowledge-change",
		},
		rationale: "Schema-free-named dictionary runtime facade.",
		specifier: "dumdict/runtime",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Project an empty learner Semantic Relation inventory.",
			id: "dumdict.project-relations",
		},
		rationale: "Dictionary relation projection runtime surface.",
		specifier: "dumdict/relations",
	},
	{
		classification: "metadata",
		rationale: "Package metadata, not executable application code.",
		specifier: "dumdict/package.json",
	},
	{
		classification: "operational",
		operation: {
			description: "Build Dumgen with an injected no-network model SDK.",
			id: "dumgen.build",
		},
		rationale: "Package root exposes the generation runtime.",
		specifier: "dumgen",
	},
	{
		classification: "operational",
		operation: {
			description: "Project a grammatical target from Segments.",
			id: "dumgen.project-grammatical-input",
		},
		rationale: "Deterministic grammatical projection runtime.",
		specifier: "dumgen/projection",
	},
	{
		classification: "schema-authoring-exempt",
		rationale:
			"Deliberately Zod-bearing public model and DTO schema composition surface.",
		specifier: "dumgen/schema",
	},
	{
		classification: "schema-authoring-exempt",
		rationale:
			"Deliberately Zod-bearing prompt and structured-output authoring surface.",
		specifier: "dumgen/model-authoring",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Build Knowledge generation with an injected no-network SDK.",
			id: "dumgen.build-knowledge",
		},
		rationale: "Convenience Knowledge generation runtime.",
		specifier: "dumgen/knowledge",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Build Knowledge generation with an injected no-network SDK.",
			id: "dumgen.build-knowledge-runtime",
		},
		rationale: "Injected-provider Knowledge generation runtime.",
		specifier: "dumgen/knowledge-runtime",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Perform a no-network unstructured Responses operation.",
			id: "dumgen.openai-fetch",
		},
		rationale: "Fetch-only OpenAI runtime adapter.",
		specifier: "dumgen/openai-fetch",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Build Dumgen runtime with injected no-network dependencies.",
			id: "dumgen.build-runtime",
		},
		rationale: "Injected-provider main generation runtime.",
		specifier: "dumgen/runtime",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Read the generated compressed prompt payload for sidecar-free runtime bundlers.",
			id: "dumgen.read-runtime-prompt-data",
		},
		rationale:
			"Compressed generated runtime data injected only by bundlers that cannot deploy package sidecars.",
		specifier: "dumgen/runtime-prompt-data",
	},
	{
		classification: "operational",
		operation: {
			description:
				"Read and verify the public Dumgen runtime vocabulary.",
			id: "dumgen.read-vocabulary",
		},
		rationale: "Runtime constants consumed without a schema import.",
		specifier: "dumgen/vocabulary",
	},
	{
		classification: "metadata",
		rationale: "Package metadata, not executable application code.",
		specifier: "dumgen/package.json",
	},
] as const;

export function operationalEntrypoints(): readonly OperationalEntryPoint[] {
	return DUM_ENTRYPOINTS.filter(
		(entrypoint): entrypoint is OperationalEntryPoint =>
			entrypoint.classification === "operational",
	);
}

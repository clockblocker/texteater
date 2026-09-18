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
export const DUM_PACKAGE_PATHS = {
	dumling: "dumling",
	dumrel: "dumrel",
	dumdict: "dumdict",
	dumgen: "dumgen",
	dumval: "dumval",
} as const;
export const DUM_ENTRYPOINTS: readonly DumEntryPoint[] = [
	{
		specifier: "dumling",
		classification: "operational",
		rationale:
			"Published application runtime; must exclude schema authoring.",
		operation: {
			id: "dumling.parse-unit",
			description: "parse unit",
		},
	},
	{
		specifier: "dumling/types",
		classification: "type-only",
		rationale: "Structural declarations, with empty JavaScript.",
	},
	{
		specifier: "dumling/validation",
		classification: "operational",
		rationale:
			"Published application runtime; must exclude schema authoring.",
		operation: {
			id: "dumling.validate-feature-bag",
			description: "validate feature bag",
		},
	},
	{
		specifier: "dumling/package.json",
		classification: "metadata",
		rationale: "Package metadata.",
	},
	{
		specifier: "dumling/schema/*",
		classification: "schema-authoring-exempt",
		rationale: "Explicit schema or experiment authoring surface.",
	},
	{
		specifier: "dumrel",
		classification: "operational",
		rationale:
			"Published application runtime; must exclude schema authoring.",
		operation: {
			id: "dumrel.knowledge-projection",
			description: "knowledge projection",
		},
	},
	{
		specifier: "dumrel/types",
		classification: "type-only",
		rationale: "Structural declarations, with empty JavaScript.",
	},
	{
		specifier: "dumrel/schema",
		classification: "schema-authoring-exempt",
		rationale: "Explicit schema or experiment authoring surface.",
	},
	{
		specifier: "dumrel/package.json",
		classification: "metadata",
		rationale: "Package metadata.",
	},
	{
		specifier: "dumdict",
		classification: "operational",
		rationale:
			"Published application runtime; must exclude schema authoring.",
		operation: {
			id: "dumdict.parse-record",
			description: "parse record",
		},
	},
	{
		specifier: "dumdict/schema",
		classification: "schema-authoring-exempt",
		rationale: "Explicit schema or experiment authoring surface.",
	},
	{
		specifier: "dumdict/runtime",
		classification: "operational",
		rationale:
			"Published application runtime; must exclude schema authoring.",
		operation: {
			id: "dumdict.identity",
			description: "parse record",
		},
	},
	{
		specifier: "dumdict/relations",
		classification: "operational",
		rationale:
			"Published application runtime; must exclude schema authoring.",
		operation: {
			id: "dumdict.project-relations",
			description: "project relations",
		},
	},
	{
		specifier: "dumdict/pending",
		classification: "operational",
		rationale:
			"Published application runtime; must exclude schema authoring.",
		operation: {
			id: "dumdict.pending-identity",
			description: "pending identity",
		},
	},
	{
		specifier: "dumdict/planning",
		classification: "operational",
		rationale:
			"Transaction-side planning runtime; must exclude Effect and schema authoring.",
		operation: {
			id: "dumdict.plan-reading-entry",
			description: "plan reading entry",
		},
	},
	{
		specifier: "dumdict/package.json",
		classification: "metadata",
		rationale: "Package metadata.",
	},
	{
		specifier: "dumdict/memory",
		classification: "operational",
		rationale:
			"Published application runtime; must exclude schema authoring.",
		operation: {
			id: "dumdict.session-storage",
			description: "session storage",
		},
	},
	{
		specifier: "dumgen",
		classification: "operational",
		rationale:
			"Published application runtime; must exclude schema authoring.",
		operation: {
			id: "dumgen.resolve-supplied-target",
			description: "resolve supplied target",
		},
	},
	{
		specifier: "dumgen/types",
		classification: "type-only",
		rationale: "Structural declarations, with empty JavaScript.",
	},
	{
		specifier: "dumgen/authored",
		classification: "operational",
		rationale:
			"Model-free authored selection; must exclude Effect, promptsmith, and schema authoring.",
		operation: {
			id: "dumgen.select-authored",
			description: "select authored article",
		},
	},
	{
		specifier: "dumgen/validation",
		classification: "operational",
		rationale:
			"Encounter validation; must exclude Effect, promptsmith, and schema authoring.",
		operation: {
			id: "dumgen.validate-encounter",
			description: "validate encounter",
		},
	},
	{
		specifier: "dumgen/schemas",
		classification: "schema-authoring-exempt",
		rationale: "Explicit schema or experiment authoring surface.",
	},
	{
		specifier: "dumgen/development",
		classification: "schema-authoring-exempt",
		rationale: "Explicit schema or experiment authoring surface.",
	},
	{
		specifier: "dumgen/package.json",
		classification: "metadata",
		rationale: "Package metadata.",
	},
	{
		specifier: "dumling/compiled-validation",
		classification: "operational",
		rationale:
			"Shared compiled validation; runtime must remain schema-free.",
		operation: {
			id: "dumling.compiled-validation",
			description: "Validate through the shared rule protocol",
		},
	},
	{
		specifier: "dumrel/compiled-validation",
		classification: "operational",
		rationale:
			"Shared compiled validation; runtime must remain schema-free.",
		operation: {
			id: "dumrel.compiled-validation",
			description: "Validate through the shared rule protocol",
		},
	},
	{
		specifier: "dumval/runtime",
		classification: "operational",
		rationale:
			"Shared compiled validation; runtime must remain schema-free.",
		operation: {
			id: "dumval.validate",
			description: "Validate through the shared rule protocol",
		},
	},
	{
		specifier: "dumval/compiler",
		classification: "schema-authoring-exempt",
		rationale: "Build-time Zod compilation and rule linking.",
	},
	{
		specifier: "dumval/package.json",
		classification: "metadata",
		rationale: "Package metadata.",
	},
];
export function operationalEntrypoints(): readonly OperationalEntryPoint[] {
	return DUM_ENTRYPOINTS.filter(
		(entry): entry is OperationalEntryPoint =>
			entry.classification === "operational",
	);
}

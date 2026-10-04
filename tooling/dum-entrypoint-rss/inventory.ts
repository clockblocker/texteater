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
		| "development-support"
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
 * Dumdict, and common-utils, which holds the compiled-validation runtime. Tests compare this list to the package manifests so a
 * new public subpath cannot silently escape the memory audit.
 */
export const DUM_PACKAGE_PATHS = {
	dumling: "dumling",
	dumrel: "dumrel",
	dumdict: "dumdict",
	"common-utils": "common-utils",
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
		specifier: "dumdict/testing",
		classification: "development-support",
		rationale:
			"Storage conformance suite for adapter tests; imports bun:test and is never loaded at application runtime.",
	},
	{
		specifier: "dumling/validation-artifact",
		classification: "development-support",
		rationale:
			"Unlinked compiled validation that sibling generators link against; never loaded at application runtime.",
	},
	{
		specifier: "dumling/codegen",
		classification: "development-support",
		rationale:
			"Codegen-only route manifest and operation table that sibling generators read; the import policy keeps runtime code from loading it.",
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
		specifier: "dumrel/validation-artifact",
		classification: "development-support",
		rationale:
			"Unlinked compiled validation that sibling generators link against; never loaded at application runtime.",
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
		specifier: "common-utils",
		classification: "operational",
		rationale:
			"Shared helpers every Dum package loads; must stay free of Zod and the validation compiler.",
		operation: {
			id: "common-utils.canonical-json",
			description: "Write canonical JSON",
		},
	},
	{
		specifier: "common-utils/validation",
		classification: "operational",
		rationale:
			"Shared compiled validation; runtime must remain schema-free.",
		operation: {
			id: "common-utils.validate",
			description: "Validate through the shared rule protocol",
		},
	},
	{
		specifier: "common-utils/validation-compiler",
		classification: "schema-authoring-exempt",
		rationale: "Build-time Zod compilation and rule linking.",
	},
	{
		specifier: "common-utils/package.json",
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

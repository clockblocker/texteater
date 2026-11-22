import { relative } from "node:path";
import type { ImportReference } from "./source-import-parsing";
import type { Workspace } from "./workspaces";

/**
 * A boundary inside one app: a file matching `from`, or not matching
 * `fromNot`, may not import a module matching `to`. Paths are
 * repository-relative. Relative and tsconfig-alias imports from every folder
 * count, type-only ones included unless `allowTypeOnly` says they erase.
 */
export interface ModuleBoundary {
	name: string;
	comment: string;
	from?: RegExp;
	fromNot?: RegExp;
	to: RegExp;
	allowTypeOnly?: boolean;
}

export const moduleBoundaries = new Map<string, readonly ModuleBoundary[]>([
	[
		"battery/dumling",
		[
			{
				name: "dumling-runtime-does-not-import-codegen",
				comment:
					"Dumling's codegen folder, its `dumling/codegen` entry included, is for generators only (ADR 0001).",
				from: /^battery\/dumling\/src\//,
				to: /^battery\/dumling\/codegen\//,
				allowTypeOnly: true,
			},
		],
	],
	[
		"app/tf-demo",
		[
			{
				name: "tf-demo-server-does-not-import-convex",
				comment:
					"Application logic must not depend on the Convex adapter layer at runtime. Type-only imports erase, so server code may name a type the Convex schema owns.",
				from: /^app\/tf-demo\/server\//,
				to: /^app\/tf-demo\/convex\//,
				allowTypeOnly: true,
			},
			{
				name: "tf-demo-convex-does-not-import-ui",
				comment:
					"Convex modules must not depend on browser implementation code.",
				from: /^app\/tf-demo\/convex\//,
				to: /^app\/tf-demo\/src\//,
			},
			{
				name: "tf-demo-ui-reads-the-api",
				comment:
					"The browser reaches the backend through `convex/_generated` (the `api` object and `Id`/`Doc` types) and `shared/`; backend modules are not its contract (tf-demo ADR 0010).",
				from: /^app\/tf-demo\/src\//,
				to: /^app\/tf-demo\/(?:server\/|convex\/(?!_generated\/))/,
			},
			{
				name: "tf-demo-ui-names-tooling-types-only",
				comment:
					"`tooling/` and `tests/` are development-only, so the browser may name their types but loads none of their code (tf-demo ADR 0010).",
				from: /^app\/tf-demo\/src\//,
				to: /^app\/tf-demo\/(?:tooling|tests)\//,
				allowTypeOnly: true,
			},
			{
				name: "tf-demo-shared-imports-no-tier",
				comment:
					"`shared/` is the browser-backend contract and depends on no other tier (tf-demo ADR 0010).",
				from: /^app\/tf-demo\/shared\//,
				to: /^app\/tf-demo\/(?:(?:server|src|tooling|tests)\/|convex\/(?!_generated\/))/,
			},
			{
				name: "tf-demo-shared-names-generated-types-only",
				comment:
					"`shared/` may name a generated Convex type such as `Id`, but loads no Convex code (tf-demo ADR 0010).",
				from: /^app\/tf-demo\/shared\//,
				to: /^app\/tf-demo\/convex\/_generated\//,
				allowTypeOnly: true,
			},
			{
				name: "tf-demo-dumdict-storage-implementation-is-private",
				comment:
					"Callers must choose the action-level or transaction-local Dumdict interface; its implementation folder is private.",
				fromNot:
					/^app\/tf-demo\/convex\/(?:dumdictStorage\/|model\/dumdictTransaction\.ts)/,
				to: /^app\/tf-demo\/convex\/dumdictStorage\//,
			},
			{
				name: "tf-demo-notes-hide-their-internals",
				comment:
					"Outside code, including tests, may use only the Notes root interface.",
				fromNot: /^app\/tf-demo\/src\/notes\//,
				to: /^app\/tf-demo\/src\/notes\/(?!index\.ts$)/,
			},
			{
				name: "tf-demo-notes-universal-does-not-import-languages",
				comment:
					"Universal Note rendering must not depend on a language module.",
				from: /^app\/tf-demo\/src\/notes\/universal\//,
				to: /^app\/tf-demo\/src\/notes\/de\//,
			},
			{
				name: "tf-demo-german-renderer-overrides-are-private",
				comment:
					"Private German renderer leaves may only be imported by the auditable German registry.",
				fromNot: /^app\/tf-demo\/src\/notes\/de\/registry\.ts$/,
				to: /^app\/tf-demo\/src\/notes\/de\/block-renderer-overrides\//,
			},
		],
	],
]);

/** Generated code imports what its generator decides; no boundary applies. */
export const generatedSource = /\/convex\/_generated\//;

export function breaksBoundary(
	boundary: ModuleBoundary,
	importer: string,
	target: string,
	reference: ImportReference,
): boolean {
	if (boundary.from && !boundary.from.test(importer)) return false;
	if (boundary.fromNot?.test(importer)) return false;
	if (!boundary.to.test(target)) return false;
	return !(boundary.allowTypeOnly && reference.typeOnly);
}

const dumSchemaAuthoringSubpaths = new Set([
	"dangerously-heavy-schema-tree",
	"model-authoring",
	"schema",
	"schemas",
	"development",
]);
const dumPackages = new Set(["dumdict", "dumgen", "dumling", "dumrel"]);

export function isDumSchemaAuthoringSpecifier(specifier: string): boolean {
	const [packageName, subpath, ...rest] = specifier.split("/");
	return (
		dumPackages.has(packageName ?? "") &&
		(rest.length === 0 || subpath === "schema") &&
		dumSchemaAuthoringSubpaths.has(subpath ?? "")
	);
}

/**
 * Package entries only generators read: Dumling's route manifest and
 * operation table (Dumling ADR 0001). Operational code may name their types
 * but not load them.
 */
export const codegenOnlyEntries = new Set(["dumling/codegen"]);
const codegenFolders = new Set([
	"codegen",
	"generate-readme",
	"scripts",
	"test",
	"tests",
]);
/** Source modules outside those folders that only scripts and tests load. */
const codegenOnlyConsumers = new Set([
	"battery/dumcorpus/src/worklist/schema-values.ts",
]);

export function mayLoadCodegenOnlyEntry(
	repositoryRoot: string,
	workspace: Workspace,
	file: string,
): boolean {
	const path = relative(workspace.dir, file).replaceAll("\\", "/");
	return (
		codegenFolders.has(path.split("/")[0] ?? "") ||
		codegenOnlyConsumers.has(
			relative(repositoryRoot, file).replaceAll("\\", "/"),
		)
	);
}

/**
 * The one dumcorpus entry runtime code may load: the Authored Inventories,
 * which read no files and load no Zod (ADR 0025). The package root carries
 * the gold loader, which reads records with `node:fs`, and the review
 * tooling; both are for development and evaluation only. Type-only imports
 * erase, so runtime code may still name a corpus type.
 */
export const runtimeCorpusEntry = "dumcorpus/inventories";
const runtimeCorpusConsumers = [
	/^battery\/dumdict\/src\//,
	/^app\/tf-demo\/(?:convex|server)\//,
	/^app\/tf-demo\/src\/(?!.*\.test\.tsx?$)/,
	/^battery\/dumgen\/src\//,
];

export function loadsCorpusOutsideRuntimeEntry(
	importer: string,
	specifier: string,
	reference: ImportReference,
): boolean {
	return (
		(specifier === "dumcorpus" || specifier.startsWith("dumcorpus/")) &&
		specifier !== runtimeCorpusEntry &&
		!reference.typeOnly &&
		runtimeCorpusConsumers.some((consumer) => consumer.test(importer))
	);
}

export function isExplicitAuthoringSource(
	workspace: Workspace,
	file: string,
	specifier: string,
): boolean {
	const path = relative(workspace.dir, file).replaceAll("\\", "/");
	const segments = path.split("/");
	const topLevel = segments[0];
	if (
		workspace.kind === "app" &&
		(topLevel === "test" || topLevel === "tests")
	) {
		return (
			specifier.endsWith("/dangerously-heavy-schema-tree") ||
			specifier.endsWith("/model-authoring")
		);
	}
	if (path.startsWith("src/to-generate/docs/")) return true;
	if (
		workspace.kind === "battery" &&
		["codegen", "docs", "generate-readme", "test", "tests"].includes(
			topLevel ?? "",
		)
	) {
		return true;
	}
	if (workspace.kind !== "battery") return false;
	return (
		segments.some(
			(segment) => segment === "schema" || segment === "schemas",
		) ||
		/(?:^|\/)(?:dangerously-heavy-schema-tree|model-authoring|public-schema|[a-z-]*schemas|schema)\.[cm]?[jt]sx?$/u.test(
			path,
		) ||
		path.startsWith("src/development/") ||
		path.startsWith("src/universal/schemas.") ||
		path.startsWith("src/promptsmith/")
	);
}

/**
 * Tooling's deliberate reaches into a package's internals: the resolved
 * repository file, the importer and why no declared export serves it.
 * Everything else tooling imports from a workspace goes through that
 * package's `exports`.
 */
export const toolingReaches: readonly {
	importer: string;
	target: string;
	reason: string;
}[] = [
	{
		importer: "tooling/dum-runtime-verification/differential-targets.ts",
		target: "battery/dumdict/codegen/validation-artifacts.ts",
		reason: "the Zod schemas Dumdict's generator compiles, the differential's reference side",
	},
	{
		importer: "tooling/dum-runtime-verification/differential-targets.ts",
		target: "battery/dumdict/src/generated/linked-validation.ts",
		reason: "Dumdict's compiled validators, which it exports only behind its operations",
	},
	{
		importer: "tooling/dum-runtime-verification/differential-targets.ts",
		target: "battery/dumdict/src/parsing/validation-operations.ts",
		reason: "the operation table pairing each compiled validator with its schema",
	},
	{
		importer: "tooling/dum-runtime-verification/differential-targets.ts",
		target: "battery/dumdict/tests/internal/differential-fixtures.ts",
		reason: "Dumdict's test fixtures, the differential's inputs",
	},
	{
		importer: "tooling/dum-runtime-verification/differential-targets.ts",
		target: "battery/dumling/codegen/routes.ts",
		reason: "the live route discovery with each route's Zod schemas; `dumling/codegen` exports only the plain route manifest",
	},
	{
		importer: "tooling/dum-runtime-verification/differential-targets.ts",
		target: "battery/dumling/tests/unit-fixtures.ts",
		reason: "Dumling's test fixtures, the differential's inputs",
	},
	{
		importer: "tooling/dum-runtime-verification/differential-targets.ts",
		target: "battery/dumrel/tests/compiled-schema-fixtures.ts",
		reason: "Dumrel's test fixtures, the differential's inputs",
	},
	{
		importer: "tooling/tests/dum-runtime-ci-gate.test.ts",
		target: "battery/dumdict/src/generated/linked-validation.ts",
		reason: "Dumdict's compiled registry, whose public roots each need a differential target",
	},
	{
		importer: "tooling/tests/linked-validation.test.ts",
		target: "battery/dumdict/src/generated/validation-artifacts.ts",
		reason: "Dumdict's encoded validation artifacts, which no entry exports",
	},
	{
		importer: "tooling/tests/linked-validation.test.ts",
		target: "battery/dumdict/src/parsing/validation-operations.ts",
		reason: "the operation table pairing each compiled validator with its schema",
	},
];

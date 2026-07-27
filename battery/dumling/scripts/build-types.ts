import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	ConsoleMessageId,
	Extractor,
	ExtractorConfig,
} from "@microsoft/api-extractor";
import { $, type ShellError } from "bun";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempTypesDir = resolve(projectRoot, ".types-temp");
const distDir = resolve(projectRoot, "dist");

const publicEntrypoints = ["types"] as const;

const suppressedConsoleMessageIds = new Set<string>([
	ConsoleMessageId.Preamble,
	ConsoleMessageId.CompilerVersionNotice,
]);

function projectRelativePath(path: string) {
	return relative(projectRoot, path).replaceAll("\\", "/");
}

async function emitDeclarations() {
	if (existsSync(tempTypesDir)) {
		rmSync(tempTypesDir, { force: true, recursive: true });
	}

	mkdirSync(tempTypesDir, { recursive: true });

	try {
		await $`tsgo -p ${resolve(projectRoot, "tsconfig.build.json")} --outDir ${tempTypesDir}`;
	} catch (error) {
		const shellError = error as ShellError;
		process.exit(shellError.exitCode ?? 1);
	}
}

async function rollupEntrypoint(
	entrypoint: (typeof publicEntrypoints)[number],
) {
	const entryDeclarationPath = resolve(tempTypesDir, `${entrypoint}.d.ts`);
	const outputDeclarationPath = resolve(distDir, `${entrypoint}.d.ts`);
	const tsconfig = JSON.parse(
		readFileSync(resolve(projectRoot, "tsconfig.build.json"), "utf8"),
	) as {
		compilerOptions?: Record<string, unknown>;
		extends?: string;
		include?: string[];
	};
	const extractorCompilerOptions = {
		...(tsconfig.compilerOptions ?? {}),
		noEmit: true,
		paths: {
			dumling: [projectRelativePath(resolve(tempTypesDir, "index.d.ts"))],
			"dumling/schema": [
				projectRelativePath(resolve(tempTypesDir, "schema.d.ts")),
			],
			"dumling/types": [
				projectRelativePath(resolve(tempTypesDir, "types.d.ts")),
			],
		},
	};
	delete extractorCompilerOptions.outDir;
	delete extractorCompilerOptions.rootDir;
	delete extractorCompilerOptions.declarationDir;
	const extractorConfig = ExtractorConfig.prepare({
		configObject: {
			$schema:
				"https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
			projectFolder: projectRoot,
			mainEntryPointFilePath: entryDeclarationPath,
			bundledPackages: [],
			compiler: {
				overrideTsconfig: {
					extends: tsconfig.extends,
					compilerOptions: extractorCompilerOptions,
					include: [projectRelativePath(resolve(tempTypesDir, "**/*.d.ts"))],
					files: [projectRelativePath(entryDeclarationPath)],
				},
			},
			apiReport: {
				enabled: false,
			},
			docModel: {
				enabled: false,
			},
			dtsRollup: {
				enabled: true,
				untrimmedFilePath: outputDeclarationPath,
			},
			tsdocMetadata: {
				enabled: false,
			},
			messages: {
				extractorMessageReporting: {
					default: {
						logLevel: "warning",
					},
					"ae-forgotten-export": {
						logLevel: "none",
					},
					"ae-missing-release-tag": {
						logLevel: "none",
					},
				},
			},
		},
		configObjectFullPath: resolve(
			projectRoot,
			`api-extractor.${entrypoint}.json`,
		),
		packageJsonFullPath: resolve(projectRoot, "package.json"),
	});
	const result = Extractor.invoke(extractorConfig, {
		localBuild: true,
		messageCallback: (message) => {
			if (suppressedConsoleMessageIds.has(message.messageId)) {
				message.handled = true;
			}
		},
		showVerboseMessages: false,
	});

	if (!result.succeeded) {
		throw new Error(`API Extractor failed for "${entrypoint}".`);
	}
}

function writeSchemaEntrypointDeclaration() {
	writeFileSync(
		resolve(distDir, "schema.d.ts"),
		[
			'import type { AbstractLemma, AbstractLemmaSubKindFor, AbstractSelection, AbstractSurface, Descriptor, EntityKind, Lemma, LemmaKind, LemmaKindFor, LemmaKindForSurfaceKind, LemmaSubKindFor, Selection, SupportedLanguage, Surface, SurfaceKind, SurfaceKindFor } from "./types.js";',
			'import type { z } from "zod/v3";',
			"",
			"type SchemaGetter<T> = () => z.ZodType<T>;",
			"",
			"type LemmaSubKindForSurfaceKind<",
			"\tL extends SupportedLanguage,",
			"\tSK extends SurfaceKindFor<L>,",
			"\tLK extends LemmaKindForSurfaceKind<L, SK>,",
			"> = Extract<",
			"\tSurface<L>,",
			"\t{",
			"\t\tlemma: {",
			"\t\t\tlemmaKind: LK;",
			"\t\t};",
			"\t\tsurfaceKind: SK;",
			"\t}",
			"> extends infer TSurface",
			"\t? TSurface extends {",
			"\t\t\tlemma: {",
			"\t\t\t\tlemmaSubKind: infer LSK;",
			"\t\t\t};",
			"\t\t}",
			"\t\t? Extract<LSK, LemmaSubKindFor<L, LK>>",
			"\t\t: never",
			"\t: never;",
			"",
			"type LanguageSchemaTree<L extends SupportedLanguage> = {",
			"\tdescriptor: LanguageDescriptorSchemaTree<L>;",
			"\tentity: LanguageEntitySchemaTree<L>;",
			"};",
			"",
			"type SchemaRegistry = {",
			"\t[L in SupportedLanguage]: LanguageSchemaTree<L>;",
			"};",
			"",
			"type LanguageEntitySchemaTree<L extends SupportedLanguage> = {",
			"\tLemma: LemmaSchemaSubtree<L>;",
			"\tSurface: SurfaceSchemaSubtree<L>;",
			"\tSelection: SelectionSchemaSubtree<L>;",
			"};",
			"",
			"type LemmaSchemaSubtree<L extends SupportedLanguage> = {",
			"\t[LK in LemmaKindFor<L>]: {",
			"\t\t[LSK in LemmaSubKindFor<L, LK>]: SchemaGetter<Lemma<L, LK, LSK>>;",
			"\t};",
			"};",
			"",
			"type SurfaceSchemaSubtree<L extends SupportedLanguage> = {",
			"\t[SK in SurfaceKindFor<L>]: {",
			"\t\t[LK in LemmaKindForSurfaceKind<L, SK>]: {",
			"\t\t\t[LSK in LemmaSubKindForSurfaceKind<L, SK, LK>]: SchemaGetter<",
			"\t\t\t\tSurface<L, SK, LK, LSK>",
			"\t\t\t>;",
			"\t\t};",
			"\t};",
			"};",
			"",
			"type SelectionSchemaSubtree<L extends SupportedLanguage> = {",
			"\t[SK in SurfaceKindFor<L>]: {",
			"\t\t[LK in LemmaKindForSurfaceKind<L, SK>]: {",
			"\t\t\t[LSK in LemmaSubKindForSurfaceKind<",
			"\t\t\t\tL,",
			"\t\t\t\tSK,",
			"\t\t\t\tLK",
			"\t\t\t>]: SchemaGetter<Selection<L, SK, LK, LSK>>;",
			"\t\t};",
			"\t};",
			"};",
			"",
			"type LanguageDescriptorSchemaTree<L extends SupportedLanguage> = {",
			"\tLemma: LemmaDescriptorSchemaSubtree<L>;",
			"\tSurface: SurfaceDescriptorSchemaSubtree<L>;",
			"\tSelection: SelectionDescriptorSchemaSubtree<L>;",
			"};",
			"",
			"type LemmaDescriptorSchemaSubtree<L extends SupportedLanguage> = {",
			"\t[LK in LemmaKindFor<L>]: {",
			'\t\t[LSK in LemmaSubKindFor<L, LK>]: z.ZodType<Descriptor<"Lemma", L, LK, LSK>>;',
			"\t};",
			"};",
			"",
			"type SurfaceDescriptorSchemaSubtree<L extends SupportedLanguage> = {",
			"\t[SK in SurfaceKindFor<L>]: {",
			"\t\t[LK in LemmaKindForSurfaceKind<L, SK>]: {",
			"\t\t\t[LSK in LemmaSubKindForSurfaceKind<L, SK, LK>]: z.ZodType<",
			'\t\t\t\tDescriptor<"Surface", L, LK, LSK, SK>',
			"\t\t\t>;",
			"\t\t};",
			"\t};",
			"};",
			"",
			"type SelectionDescriptorSchemaSubtree<L extends SupportedLanguage> = {",
			"\t[SK in SurfaceKindFor<L>]: {",
			"\t\t[LK in LemmaKindForSurfaceKind<L, SK>]: {",
			"\t\t\t[LSK in LemmaSubKindForSurfaceKind<L, SK, LK>]: z.ZodType<",
			'\t\t\t\tDescriptor<"Selection", L, LK, LSK, SK>',
			"\t\t\t>;",
			"\t\t};",
			"\t};",
			"};",
			"",
			"type AbstractLemmaDescriptor = {",
			"\t[LK in LemmaKind]: {",
			"\t\tlanguage: string;",
			"\t\tlemmaKind: LK;",
			"\t\tlemmaSubKind: AbstractLemmaSubKindFor<LK>;",
			"\t};",
			"}[LemmaKind];",
			"",
			"type AbstractSurfaceDescriptor = AbstractLemmaDescriptor & {",
			"\tsurfaceKind: SurfaceKind;",
			"};",
			"",
			"type AbstractSelectionDescriptor = AbstractSurfaceDescriptor;",
			"",
			'type AbstractDescriptor<K extends EntityKind> = K extends "Lemma"',
			"\t? AbstractLemmaDescriptor",
			'\t: K extends "Surface"',
			"\t\t? AbstractSurfaceDescriptor",
			"\t\t: AbstractSelectionDescriptor;",
			"",
			"type AbstractSchemaRegistry = {",
			"\tdescriptor: {",
			"\t\t[K in EntityKind]: z.ZodType<AbstractDescriptor<K>>;",
			"\t};",
			"\tentity: {",
			"\t\tLemma: z.ZodType<AbstractLemma<string>>;",
			"\t\tSurface: z.ZodType<AbstractSurface<string>>;",
			"\t\tSelection: z.ZodType<AbstractSelection<string>>;",
			"\t};",
			"};",
			"",
			"export declare const abstractSchemas: AbstractSchemaRegistry;",
			"",
			"export declare const schemasFor: SchemaRegistry;",
			"",
			"export declare function getSchemaTreeFor<L extends SupportedLanguage>(",
			"\tlanguage: L,",
			"): SchemaRegistry[L];",
			"",
		].join("\n"),
	);
}

function writeIndexEntrypointDeclaration() {
	writeFileSync(
		resolve(distDir, "index.d.ts"),
		[
			'import type { DumlingApi, LanguageApi, SupportedLanguage } from "./types.js";',
			"",
			'export type * from "./types.js";',
			"",
			"export declare const dumling: DumlingApi;",
			"",
			"export declare function getLanguageApi<L extends SupportedLanguage>(",
			"\tlanguage: L,",
			"): LanguageApi<L>;",
			"",
			"export declare const supportedLanguages: readonly SupportedLanguage[];",
			"",
		].join("\n"),
	);
}

async function main() {
	await emitDeclarations();

	for (const entrypoint of publicEntrypoints) {
		await rollupEntrypoint(entrypoint);
	}

	writeIndexEntrypointDeclaration();
	writeSchemaEntrypointDeclaration();

	rmSync(tempTypesDir, { force: true, recursive: true });
}

await main();

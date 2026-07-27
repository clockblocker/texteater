import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { execFileSync } from "node:child_process";
import {
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "../../..");

setDefaultTimeout(120_000);

function run(command: string, args: string[]) {
	try {
		return execFileSync(command, args, {
			cwd: projectRoot,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	} catch (caught) {
		const error = caught as {
			message?: string;
			stderr?: string;
			stdout?: string;
		};
		throw new Error(
			[
				error.message,
				error.stdout ? `stdout:\n${error.stdout}` : undefined,
				error.stderr ? `stderr:\n${error.stderr}` : undefined,
			]
				.filter(Boolean)
				.join("\n\n"),
		);
	}
}

describe("published package entrypoints", () => {
	it("builds rolled entrypoints, supports self-reference, and packs only public files", () => {
		run("bun", ["run", "generate:readme"]);
		run("bun", ["run", "build"]);

		const runtimeSmokeTest = `
			import { dumling, getLanguageApi, supportedLanguages } from "dumling";
			import { abstractSchemas, getSchemaTreeFor, schemasFor } from "dumling/schema";
			import * as schemaModule from "dumling/schema";

			if (supportedLanguages.join(",") !== "de,en,he") throw new Error("language inventory is missing");
			if (getLanguageApi("de") !== dumling.de) throw new Error("language API helper returned the wrong API");
			if ("schema" in schemaModule) throw new Error("old schema export leaked");
			if ("schemas" in schemaModule) throw new Error("old schemas export leaked");
			if ("runtimeSchemas" in schemaModule) throw new Error("runtime schemas leaked");
			if ("newSchema" in schemaModule) throw new Error("newSchema export leaked");
			if ("descriptorSchemas" in schemaModule) throw new Error("descriptor schemas leaked");
			const lemma = dumling.de.create.lemma({
				canonicalLemma: "see",
				lemmaKind: "Lexeme",
				lemmaSubKind: "NOUN",
				inherentFeatures: { gender: "Masc" },
				meaningInEmojis: "🌊",
			});
			const selection = dumling.de.convert.lemma.toSelection(lemma, {
				spelledSelection: "See",
			});
			const parsed = dumling.de.parse.selection(selection);
			if (!parsed.success) throw new Error(parsed.error.message);
			const decoded = dumling.de.id.decode.asSelection(dumling.de.id.encode.asBase64Url(parsed.data));
			if (!decoded.success) throw new Error(decoded.error.message);
			const staticSchema = schemasFor.de.entity.Selection.Citation.Lexeme.NOUN();
			const dynamicSchema = getSchemaTreeFor("de").entity.Selection.Citation.Lexeme.NOUN();
			if (typeof staticSchema.parse !== "function") throw new Error("schema entrypoint is missing german schemas");
			staticSchema.parse(parsed.data);
			dynamicSchema.parse(parsed.data);
			if (schemasFor.de.entity.Selection.Citation.Lexeme.NOUN() !== staticSchema) throw new Error("leaf getter should return the stable schema object");
			if (getSchemaTreeFor("de") !== schemasFor.de) throw new Error("dynamic schema accessor must return registry object");
			schemasFor.de.descriptor.Lemma.Lexeme.NOUN.parse({ language: "de", lemmaKind: "Lexeme", lemmaSubKind: "NOUN" });
			abstractSchemas.descriptor.Lemma.parse({ language: "fr", lemmaKind: "Lexeme", lemmaSubKind: "NOUN" });
		`;

		run("node", ["--input-type=module", "--eval", runtimeSmokeTest]);

		const typecheckDir = mkdtempSync(join(projectRoot, ".typecheck-"));

		try {
			writeFileSync(
				join(typecheckDir, "fixture.ts"),
				[
					'import { dumling, getLanguageApi, supportedLanguages } from "dumling";',
					'import { abstractSchemas, getSchemaTreeFor, schemasFor } from "dumling/schema";',
					'import type * as z from "zod/v3";',
					'import type { AbstractLemma, ApiResult, Descriptor, DumlingBase64Url, DumlingDescriptorCsv, EntityForKind, EntityValue, IdDecodeError, IdDecodeSuccess, LanguageApi, Lemma, ParseError, Selection, SelectionOptionsFor, SupportedLanguage, Surface } from "dumling/types";',
					"",
					'const languages: readonly ("de" | "en" | "he")[] = supportedLanguages;',
					"void languages;",
					'const lemma: Lemma<"de", "Lexeme", "NOUN"> = dumling.de.create.lemma({',
					'\tcanonicalLemma: "see",',
					'\tlemmaKind: "Lexeme",',
					'\tlemmaSubKind: "NOUN",',
					"\tinherentFeatures: {},",
					'\tmeaningInEmojis: "🌊",',
					"});",
					"",
					'const selection: Selection<"de"> = dumling.de.convert.lemma.toSelection(lemma, {',
					'\tspelledSelection: "See",',
					"});",
					"const parsed = dumling.de.parse.selection(selection);",
					"if (!parsed.success) throw new Error(parsed.error.message);",
					'const dynamicApi = getLanguageApi("de");',
					"const dynamicSelection = dynamicApi.convert.lemma.toSelection(lemma);",
					'dynamicSelection satisfies Selection<"de">;',
					"function genericApi<L extends SupportedLanguage>(language: L): LanguageApi<L> {",
					"\treturn getLanguageApi(language);",
					"}",
					"void genericApi;",
					"const selectionId = dumling.de.id.encode.asBase64Url(parsed.data);",
					'selectionId satisfies DumlingBase64Url<"de">;',
					"const selectionDescriptorCsv = dumling.de.describe.asCsv.selection(parsed.data);",
					'selectionDescriptorCsv satisfies DumlingDescriptorCsv<"de", "Selection">;',
					"const decoded = dumling.de.id.decode.asSelection(selectionId);",
					'decoded satisfies ApiResult<Extract<IdDecodeSuccess<"de">, { kind: "Selection" }>, IdDecodeError>;',
					"if (!decoded.success) throw new Error(decoded.error.message);",
					'decoded.data satisfies IdDecodeSuccess<"de">;',
					'const entityValue: EntityValue<"de"> = parsed.data;',
					'const selectionValue: Selection<"de"> = decoded.data.selection;',
					'const entityForKind: EntityForKind<"de", "Selection"> = parsed.data;',
					'const selectionOptions: SelectionOptionsFor = { spelledSelection: "See" };',
					"declare const parseError: ParseError;",
					"void entityValue;",
					"void selectionValue;",
					"void entityForKind;",
					"void selectionOptions;",
					"void selectionDescriptorCsv;",
					"void parseError;",
					'const nounLemmaSchema: z.ZodType<Lemma<"de", "Lexeme", "NOUN">> = schemasFor.de.entity.Lemma.Lexeme.NOUN();',
					'const nounSelectionSchema: z.ZodType<Selection<"de", "Citation", "Lexeme", "NOUN">> = schemasFor.de.entity.Selection.Citation.Lexeme.NOUN();',
					'const nounLemmaDescriptorSchema: z.ZodType<Descriptor<"Lemma", "de", "Lexeme", "NOUN">> = schemasFor.de.descriptor.Lemma.Lexeme.NOUN;',
					"const abstractLemmaSchema: z.ZodType<AbstractLemma<string>> = abstractSchemas.entity.Lemma;",
					'const deTree = getSchemaTreeFor("de");',
					"deTree.entity.Selection.Citation.Lexeme.NOUN();",
					'deTree.descriptor.Lemma.Lexeme.NOUN.parse({ language: "de", lemmaKind: "Lexeme", lemmaSubKind: "NOUN" });',
					"declare const language: SupportedLanguage;",
					"const languageTree = getSchemaTreeFor(language);",
					"languageTree.entity.Selection.Citation.Lexeme.NOUN();",
					"getSchemaTreeFor(language).entity.Selection.Citation.Lexeme.NOUN();",
					"nounLemmaSchema.parse(lemma);",
					"nounSelectionSchema.parse(parsed.data);",
					'nounLemmaDescriptorSchema.parse({ language: "de", lemmaKind: "Lexeme", lemmaSubKind: "NOUN" });',
					'abstractLemmaSchema.parse({ language: "fr", canonicalLemma: "aller", lemmaKind: "Lexeme", lemmaSubKind: "VERB", inherentFeatures: {}, meaningInEmojis: "🚶" });',
					"schemasFor.de.entity.Selection.Citation.Lexeme.NOUN().parse(parsed.data);",
				].join("\n"),
			);
			writeFileSync(
				join(typecheckDir, "tsconfig.json"),
				JSON.stringify(
					{
						compilerOptions: {
							module: "NodeNext",
							moduleResolution: "NodeNext",
							noEmit: true,
							strict: true,
							target: "ESNext",
						},
						include: ["./fixture.ts"],
					},
					null,
					2,
				),
			);

			run(resolve(projectRoot, "node_modules/.bin/tsgo"), [
				"--project",
				join(typecheckDir, "tsconfig.json"),
				"--pretty",
				"false",
			]);

			run(resolve(projectRoot, "node_modules/.bin/tsgo"), [
				"--project",
				resolve(projectRoot, "docs-site/tsconfig.json"),
				"--pretty",
				"false",
			]);
		} finally {
			rmSync(typecheckDir, { force: true, recursive: true });
		}

		const packSummary = JSON.parse(
			run("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"]),
		) as Array<{
			files: Array<{ path: string }>;
		}>;
		const packedFiles =
			packSummary[0]?.files.map((file) => file.path) ?? [];

		expect(packedFiles.length).toBeLessThan(20);
		expect(packedFiles).toContain("dist/index.d.ts");
		expect(packedFiles).toContain("dist/types.d.ts");
		expect(packedFiles).toContain("dist/schema.d.ts");
		expect(packedFiles).not.toContain("dist/id.d.ts");
		expect(packedFiles).not.toContain("dist/operation.d.ts");
		expect(packedFiles).not.toContain("dist/entities.d.ts");
		const rolledTypes = readFileSync(
			resolve(projectRoot, "dist/types.d.ts"),
			"utf8",
		);
		const indexEntrypointTypes = readFileSync(
			resolve(projectRoot, "dist/index.d.ts"),
			"utf8",
		);
		const schemaEntrypointTypes = readFileSync(
			resolve(projectRoot, "dist/schema.d.ts"),
			"utf8",
		);

		expect(indexEntrypointTypes).toContain('from "./types.js"');
		expect(indexEntrypointTypes).not.toContain('from "dumling/types"');
		expect(schemaEntrypointTypes).toContain('from "./types.js"');
		expect(schemaEntrypointTypes).not.toContain('from "dumling/types"');
		expect(rolledTypes).not.toContain(
			"export declare type AbstractLanguageTag",
		);
		expect(rolledTypes).not.toContain(
			"export declare const AbstractLanguageTag",
		);
		expect(rolledTypes).not.toContain("export declare const LemmaKind");
		expect(rolledTypes).not.toContain("export declare const LemmaSubKind");
		expect(rolledTypes).not.toContain(
			"export declare const OrthographicStatus",
		);
		expect(rolledTypes).not.toContain(
			"export declare const SelectionCoverage",
		);
		expect(rolledTypes).not.toContain(
			"export declare const SpellingRelation",
		);
		expect(rolledTypes).not.toContain(
			"export declare const SupportedLanguage",
		);
		expect(rolledTypes).not.toContain("export declare const SurfaceKind");
		expect(
			statSync(resolve(projectRoot, "dist/index.d.ts")).size,
		).toBeLessThan(120_000);
		const indexDts = readFileSync(
			resolve(projectRoot, "dist/index.d.ts"),
			"utf8",
		);
		expect(indexDts).not.toContain("GenericLanguageApi");
		expect(indexDts).toContain(
			"getLanguageApi<L extends SupportedLanguage>",
		);
		expect(indexDts).toContain("): LanguageApi<L>;");

		const schemaDts = readFileSync(
			resolve(projectRoot, "dist/schema.d.ts"),
			"utf8",
		);
		expect(schemaDts).not.toContain("runtimeSchemas");
		expect(schemaDts).not.toContain("descriptorSchemas");
		expect(schemaDts).not.toContain("src/schemas");
		expect(schemaDts).not.toContain("export type New");
		expect(schemaDts).not.toContain(
			"EverySupportedLanguageHasConcreteSchema",
		);
		expect(schemaDts.length).toBeLessThan(40_000);
	});
});

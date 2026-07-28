import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

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

function filesRecursively(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = resolve(directory, entry.name);
		return entry.isDirectory() ? filesRecursively(path) : [path];
	});
}

function relativeDeclarationSpecifiers(declarationFile: string): string[] {
	const contents = readFileSync(declarationFile, "utf8");
	const pattern =
		/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g;
	return [...contents.matchAll(pattern)].map((match) => match[1] as string);
}

describe("published package entrypoints", () => {
	it("builds ordinary declarations, supports self-reference, and packs only public files", () => {
		run(process.execPath, ["run", "generate:readme"]);
		run(process.execPath, ["run", "build"]);

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
					'import type { LanguageApi as RootLanguageApi, SupportedLanguage as RootSupportedLanguage } from "dumling";',
					'import { abstractSchemas, getSchemaTreeFor, schemasFor } from "dumling/schema";',
					'import type * as z from "zod";',
					'import type { AbstractLemma, ApiResult, Descriptor, DumlingBase64Url, DumlingDescriptorCsv, EntityForKind, EntityValue, IdDecodeError, IdDecodeErrorCode, IdDecodeSuccess, LanguageApi, Lemma, ParseError, ParseErrorCode, Selection, SelectionOptionsFor, SupportedLanguage, Surface } from "dumling/types";',
					"",
					'const languages: readonly ("de" | "en" | "he")[] = supportedLanguages;',
					"void languages;",
					'const rootLanguage: RootSupportedLanguage = "de";',
					"const rootApi: RootLanguageApi<typeof rootLanguage> = dumling.de;",
					"void rootApi;",
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
					'const parseErrorCode: ParseErrorCode = "InvalidInput";',
					'const idDecodeErrorCode: IdDecodeErrorCode = "MalformedId";',
					"void entityValue;",
					"void selectionValue;",
					"void entityForKind;",
					"void selectionOptions;",
					"void selectionDescriptorCsv;",
					"void parseError;",
					"void parseErrorCode;",
					"void idDecodeErrorCode;",
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

			run(
				resolve(
					projectRoot,
					"../../node_modules/@typescript/native/bin/tsc",
				),
				[
					"--project",
					join(typecheckDir, "tsconfig.json"),
					"--pretty",
					"false",
				],
			);
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

		expect(packedFiles).toContain("dist/index.d.ts");
		expect(packedFiles).toContain("dist/index.js");
		expect(packedFiles).toContain("dist/types.d.ts");
		expect(packedFiles).toContain("dist/types.js");
		expect(packedFiles).toContain("dist/schema.d.ts");
		expect(packedFiles).toContain("dist/schema.js");
		expect(packedFiles).toContain("dist/operations/api-shape.d.ts");
		expect(packedFiles).toContain("dist/types/public-types.d.ts");
		expect(packedFiles).toContain("dist/schemas/public-schemas.d.ts");

		for (const packedFile of packedFiles) {
			expect(
				packedFile === "LICENSE" ||
					packedFile === "README.md" ||
					packedFile === "package.json" ||
					packedFile.startsWith("dist/"),
			).toBe(true);
		}

		const declarationFiles = filesRecursively(
			resolve(projectRoot, "dist"),
		).filter((file) => file.endsWith(".d.ts"));
		expect(declarationFiles.length).toBeGreaterThan(200);

		for (const declarationFile of declarationFiles) {
			expect(packedFiles).toContain(
				relative(projectRoot, declarationFile),
			);

			for (const specifier of relativeDeclarationSpecifiers(
				declarationFile,
			)) {
				expect(specifier.endsWith(".js")).toBe(true);
				expect(
					existsSync(
						resolve(
							dirname(declarationFile),
							`${specifier.slice(0, -3)}.d.ts`,
						),
					),
				).toBe(true);
			}
		}
	});
});

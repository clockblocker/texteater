import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
	compileZodValidationArtifacts,
	emitLinkedValidationRegistry,
	emitValidationOutputTypes,
} from "dumval/compiler";
import { z } from "zod";
import { registrations as dumlingOperations } from "../../dumling/codegen/operations.js";
import { loadRoutes } from "../../dumling/codegen/routes.js";
import { encodedValidation as dumlingValidation } from "../../dumling/src/generated/validation.js";
import { formatTypeScript } from "../../dumrel/codegen/format-typescript.js";
import { encodedValidation as dumrelValidation } from "../../dumrel/src/generated/validation.js";
import { normalizeText } from "../../dumrel/src/semantics.js";

const check = process.argv.includes("--check");
async function emit(name: string, source: string) {
	const path = new URL(`../src/generated/${name}`, import.meta.url);
	const formatted = await formatTypeScript(source, path);
	if (check) {
		if ((await readFile(path, "utf8").catch(() => "")) !== formatted)
			throw Error(`Stale Dumgen artifact ${name}`);
	} else {
		await mkdir(new URL(".", path), { recursive: true });
		await writeFile(path, formatted);
	}
}
const routes = await loadRoutes();
const imports = routes
	.map(
		(route, index) =>
			`import * as R${index} from "dumling/schema/${route.modulePath.replace(/\.js$/, "")}";`,
	)
	.join("\n");
const refs = (unit: string) =>
	routes.map((_, index) => `R${index}.${unit}Schema`).join(",");
const target = (index: number) =>
	`z.strictObject({family:R${index}.lemmaSchema.shape.family,kind:R${index}.lemmaSchema.shape.kind,memberSegmentIndices})`;
await emit(
	"schemas.ts",
	`// Generated from canonical Dumling schemas.\nimport {z} from "zod";\nimport {knowledgeRequestMaskSchema} from "dumrel/schema";\nimport {segmentedSentenceSchema,memberIndicesSchema as memberSegmentIndices} from "../universal/schemas.js";\n${imports}\n
export const lemmaSchema=z.union([${refs("lemma")}]);
export const readingSchema=z.union([${refs("reading")}]);
export const attestationSchema=z.union([${refs("attestation")}]);
export const emojiDescriptionSchema=R0.readingSchema.shape.emojiDescription;
export const analysisTargetSchema=z.union([${routes.map((_, index) => target(index)).join(",")}]);
export const encounterSchema=z.union([${routes.map((route, index) => `z.strictObject({sentence:segmentedSentenceSchema.extend({language:z.literal(${JSON.stringify(route.language)})}),target:${target(index)}})`).join(",")}]);
export const generationInputSchema=z.union([${routes.map((_, index) => `z.strictObject({encounter:encounterSchema.options[${index}],lemma:R${index}.lemmaSchema})`).join(",")}]);
export const comparisonInputSchema=z.union(generationInputSchema.options.map(schema=>schema.extend({candidates:z.array(emojiDescriptionSchema)})));
export const knowledgeInputSchema=z.union([${routes.map((_, index) => `z.strictObject({encounter:encounterSchema.options[${index}],reading:R${index}.readingSchema,request:knowledgeRequestMaskSchema})`).join(",")}]);
export const grammarSchemas={${routes.map((route, index) => `${JSON.stringify(route.key)}:z.strictObject({lemma:R${index}.lemmaSchema.omit({unitKind:true,language:true,family:true,kind:true}),surface:z.strictObject(R${index}.surfaceSchema.shape).omit({unitKind:true,language:true,lemma:true,normalizedSurface:true}),normalizedMembers:z.array(z.string().min(1)).min(1),memberOrthographies:z.array(z.enum(["Standard","Typo"])).min(1),realizationCoverage:z.enum(["Full","Partial"]),${route.key === "de/Lexeme/NOUN" ? "articleEvidence:R" + index + ".attestationSchema.shape.articleEvidence," : ""}})`).join(",")}};
export const targetsByLanguage={${["de", "en", "he"]
		.map(
			(language) =>
				`${language}:z.union([${routes
					.map((route, index) => ({ route, index }))
					.filter(({ route }) => route.language === language)
					.map(({ index }) => target(index))
					.join(",")}])`,
		)
		.join(",")}};
`,
);
const { canonicalDumgenValidationSchemas: schemas } = await import(
	"./validation-schemas.js"
);

const operations = [
	...dumlingOperations,
	{
		construct: "overwrite",
		implementation: normalizeText,
		name: "dumrel.normalize-text",
		version: 1,
	},
] as const;
const compiled = compileZodValidationArtifacts({ schemas, operations });
await emit(
	"linked-validation.ts",
	emitLinkedValidationRegistry([
		{ owner: "dumling", registry: JSON.parse(dumlingValidation) },
		{ owner: "dumrel", registry: JSON.parse(dumrelValidation) },
		{ owner: "dumgen", registry: compiled },
	]),
);
await emit(
	"validation.ts",
	`// Generated canonical validation.\nexport const encodedValidation:string=${JSON.stringify(JSON.stringify(compiled))};\n`,
);
await emit(
	"types.ts",
	`// Generated public DTOs.\n${emitValidationOutputTypes({ artifact: compiled, exports: { Segment: "segmentSchema", SegmentedSentence: "segmentedSentenceSchema", SegmentationDecision: "segmentationDecisionSchema", Encounter: "encounterSchema", GenerationInput: "generationInput", ComparisonInput: "comparisonInput", KnowledgeInput: "knowledgeInput", SegmentInput: "segmentInputSchema", KnowledgeProduction: "knowledgeProductionSchema" }, typePreservingOperations: operations.map((operation) => operation.name) })}`,
);
await emit(
	"model-schemas.ts",
	`// Generated private model exchange schemas.\nexport const modelSchemas:Readonly<Record<string,Record<string,unknown>>>=${JSON.stringify(
		Object.fromEntries(
			Object.entries(schemas)
				.filter(
					([key]) =>
						key.startsWith("grammar/") ||
						key.startsWith("target/") ||
						[
							"intakeOutput",
							"emojiGenerationOutput",
							"knowledgeOutput",
						].includes(key),
				)
				.map(([key, schema]) => [key, z.toJSONSchema(schema)]),
		),
	)};`,
);
console.log(
	`${check ? "Verified" : "Generated"} Dumgen contracts and ${routes.length} grammatical routes`,
);

const { assembleSystemPrompt } = await import("promptsmith");
const { corpusRegistrations } = await import(
	"../src/concrete-lang/de/experiments.js"
);
await emit(
	"prompts.ts",
	`// Generated from explicitly selected demonstrations, never held-out cases.\nexport const prompts:Readonly<Record<string,string>>=${JSON.stringify(
		Object.fromEntries(
			corpusRegistrations
				.filter(
					({ source }) =>
						"body" in source &&
						source.route === "reading-generation/de",
				)
				.map(({ source }) => {
					if (!("body" in source))
						throw Error("Missing active text prompt");
					return [source.route, assembleSystemPrompt(source)];
				}),
		),
	)};\nexport const grammarPromptRoutes:Readonly<Record<string,string>>=${JSON.stringify(Object.fromEntries(routes.filter((route) => route.language === "de").map((route) => [route.key, `grammatical-resolution/${route.modulePath.replace(/\.js$/, "")}`])))};`,
);

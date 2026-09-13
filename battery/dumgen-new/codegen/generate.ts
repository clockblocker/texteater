import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
	compileZodValidationArtifacts,
	emitValidationOutputTypes,
} from "codegen";
import { z } from "zod";
import { registrations as dumlingOperations } from "../../dumling-new/codegen/operations.js";
import { loadRoutes } from "../../dumling-new/codegen/routes.js";
import { formatTypeScript } from "../../dumrel-new/codegen/format-typescript.js";
import { normalizeText } from "../../dumrel-new/src/semantics.js";
import * as universal from "../src/universal/schemas.js";

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
export const comparisonInputSchema=z.union(generationInputSchema.options.map(schema=>schema.extend({candidates:z.tuple([emojiDescriptionSchema],emojiDescriptionSchema)})));
export const knowledgeInputSchema=z.union([${routes.map((_, index) => `z.strictObject({encounter:encounterSchema.options[${index}],reading:R${index}.readingSchema,request:knowledgeRequestMaskSchema})`).join(",")}]);
export const grammarSchemas={${routes.map((route, index) => `${JSON.stringify(route.key)}:z.strictObject({lemma:R${index}.lemmaSchema.omit({unitKind:true,language:true,family:true,kind:true}),surface:R${index}.surfaceSchema.omit({unitKind:true,language:true,lemma:true,normalizedSurface:true}),normalizedMembers:z.array(z.string().min(1)).min(1),memberOrthographies:z.array(z.enum(["Standard","Typo"])).min(1),realizationCoverage:z.enum(["Full","Partial"])})`).join(",")}};
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
const privateSchemas = await import("../src/concrete-lang/de/model-schemas.js");
const generated = await import("../src/generated/schemas.js");
const schemas = {
	...Object.fromEntries(
		Object.entries(universal).filter(
			([, value]) => value instanceof z.ZodType,
		),
	),
	encounterSchema: generated.encounterSchema,
	lemmaSchema: generated.lemmaSchema,
	readingSchema: generated.readingSchema,
	attestationSchema: generated.attestationSchema,
	emojiDescriptionSchema: generated.emojiDescriptionSchema,
	generationInput: generated.generationInputSchema,
	comparisonInput: generated.comparisonInputSchema,
	knowledgeInput: generated.knowledgeInputSchema,
	emojiOutput: z.strictObject({
		emojiDescription: generated.emojiDescriptionSchema,
	}),
	intakeOutput: privateSchemas.intakeOutputSchema,
	knowledgeOutput: privateSchemas.knowledgeOutputSchema,

	...Object.fromEntries(
		Object.entries(generated.grammarSchemas).map(([key, value]) => [
			`grammar/${key}`,
			z.union([
				value,
				z.strictObject({ decision: z.literal("Unresolved") }),
			]),
		]),
	),
	...Object.fromEntries(
		Object.entries(generated.targetsByLanguage).map(([key, value]) => [
			`target/${key}`,
			key === "de"
				? privateSchemas.targetOutputSchema
				: z.union([
						value,
						z.strictObject({ decision: z.literal("Unresolved") }),
					]),
		]),
	),
};
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
							"emojiOutput",
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
const { promptRegistrations } = await import(
	"../src/concrete-lang/de/experiments.js"
);
await emit(
	"prompts.ts",
	`// Generated from explicitly selected demonstrations, never held-out cases.\nexport const prompts:Readonly<Record<string,string>>=${JSON.stringify(Object.fromEntries(promptRegistrations.filter(({ promptSource }) => !promptSource.route.startsWith("knowledge-analysis/") || promptSource.route.startsWith("knowledge-analysis/de/")).map(({ promptSource }) => [promptSource.route, assembleSystemPrompt(promptSource)])))};\nexport const grammarPromptRoutes:Readonly<Record<string,string>>=${JSON.stringify(Object.fromEntries(routes.filter((route) => route.language === "de").map((route) => [route.key, `grammatical-resolution/${route.modulePath.replace(/\.js$/, "")}`])))};`,
);

import { fileURLToPath } from "node:url";
import { defineCodegen, formatTypeScript, runCodegenCommand } from "codegen";
import { type DumlingRoute, dumlingRoutes } from "dumling/codegen";

const imports = dumlingRoutes.map(
	(route, index) =>
		`import * as Route${index} from "dumling/schema/${route.schemaPath}";`,
);
const schemas = (
	symbol: "lemmaSchema" | "readingSchema",
	filter: (route: DumlingRoute) => boolean = () => true,
) =>
	dumlingRoutes
		.map((route, index) => ({ ...route, index }))
		.filter(filter)
		.map(({ index }) => `Route${index}.${symbol}`)
		.join(",");
const shadows = (filter: (route: DumlingRoute) => boolean = () => true) =>
	dumlingRoutes
		.map((route, index) => ({ ...route, index }))
		.filter(filter)
		.map(
			({ index }) =>
				`z.strictObject({language:Route${index}.lemmaSchema.shape.language,canonicalForm:normalizedTextSchema,family:Route${index}.lemmaSchema.shape.family,kind:Route${index}.lemmaSchema.shape.kind})`,
		)
		.join(",");
// Spelled out per route: omitting canonicalForm from the union's options
// makes the checker resolve omit against every option at once.
const knowledgeRoutes = () =>
	dumlingRoutes
		.map(
			(_, index) =>
				`z.strictObject({language:Route${index}.lemmaSchema.shape.language,family:Route${index}.lemmaSchema.shape.family,kind:Route${index}.lemmaSchema.shape.kind})`,
		)
		.join(",");
// Keyed by language so each language's complement vocabulary names its own
// ADP Lemmas.
const adpositionLemmas = () =>
	dumlingRoutes
		.map((route, index) => ({ ...route, index }))
		.filter(({ family, kind }) => family === "Lexeme" && kind === "ADP")
		.map(({ language, index }) => `${language}:Route${index}.lemmaSchema`)
		.join(",");
const source = `// Generated from Dumling concrete schema exports. Run bun run generate.\nimport {z} from "zod";\nimport {normalizeForm} from "dumling";\n${imports.join("\n")}\nconst normalizedTextSchema=z.string().overwrite(normalizeForm).min(1);\nexport const lemmaSchema=z.union([${schemas("lemmaSchema")}]);\nexport const readingSchema=z.union([${schemas("readingSchema")}]);\nexport const adpositionLemmaSchemas={${adpositionLemmas()}};\nexport const verbLemmaSchema=z.union([${schemas("lemmaSchema", ({ family, kind }) => family === "Lexeme" && kind === "VERB")}]);\nexport const morphemeReadingSchema=z.union([${schemas("readingSchema", ({ family }) => family === "Morpheme")}]);\nexport const unitShadowSchema=z.union([${shadows()}]);\nexport const lexicalUnitShadowSchema=z.union([${shadows(({ family }) => family !== "Morpheme")}]);\nexport const lexemeUnitShadowSchema=z.union([${shadows(({ family }) => family === "Lexeme")}]);\nexport const knowledgeRouteSchema=z.union([${knowledgeRoutes()}]);\n`;
const generated = new URL("../src/generated/", import.meta.url);
const recipe = defineCodegen({
	inputs: {},
	outputs: { generated: { root: fileURLToPath(generated) } },
	build: async () => [
		{
			id: "dumling-schemas",
			to: { target: "generated", path: "dumling-schemas.ts" },
			content: await formatTypeScript(
				source,
				new URL("dumling-schemas.ts", generated),
			),
			provenance: [],
			meta: null,
		},
	],
});
await runCodegenCommand(recipe, { label: "Dumrel Dumling schemas" });

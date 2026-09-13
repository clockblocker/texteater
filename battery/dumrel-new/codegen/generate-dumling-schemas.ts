import { readdir, readFile, writeFile } from "node:fs/promises";
import { formatTypeScript } from "./format-typescript.js";

const root = new URL(
	"../../dumling-new/src/generated/schemas/",
	import.meta.url,
);
const paths = (await readdir(root, { recursive: true }))
	.filter((path) => path.endsWith(".ts"))
	.map((path) => path.replace(/\.ts$/, ""))
	.toSorted();
const imports = paths.map(
	(path, index) => `import * as Route${index} from "dumling/schema/${path}";`,
);
const route = (path: string) => {
	const [language, family, kind] = path.split("/");
	if (!language || !family || !kind)
		throw Error(`Invalid Dumling route ${path}`);
	return { language, family, kind };
};
type Route = ReturnType<typeof route>;
const schemas = (
	symbol: "lemmaSchema" | "readingSchema",
	filter: (route: Route) => boolean = () => true,
) =>
	paths
		.map((path, index) => ({ ...route(path), index }))
		.filter(filter)
		.map(({ index }) => `Route${index}.${symbol}`)
		.join(",");
const shadows = (filter: (route: Route) => boolean = () => true) =>
	paths
		.map((path, index) => ({ ...route(path), index }))
		.filter(filter)
		.map(
			({ index }) =>
				`z.strictObject({language:Route${index}.lemmaSchema.shape.language,canonicalForm:normalizedTextSchema,family:Route${index}.lemmaSchema.shape.family,kind:Route${index}.lemmaSchema.shape.kind})`,
		)
		.join(",");
const source = `// Generated from Dumling concrete schema exports. Run bun run generate.\nimport {z} from "zod";\nimport {normalizeText} from "../semantics.js";\n${imports.join("\n")}\nconst normalizedTextSchema=z.string().overwrite(normalizeText).min(1);\nexport const lemmaSchema=z.union([${schemas("lemmaSchema")}]);\nexport const readingSchema=z.union([${schemas("readingSchema")}]);\nexport const morphemeReadingSchema=z.union([${schemas("readingSchema", ({ family }) => family === "morpheme")}]);\nexport const unitShadowSchema=z.union([${shadows()}]);\nexport const lexicalUnitShadowSchema=z.union([${shadows(({ family }) => family === "lexeme" || family === "phraseme")}]);\nexport const lexemeUnitShadowSchema=z.union([${shadows(({ family }) => family === "lexeme")}]);\n`;
const output = new URL("../src/generated/dumling-schemas.ts", import.meta.url);
const formatted = await formatTypeScript(source, output);
const check = process.argv.includes("--check");
if (check) {
	if ((await readFile(output, "utf8").catch(() => "")) !== formatted)
		throw Error(
			"Stale generated Dumling schema composition; run bun run generate",
		);
} else await writeFile(output, formatted);

import { readdir } from "node:fs/promises";
import { z } from "zod";
import { buildUnitSchemas } from "../src/schemas/units.js";
import {
	ConstructionKindSchema,
	LemmaFamilySchema,
	MorphemeKindSchema,
	PhrasemeKindSchema,
	PosSchema,
	SupportedLanguageSchema,
} from "../src/schemas/universal/index.js";

const lexemeKinds: Record<string, string> = {
	adjective: "ADJ",
	adverb: "ADV",
	interjection: "INTJ",
	noun: "NOUN",
	"proper-noun": "PROPN",
	verb: "VERB",
	adposition: "ADP",
	auxiliary: "AUX",
	"coordinating-conjunction": "CCONJ",
	determiner: "DET",
	numeral: "NUM",
	particle: "PART",
	pronoun: "PRON",
	"subordinating-conjunction": "SCONJ",
	punctuation: "PUNCT",
	symbol: "SYM",
	other: "X",
};
const kindSchemas = {
	Lexeme: PosSchema,
	Phraseme: PhrasemeKindSchema,
	Morpheme: MorphemeKindSchema,
	Construction: ConstructionKindSchema,
};
export async function loadRoutes() {
	const root = new URL("../src/schemas/concrete-language/", import.meta.url);
	const files = (await readdir(root, { recursive: true }))
		.filter((path) => path.endsWith(".ts") && path.split("/").length === 3)
		.sort();
	return Promise.all(
		files.map(async (path) => {
			const [languagePart, familyPart, file] = path.split("/") as [
				string,
				string,
				string,
			];
			const language = SupportedLanguageSchema.parse(languagePart);
			const family = LemmaFamilySchema.parse(
				familyPart.charAt(0).toUpperCase() + familyPart.slice(1),
			);
			const stem = file.slice(0, -3);
			const kind = kindSchemas[family].parse(
				family === "Lexeme"
					? lexemeKinds[stem]
					: stem
							.split("-")
							.map(
								(part) =>
									part.charAt(0).toUpperCase() +
									part.slice(1),
							)
							.join(""),
			);
			const module: Record<string, unknown> = await import(
				new URL(path, root).href
			);
			const schemas = Object.values(module).filter(
				(value) => value instanceof z.ZodObject,
			);
			if (schemas.length !== 1)
				throw Error(`Expected exactly one feature-bag schema: ${path}`);
			const bag = schemas[0];
			if (!bag) throw Error(`Missing feature-bag schema: ${path}`);
			const core: unknown = bag.shape.core,
				inflectional: unknown = bag.shape.inflectional;
			if (
				!(core instanceof z.ZodType) ||
				(inflectional !== undefined &&
					!(inflectional instanceof z.ZodType))
			)
				throw Error(`Missing Feature Bags: ${path}`);
			const coordinate = { language, family, kind };
			return {
				...coordinate,
				key: `${language}/${family}/${kind}`,
				bag,
				schemas: buildUnitSchemas(coordinate, core, inflectional),
			};
		}),
	);
}
export type SourceRoute = Awaited<ReturnType<typeof loadRoutes>>[number];

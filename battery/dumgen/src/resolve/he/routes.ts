/** Hebrew grammatical routes and their Dumling-owned Surface schemas. */

import { surfaceSchema as foreign } from "dumling/schema/he/foreign/foreign";
import { surfaceSchema as adj } from "dumling/schema/he/lexeme/adjective";
import { surfaceSchema as adp } from "dumling/schema/he/lexeme/adposition";
import { surfaceSchema as adv } from "dumling/schema/he/lexeme/adverb";
import { surfaceSchema as aux } from "dumling/schema/he/lexeme/auxiliary";
import { surfaceSchema as cconj } from "dumling/schema/he/lexeme/coordinating-conjunction";
import { surfaceSchema as det } from "dumling/schema/he/lexeme/determiner";
import { surfaceSchema as intj } from "dumling/schema/he/lexeme/interjection";
import { surfaceSchema as noun } from "dumling/schema/he/lexeme/noun";
import { surfaceSchema as num } from "dumling/schema/he/lexeme/numeral";
import { surfaceSchema as part } from "dumling/schema/he/lexeme/particle";
import { surfaceSchema as pron } from "dumling/schema/he/lexeme/pronoun";
import { surfaceSchema as propn } from "dumling/schema/he/lexeme/proper-noun";
import { surfaceSchema as sconj } from "dumling/schema/he/lexeme/subordinating-conjunction";
import { surfaceSchema as sym } from "dumling/schema/he/lexeme/symbol";
import { surfaceSchema as verb } from "dumling/schema/he/lexeme/verb";
import { surfaceSchema as locutionAdv } from "dumling/schema/he/locution/adverb";
import { surfaceSchema as locutionIntj } from "dumling/schema/he/locution/interjection";
import { surfaceSchema as saying } from "dumling/schema/he/saying/saying";
import { z } from "zod";
import type { Route } from "../../segment/segmented-sentence.js";

const surfaceSchemas = [
	{ id: "Lexeme_ADJ", family: "Lexeme", kind: "ADJ", schema: adj },
	{ id: "Lexeme_ADP", family: "Lexeme", kind: "ADP", schema: adp },
	{ id: "Lexeme_ADV", family: "Lexeme", kind: "ADV", schema: adv },
	{ id: "Lexeme_AUX", family: "Lexeme", kind: "AUX", schema: aux },
	{ id: "Lexeme_CCONJ", family: "Lexeme", kind: "CCONJ", schema: cconj },
	{ id: "Lexeme_DET", family: "Lexeme", kind: "DET", schema: det },
	{ id: "Lexeme_INTJ", family: "Lexeme", kind: "INTJ", schema: intj },
	{ id: "Lexeme_NOUN", family: "Lexeme", kind: "NOUN", schema: noun },
	{ id: "Lexeme_NUM", family: "Lexeme", kind: "NUM", schema: num },
	{ id: "Lexeme_PART", family: "Lexeme", kind: "PART", schema: part },
	{ id: "Lexeme_PRON", family: "Lexeme", kind: "PRON", schema: pron },
	{ id: "Lexeme_PROPN", family: "Lexeme", kind: "PROPN", schema: propn },
	{ id: "Lexeme_SCONJ", family: "Lexeme", kind: "SCONJ", schema: sconj },
	{ id: "Lexeme_SYM", family: "Lexeme", kind: "SYM", schema: sym },
	{ id: "Lexeme_VERB", family: "Lexeme", kind: "VERB", schema: verb },
	{
		id: "Locution_ADV",
		family: "Locution",
		kind: "ADV",
		schema: locutionAdv,
	},
	{
		id: "Locution_INTJ",
		family: "Locution",
		kind: "INTJ",
		schema: locutionIntj,
	},
	{ id: "Saying_Saying", family: "Saying", kind: "Saying", schema: saying },
	{
		id: "Foreign_Foreign",
		family: "Foreign",
		kind: "Foreign",
		schema: foreign,
	},
] as const;

export function surfaceOutputSchema(
	route: Route<"he">,
): Readonly<Record<string, unknown>> {
	const found = surfaceSchemas.find(
		(candidate) =>
			candidate.family === route.family && candidate.kind === route.kind,
	);
	if (!found || route.language !== "he")
		throw Error("Unsupported Hebrew route");
	return z.toJSONSchema(
		z.object({
			emojiDescription: z.string().nullable(),
			surface: found.schema.nullable(),
		}),
		{ unrepresentable: "any", io: "input" },
	);
}

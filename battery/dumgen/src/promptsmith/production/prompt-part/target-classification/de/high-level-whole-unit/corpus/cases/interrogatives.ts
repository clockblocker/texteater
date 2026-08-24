import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import { resolved, sentence } from "./builders";

const cases = {
	"target-de-interrogative-free-wer": resolved(
		sentence(["Wer", "kommt", "heute"], "?"),
		0,
		[0],
		"Lexeme",
		"PRON",
	),
	"target-de-interrogative-free-wen": resolved(
		sentence(["Wen", "rufst", "du", "an"], "?"),
		0,
		[0],
		"Lexeme",
		"PRON",
	),
	"target-de-interrogative-free-wem": resolved(
		sentence(["Wem", "hilfst", "du", "morgen"], "?"),
		0,
		[0],
		"Lexeme",
		"PRON",
	),
	"target-de-interrogative-free-wessen": resolved(
		sentence(["Wessen", "bedarf", "es", "noch"], "?"),
		0,
		[0],
		"Lexeme",
		"PRON",
	),
	"target-de-interrogative-adnominal-wessen": resolved(
		sentence(["Wessen", "Schlüssel", "liegt", "hier"], "?"),
		0,
		[0],
		"Lexeme",
		"DET",
	),
} satisfies GoldenCaseRegistry<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema
>;

export const interrogativeCases = defineGoldenCaseCollection(import.meta.url, {
	cases,
});

import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import { resolved, sentence } from "./builders";

const wasZum = sentence(["Was", "zum"], "…?");

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
	"target-de-interrogative-partial-idiom-was-zum-click-was": {
		...resolved(wasZum, 0, [0, 2], "Phraseme", "Idiom"),
		contaminationKeys: ["target-phraseme:idiom:was-zum-teufel"],
	},
	"target-de-interrogative-partial-idiom-was-zum-click-zum": {
		...resolved(wasZum, 2, [0, 2], "Phraseme", "Idiom"),
		contaminationKeys: ["target-phraseme:idiom:was-zum-teufel"],
	},
} satisfies GoldenCaseRegistry<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema
>;

export const interrogativeCases = defineGoldenCaseCollection(import.meta.url, {
	cases,
});

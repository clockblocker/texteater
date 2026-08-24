import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import { resolved, sentence } from "./builders";

const cases = {
	"target-de-negative-pron-keiner-nom-masc": resolved(
		sentence(["Keiner", "kam"]),
		0,
		[0],
		"Lexeme",
		"PRON",
	),
	"target-de-negative-det-kein-masc": resolved(
		sentence(["kein", "Mensch"], null),
		0,
		[0],
		"Lexeme",
		"DET",
	),
	"target-de-negative-pron-keines-nom-neut": resolved(
		sentence(["Keines", "funktioniert"]),
		0,
		[0],
		"Lexeme",
		"PRON",
	),
	"target-de-negative-det-kein-neut": resolved(
		sentence(["kein", "Gerät"], null),
		0,
		[0],
		"Lexeme",
		"DET",
	),
	"target-de-negative-pron-keine-nom-plur": resolved(
		sentence(["Keine", "kamen"]),
		0,
		[0],
		"Lexeme",
		"PRON",
	),
	"target-de-negative-det-keine-plur": resolved(
		sentence(["keine", "Gäste"], null),
		0,
		[0],
		"Lexeme",
		"DET",
	),
	"target-de-negative-pron-keinen-acc": resolved(
		sentence(["Ich", "kenne", "keinen"]),
		4,
		[4],
		"Lexeme",
		"PRON",
	),
	"target-de-negative-det-keinen-acc": resolved(
		sentence(["keinen", "Menschen"], null),
		0,
		[0],
		"Lexeme",
		"DET",
	),
	"target-de-negative-pron-keinem-dat": resolved(
		sentence(["Ich", "helfe", "keinem"]),
		4,
		[4],
		"Lexeme",
		"PRON",
	),
	"target-de-negative-det-keinem-dat": resolved(
		sentence(["keinem", "Menschen"], null),
		0,
		[0],
		"Lexeme",
		"DET",
	),
	"target-de-negative-pron-nichts-subject": resolved(
		sentence(["Nichts", "fehlt", "mehr"]),
		0,
		[0],
		"Lexeme",
		"PRON",
	),
	"target-de-negative-pron-nix-subject": resolved(
		sentence(["Nix", "fehlt", "mehr"]),
		0,
		[0],
		"Lexeme",
		"PRON",
	),
	"target-de-negative-pron-nichts-object": resolved(
		sentence(["Ich", "habe", "nichts", "gefunden"]),
		4,
		[4],
		"Lexeme",
		"PRON",
	),
	"target-de-negative-pron-nix-object": resolved(
		sentence(["Das", "hilft", "nix"]),
		4,
		[4],
		"Lexeme",
		"PRON",
	),
	"target-de-negative-control-nichts-noun": resolved(
		sentence(["das", "Nichts"], null),
		2,
		[2],
		"Lexeme",
		"NOUN",
	),
	"target-de-negative-control-nicht-part": resolved(
		sentence(["nicht", "heute"], null),
		0,
		[0],
		"Lexeme",
		"PART",
	),
	"target-de-negative-control-kein-det": resolved(
		sentence(["kein", "Ergebnis"], null),
		0,
		[0],
		"Lexeme",
		"DET",
	),
} satisfies GoldenCaseRegistry<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema
>;

export const negativePronounCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases,
	},
);

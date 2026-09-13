import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const core = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"intake-de-core": {
			input: {
				items: [
					{ id: "de-clean", sourceText: "Das Haus ist groß." },
					{ id: "de-delete", sourceText: "Das H au s ist groß." },
					{ id: "de-insert", sourceText: "Ich sehe dasHaus." },
					{ id: "de-typo", sourceText: "Der Kaffe ist heiß." },
					{ id: "de-slang", sourceText: "Digga, das ist krass!" },
					{ id: "de-noisy", sourceText: "  äh\t ich   geh jetz  " },
					{ id: "de-mixed", sourceText: "Das Update ist ready." },
					{ id: "junk", sourceText: "%$#@  !!!" },
				],
			},
			idealOutput: {
				language: "de",
				items: [
					{
						id: "de-clean",
						decision: "Accepted",
						language: "de",
						stitchedText: "Das Haus ist groß.",
					},
					{
						id: "de-delete",
						decision: "Accepted",
						language: "de",
						stitchedText: "Das Haus ist groß.",
					},
					{
						id: "de-insert",
						decision: "Accepted",
						language: "de",
						stitchedText: "Ich sehe das Haus.",
					},
					{
						id: "de-typo",
						decision: "Accepted",
						language: "de",
						stitchedText: "Der Kaffe ist heiß.",
					},
					{
						id: "de-slang",
						decision: "Accepted",
						language: "de",
						stitchedText: "Digga, das ist krass!",
					},
					{
						id: "de-noisy",
						decision: "Accepted",
						language: "de",
						stitchedText: "äh ich geh jetz",
					},
					{
						id: "de-mixed",
						decision: "Accepted",
						language: "de",
						stitchedText: "Das Update ist ready.",
					},
					{
						id: "junk",
						decision: "Unintelligible",
						language: null,
						stitchedText: "%$#@ !!!",
					},
				],
			},
		},
		"intake-he-core": {
			input: {
				items: [
					{ id: "he-clean", sourceText: "אני הולך הביתה." },
					{ id: "he-insert", sourceText: "אניהולך הביתה." },
					{ id: "he-delete", sourceText: "אני הו לך הביתה." },
					{
						id: "he-noisy",
						sourceText: "  אהה\t אני   הולך הביתה  ",
					},
					{ id: "he-slang", sourceText: "מה נשמע אחי?" },
					{ id: "he-mixed", sourceText: "העדכון ready." },
					{ id: "he-typo", sourceText: "אניי הולך." },
					{ id: "junk", sourceText: "asdf qwer zxcv" },
				],
			},
			idealOutput: {
				language: "he",
				items: [
					{
						id: "he-clean",
						decision: "Accepted",
						language: "he",
						stitchedText: "אני הולך הביתה.",
					},
					{
						id: "he-insert",
						decision: "Accepted",
						language: "he",
						stitchedText: "אני הולך הביתה.",
					},
					{
						id: "he-delete",
						decision: "Accepted",
						language: "he",
						stitchedText: "אני הולך הביתה.",
					},
					{
						id: "he-noisy",
						decision: "Accepted",
						language: "he",
						stitchedText: "אהה אני הולך הביתה",
					},
					{
						id: "he-slang",
						decision: "Accepted",
						language: "he",
						stitchedText: "מה נשמע אחי?",
					},
					{
						id: "he-mixed",
						decision: "Accepted",
						language: "he",
						stitchedText: "העדכון ready.",
					},
					{
						id: "he-typo",
						decision: "Accepted",
						language: "he",
						stitchedText: "אניי הולך.",
					},
					{
						id: "junk",
						decision: "Unintelligible",
						language: null,
						stitchedText: "asdf qwer zxcv",
					},
				],
			},
		},
		"intake-unsupported": {
			input: {
				items: [
					{ id: "fr-clean", sourceText: "Je rentre à la maison." },
					{ id: "fr-noisy", sourceText: "  Je\t rentre  chez moi. " },
					{ id: "ar-clean", sourceText: "أنا ذاهب إلى البيت." },
				],
			},
			idealOutput: {
				language: null,
				items: [
					{
						id: "fr-clean",
						decision: "UnsupportedLanguage",
						language: null,
						stitchedText: "Je rentre à la maison.",
					},
					{
						id: "fr-noisy",
						decision: "UnsupportedLanguage",
						language: null,
						stitchedText: "Je rentre chez moi.",
					},
					{
						id: "ar-clean",
						decision: "UnsupportedLanguage",
						language: null,
						stitchedText: "أنا ذاهب إلى البيت.",
					},
				],
			},
		},
		"intake-de-boundary-isolation": {
			input: {
				items: [
					{ id: "left", sourceText: "Das H au" },
					{ id: "right", sourceText: "s ist groß." },
				],
			},
			idealOutput: {
				language: "de",
				items: [
					{
						id: "left",
						decision: "Accepted",
						language: "de",
						stitchedText: "Das Hau",
					},
					{
						id: "right",
						decision: "Accepted",
						language: "de",
						stitchedText: "s ist groß.",
					},
				],
			},
			explanation:
				"Whitespace repair never joins material across caller-delimited item boundaries.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

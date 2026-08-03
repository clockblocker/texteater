import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, finite, inflection } from "./builders";

export const formCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-coll-decision-present-full": {
			input: {
				markedContext:
					"Der Ausschuss <TARGET>trifft</TARGET> <TARGET>eine</TARGET> <TARGET>Entscheidung</TARGET>.",
			},
			idealOutput: finite(
				"trifft eine Entscheidung",
				"eine Entscheidung treffen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard", "Standard"],
			),
			explanation:
				"The conventional support-verb expression is non-idiomatic but lexically restricted. Its contextual Surface follows sentence order and takes the finite verb's features.",
			contaminationKeys: ["de-coll-lemma:entscheidung-treffen"],
		},
		"grammar-de-coll-betracht-citation": {
			input: {
				markedContext:
					"Wörterbucheintrag: <TARGET>in</TARGET> <TARGET>Betracht</TARGET> <TARGET>ziehen</TARGET>",
			},
			idealOutput: citation({
				normalizedSurface: "in Betracht ziehen",
				canonicalForm: "in Betracht ziehen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
			explanation:
				"An explicit dictionary entry is Citation rather than a contextual Inflection.",
			contaminationKeys: ["de-coll-lemma:betracht-ziehen"],
		},
		"grammar-de-coll-verfuegung-partial": {
			input: {
				markedContext:
					"Wir <TARGET>stellen</TARGET> die Daten zur <TARGET>Verfügung</TARGET>.",
			},
			idealOutput: finite(
				"stellen Verfügung",
				"zur Verfügung stellen",
				{ mood: "Ind", number: "Plur", person: "1", tense: "Pres" },
				["Standard", "Standard"],
				"Partial",
			),
			explanation:
				"The two marked distinctive components identify the collocation, but normalizedSurface cannot insert the unmarked zur member, so realization coverage is Partial.",
			contaminationKeys: ["de-coll-lemma:verfuegung-stellen"],
		},
		"grammar-de-coll-antrag-present-full": {
			input: {
				markedContext:
					"Sie <TARGET>stellt</TARGET> <TARGET>einen</TARGET> <TARGET>Antrag</TARGET>.",
			},
			idealOutput: finite(
				"stellt einen Antrag",
				"einen Antrag stellen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:antrag-stellen"],
		},
		"grammar-de-coll-antrag-past-full": {
			input: {
				markedContext:
					"Gestern <TARGET>stellte</TARGET> sie <TARGET>einen</TARGET> <TARGET>Antrag</TARGET>.",
			},
			idealOutput: finite(
				"stellte einen Antrag",
				"einen Antrag stellen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:antrag-stellen"],
		},
		"grammar-de-coll-kritik-present-full": {
			input: {
				markedContext:
					"Der Autor <TARGET>übt</TARGET> <TARGET>Kritik</TARGET>.",
			},
			idealOutput: finite(
				"übt Kritik",
				"Kritik üben",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:kritik-ueben"],
		},
		"grammar-de-coll-hilfe-plural-full": {
			input: {
				markedContext:
					"Die Helfer <TARGET>leisten</TARGET> <TARGET>Hilfe</TARGET>.",
			},
			idealOutput: finite(
				"leisten Hilfe",
				"Hilfe leisten",
				{ mood: "Ind", number: "Plur", person: "3", tense: "Pres" },
				["Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:hilfe-leisten"],
		},
		"grammar-de-coll-abschied-past-full": {
			input: {
				markedContext:
					"Wir <TARGET>nahmen</TARGET> <TARGET>Abschied</TARGET>.",
			},
			idealOutput: finite(
				"nahmen Abschied",
				"Abschied nehmen",
				{ mood: "Ind", number: "Plur", person: "1", tense: "Past" },
				["Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:abschied-nehmen"],
		},
		"grammar-de-coll-massnahmen-present-full": {
			input: {
				markedContext:
					"Die Regierung <TARGET>ergreift</TARGET> <TARGET>Maßnahmen</TARGET>.",
			},
			idealOutput: finite(
				"ergreift Maßnahmen",
				"Maßnahmen ergreifen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:massnahmen-ergreifen"],
		},
		"grammar-de-coll-stellung-imperative-full": {
			input: {
				markedContext:
					"<TARGET>Nimm</TARGET> endlich <TARGET>Stellung</TARGET>!",
			},
			idealOutput: inflection({
				normalizedSurface: "nimm Stellung",
				canonicalForm: "Stellung nehmen",
				memberOrthographies: ["Standard", "Standard"],
				inflectionalFeatures: {
					mood: "Imp",
					number: "Sing",
					person: "2",
					tense: null,
					verbForm: "Fin",
					voice: null,
				},
			}),
			contaminationKeys: ["de-coll-lemma:stellung-nehmen"],
		},
		"grammar-de-coll-anspruch-participle-full": {
			input: {
				markedContext:
					"Sie hat Hilfe <TARGET>in</TARGET> <TARGET>Anspruch</TARGET> <TARGET>genommen</TARGET>.",
			},
			idealOutput: inflection({
				normalizedSurface: "in Anspruch genommen",
				canonicalForm: "in Anspruch nehmen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				inflectionalFeatures: {
					aspect: null,
					gender: null,
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Part",
					voice: null,
				},
			}),
			contaminationKeys: ["de-coll-lemma:anspruch-nehmen"],
		},
		"grammar-de-coll-ausdruck-infinitive-full": {
			input: {
				markedContext:
					"Sie versucht, ihre Sorge <TARGET>zum</TARGET> <TARGET>Ausdruck</TARGET> zu <TARGET>bringen</TARGET>.",
			},
			idealOutput: inflection({
				normalizedSurface: "zum Ausdruck bringen",
				canonicalForm: "zum Ausdruck bringen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				inflectionalFeatures: {
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Inf",
					voice: null,
				},
			}),
			contaminationKeys: ["de-coll-lemma:ausdruck-bringen"],
		},
		"grammar-de-coll-einfluss-present-full": {
			input: {
				markedContext:
					"Das Wetter <TARGET>nimmt</TARGET> <TARGET>Einfluss</TARGET> auf die Planung.",
			},
			idealOutput: finite(
				"nimmt Einfluss",
				"Einfluss nehmen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:einfluss-nehmen"],
		},
		"grammar-de-coll-rolle-modified-full": {
			input: {
				markedContext:
					"Er <TARGET>spielt</TARGET> <TARGET>eine</TARGET> wichtige <TARGET>Rolle</TARGET>.",
			},
			idealOutput: finite(
				"spielt eine Rolle",
				"eine Rolle spielen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:rolle-spielen"],
		},
		"grammar-de-coll-anspruch-partial": {
			input: {
				markedContext:
					"Sie <TARGET>nimmt</TARGET> den Dienst in <TARGET>Anspruch</TARGET>.",
			},
			idealOutput: finite(
				"nimmt Anspruch",
				"in Anspruch nehmen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard"],
				"Partial",
			),
			contaminationKeys: ["de-coll-lemma:anspruch-nehmen"],
		},
		"grammar-de-coll-kritik-citation": {
			input: {
				markedContext:
					"Wörterbucheintrag: <TARGET>Kritik</TARGET> <TARGET>üben</TARGET>",
			},
			idealOutput: citation({
				normalizedSurface: "Kritik üben",
				canonicalForm: "Kritik üben",
				memberOrthographies: ["Standard", "Standard"],
			}),
			contaminationKeys: ["de-coll-lemma:kritik-ueben"],
		},
		"grammar-de-coll-hilfe-typo": {
			input: {
				markedContext:
					"Sie <TARGET>leistet</TARGET> <TARGET>Hilffe</TARGET>.",
			},
			idealOutput: finite(
				"leistet Hilfe",
				"Hilfe leisten",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Typo"],
			),
			contaminationKeys: ["de-coll-lemma:hilfe-leisten"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

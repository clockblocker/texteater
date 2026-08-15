import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
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
				["trifft", "eine", "Entscheidung"],
				"eine Entscheidung treffen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard", "Standard"],
			),
			explanation:
				"The conventional support-verb expression is non-idiomatic but lexically restricted. Its contextual Surface follows sentence order and takes the finite verb's features.",
			contaminationKeys: ["de-coll-lemma:entscheidung-treffen"],
		},
		"grammar-de-coll-frage-citation": {
			input: {
				markedContext:
					"Wörterbucheintrag: <TARGET>eine</TARGET> <TARGET>Frage</TARGET> <TARGET>stellen</TARGET>",
			},
			idealOutput: citation({
				normalizedMembers: ["eine", "Frage", "stellen"],
				canonicalForm: "eine Frage stellen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
			explanation:
				"An explicit dictionary entry is Citation rather than a contextual Inflection.",
			contaminationKeys: ["de-coll-lemma:frage-stellen"],
		},
		"grammar-de-coll-verfuegung-present-full": {
			input: {
				markedContext:
					"Wir <TARGET>stellen</TARGET> die Daten <TARGET>zur</TARGET> <TARGET>Verfügung</TARGET>.",
			},
			idealOutput: finite(
				["stellen", "zur", "Verfügung"],
				"zur Verfügung stellen",
				{ mood: "Ind", number: "Plur", person: "1", tense: "Pres" },
				["Standard", "Standard", "Standard"],
			),
			explanation:
				"Every canonical member present in the sentence is marked, while the external object remains context; the Surface is Full.",
			contaminationKeys: ["de-coll-lemma:verfuegung-stellen"],
		},
		"grammar-de-coll-anerkennung-participle-typo-full": {
			input: {
				markedContext:
					"Der Vorschlag <TARGET>hat</TARGET> <TARGET>Anerkenung</TARGET> <TARGET>gefunden</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: ["hat", "Anerkennung", "gefunden"],
				canonicalForm: "Anerkennung finden",
				memberOrthographies: ["Standard", "Typo", "Standard"],
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
			explanation:
				"The fixed perfect auxiliary is a Surface member but contributes no head morphology; the nominal typo is repaired and the support-verb head remains Partizip II.",
			contaminationKeys: ["de-coll-lemma:anerkennung-finden"],
		},
		"grammar-de-coll-antrag-present-full": {
			input: {
				markedContext:
					"Sie <TARGET>stellt</TARGET> <TARGET>einen</TARGET> <TARGET>Antrag</TARGET>.",
			},
			idealOutput: finite(
				["stellt", "einen", "Antrag"],
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
				["stellte", "einen", "Antrag"],
				"einen Antrag stellen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:antrag-stellen"],
		},
		"grammar-de-coll-vereinbarung-present-full": {
			input: {
				markedContext:
					"Die Parteien <TARGET>treffen</TARGET> <TARGET>eine</TARGET> <TARGET>Vereinbarung</TARGET>.",
			},
			idealOutput: finite(
				["treffen", "eine", "Vereinbarung"],
				"eine Vereinbarung treffen",
				{ mood: "Ind", number: "Plur", person: "3", tense: "Pres" },
				["Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:vereinbarung-treffen"],
		},
		"grammar-de-coll-abbitte-plural-full": {
			input: {
				markedContext:
					"Die Verantwortlichen <TARGET>leisten</TARGET> <TARGET>Abbitte</TARGET>.",
			},
			idealOutput: finite(
				["leisten", "Abbitte"],
				"Abbitte leisten",
				{ mood: "Ind", number: "Plur", person: "3", tense: "Pres" },
				["Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:abbitte-leisten"],
		},
		"grammar-de-coll-abschied-past-full": {
			input: {
				markedContext:
					"Wir <TARGET>nahmen</TARGET> <TARGET>Abschied</TARGET>.",
			},
			idealOutput: finite(
				["nahmen", "Abschied"],
				"Abschied nehmen",
				{ mood: "Ind", number: "Plur", person: "1", tense: "Past" },
				["Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:abschied-nehmen"],
		},
		"grammar-de-coll-zustimmung-present-full": {
			input: {
				markedContext:
					"Der Rat <TARGET>erteilt</TARGET> <TARGET>Zustimmung</TARGET>.",
			},
			idealOutput: finite(
				["erteilt", "Zustimmung"],
				"Zustimmung erteilen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:zustimmung-erteilen"],
		},
		"grammar-de-coll-ende-imperative-full": {
			input: {
				markedContext:
					"<TARGET>Komm</TARGET> endlich <TARGET>zum</TARGET> <TARGET>Ende</TARGET>!",
			},
			idealOutput: inflection({
				normalizedMembers: ["komm", "zum", "Ende"],
				canonicalForm: "zum Ende kommen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				inflectionalFeatures: {
					mood: "Imp",
					number: "Sing",
					person: "2",
					tense: null,
					verbForm: "Fin",
					voice: null,
				},
			}),
			contaminationKeys: ["de-coll-lemma:ende-kommen"],
		},
		"grammar-de-coll-anspruch-participle-full": {
			input: {
				markedContext:
					"Sie <TARGET>hat</TARGET> Hilfe <TARGET>in</TARGET> <TARGET>Anspruch</TARGET> <TARGET>genommen</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: ["hat", "in", "Anspruch", "genommen"],
				canonicalForm: "in Anspruch nehmen",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
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
				normalizedMembers: ["zum", "Ausdruck", "bringen"],
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
				["nimmt", "Einfluss"],
				"Einfluss nehmen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:einfluss-nehmen"],
		},
		"grammar-de-coll-erscheinung-modified-full": {
			input: {
				markedContext:
					"Das Problem <TARGET>tritt</TARGET> plötzlich <TARGET>in</TARGET> <TARGET>Erscheinung</TARGET>.",
			},
			idealOutput: finite(
				["tritt", "in", "Erscheinung"],
				"in Erscheinung treten",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-coll-lemma:erscheinung-treten"],
		},
		"grammar-de-coll-abschied-citation": {
			input: {
				markedContext:
					"Wörterbucheintrag: <TARGET>Abschied</TARGET> <TARGET>nehmen</TARGET>",
			},
			idealOutput: citation({
				normalizedMembers: ["Abschied", "nehmen"],
				canonicalForm: "Abschied nehmen",
				memberOrthographies: ["Standard", "Standard"],
			}),
			contaminationKeys: ["de-coll-lemma:abschied-nehmen"],
		},
		"grammar-de-coll-abbitte-typo": {
			input: {
				markedContext:
					"Sie <TARGET>leistet</TARGET> <TARGET>Abbite</TARGET>.",
			},
			idealOutput: finite(
				["leistet", "Abbitte"],
				"Abbitte leisten",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Typo"],
			),
			contaminationKeys: ["de-coll-lemma:abbitte-leisten"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

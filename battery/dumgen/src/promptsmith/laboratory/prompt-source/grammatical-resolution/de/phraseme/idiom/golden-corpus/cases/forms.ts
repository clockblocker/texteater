import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, finite, inflection } from "./builders";

export const formCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-idiom-flinte-past-full": {
			input: {
				markedContext:
					"Nach dem Rückstand <TARGET>warf</TARGET> die Trainerin <TARGET>die</TARGET> <TARGET>Flinte</TARGET> <TARGET>ins</TARGET> <TARGET>Korn</TARGET>.",
			},
			idealOutput: finite(
				["warf", "die", "Flinte", "ins", "Korn"],
				"die Flinte ins Korn werfen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard", "Standard", "Standard"],
			),
			explanation:
				"The globally figurative verbal idiom is complete despite discontinuous sentence order; its Surface follows marked textual order.",
			contaminationKeys: ["de-idiom-lemma:flinte-ins-korn-werfen"],
		},
		"grammar-de-idiom-flinte-participle-typo-full": {
			input: {
				markedContext:
					"Nach der Niederlage <TARGET>hat</TARGET> die Trainerin <TARGET>die</TARGET> <TARGET>Flintte</TARGET> <TARGET>ins</TARGET> <TARGET>Korn</TARGET> <TARGET>geworfen</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: [
					"hat",
					"die",
					"Flinte",
					"ins",
					"Korn",
					"geworfen",
				],
				canonicalForm: "die Flinte ins Korn werfen",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Typo",
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
			explanation:
				"The complete figurative Idiom includes its perfect auxiliary and one unambiguous member typo; the selected participle, not the auxiliary, determines verbForm Part.",
			contaminationKeys: ["de-idiom-lemma:flinte-ins-korn-werfen"],
		},
		"grammar-de-idiom-grass-citation": {
			input: {
				markedContext:
					"Wörterbucheintrag: <TARGET>ins</TARGET> <TARGET>Gras</TARGET> <TARGET>beißen</TARGET>",
			},
			idealOutput: citation({
				normalizedMembers: ["ins", "Gras", "beißen"],
				canonicalForm: "ins Gras beißen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
			explanation:
				"An explicitly identified dictionary form is Citation rather than contextual Inflection.",
			contaminationKeys: ["de-idiom-lemma:ins-gras-beissen"],
		},
		"grammar-de-idiom-woelfe-past-partial": {
			input: {
				markedContext:
					"Obwohl er anderer Meinung war, <TARGET>heulte</TARGET> er <TARGET>mit</TARGET> den Wölfen.",
			},
			idealOutput: finite(
				["heulte", "mit"],
				"mit den Wölfen heulen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard"],
				"Partial",
			),
			explanation:
				"This is the repository-authoritative Partial Idiom example: the selected verbal head and one fixed member form the Surface while den Wölfen remains overt but unselected.",
			contaminationKeys: ["de-idiom-lemma:mit-den-woelfen-heulen"],
		},
		"grammar-de-idiom-faeustchen-past-full": {
			input: {
				markedContext:
					"Als sie die Nachricht hörte, <TARGET>lachte</TARGET> sie <TARGET>sich</TARGET> heimlich <TARGET>ins</TARGET> <TARGET>Fäustchen</TARGET>.",
			},
			idealOutput: finite(
				["lachte", "sich", "ins", "Fäustchen"],
				"sich ins Fäustchen lachen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-idiom-lemma:sich-ins-faeustchen-lachen"],
		},
		"grammar-de-idiom-faeustchen-participle-full": {
			input: {
				markedContext:
					"Sie <TARGET>hat</TARGET> <TARGET>sich</TARGET> <TARGET>ins</TARGET> <TARGET>Fäustchen</TARGET> <TARGET>gelacht</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: [
					"hat",
					"sich",
					"ins",
					"Fäustchen",
					"gelacht",
				],
				canonicalForm: "sich ins Fäustchen lachen",
				memberOrthographies: [
					"Standard",
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
			contaminationKeys: ["de-idiom-lemma:sich-ins-faeustchen-lachen"],
		},
		"grammar-de-idiom-faeustchen-infinitive-full": {
			input: {
				markedContext:
					"Sie scheint <TARGET>sich</TARGET> <TARGET>ins</TARGET> <TARGET>Fäustchen</TARGET> zu <TARGET>lachen</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: ["sich", "ins", "Fäustchen", "lachen"],
				canonicalForm: "sich ins Fäustchen lachen",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
				inflectionalFeatures: {
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Inf",
					voice: null,
				},
			}),
			contaminationKeys: ["de-idiom-lemma:sich-ins-faeustchen-lachen"],
		},
		"grammar-de-idiom-faeustchen-typo": {
			input: {
				markedContext:
					"Sie <TARGET>lachte</TARGET> <TARGET>sich</TARGET> <TARGET>ins</TARGET> <TARGET>Fäusthen</TARGET>.",
			},
			idealOutput: finite(
				["lachte", "sich", "ins", "Fäustchen"],
				"sich ins Fäustchen lachen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard", "Typo"],
			),
			contaminationKeys: ["de-idiom-lemma:sich-ins-faeustchen-lachen"],
		},
		"grammar-de-idiom-truebsal-imperative-full": {
			input: {
				markedContext:
					"<TARGET>Blase</TARGET> nicht länger <TARGET>Trübsal</TARGET>!",
			},
			idealOutput: inflection({
				normalizedMembers: ["blase", "Trübsal"],
				canonicalForm: "Trübsal blasen",
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
			explanation:
				"The established verb-noun idiom is used as a second-person singular imperative; ordinary sentence-initial capitalization remains Standard but normalizes to lowercase, and the external negation and temporal modifier are not members.",
			contaminationKeys: ["de-idiom-lemma:truebsal-blasen"],
		},
		"grammar-de-idiom-hand-fuss-present-full": {
			input: {
				markedContext:
					"Der Plan <TARGET>hat</TARGET> <TARGET>Hand</TARGET> <TARGET>und</TARGET> <TARGET>Fuß</TARGET>.",
			},
			idealOutput: finite(
				["hat", "Hand", "und", "Fuß"],
				"Hand und Fuß haben",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				["Standard", "Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-idiom-lemma:hand-und-fuss-haben"],
		},
		"grammar-de-idiom-hand-fuss-subjunctive-full": {
			input: {
				markedContext:
					"Wenn der Plan <TARGET>Hand</TARGET> <TARGET>und</TARGET> <TARGET>Fuß</TARGET> <TARGET>hätte</TARGET>, wäre ich dafür.",
			},
			idealOutput: finite(
				["Hand", "und", "Fuß", "hätte"],
				"Hand und Fuß haben",
				{ mood: "Sub", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-idiom-lemma:hand-und-fuss-haben"],
		},
		"grammar-de-idiom-schneider-past-full": {
			input: {
				markedContext:
					"Ohne Mantel <TARGET>fror</TARGET> sie <TARGET>wie</TARGET> <TARGET>ein</TARGET> <TARGET>Schneider</TARGET>.",
			},
			idealOutput: finite(
				["fror", "wie", "ein", "Schneider"],
				"frieren wie ein Schneider",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-idiom-lemma:frieren-wie-ein-schneider"],
		},
		"grammar-de-idiom-schneider-citation": {
			input: {
				markedContext:
					"Redewendung: <TARGET>frieren</TARGET> <TARGET>wie</TARGET> <TARGET>ein</TARGET> <TARGET>Schneider</TARGET>",
			},
			idealOutput: citation({
				normalizedMembers: ["frieren", "wie", "ein", "Schneider"],
				canonicalForm: "frieren wie ein Schneider",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
			}),
			contaminationKeys: ["de-idiom-lemma:frieren-wie-ein-schneider"],
		},
		"grammar-de-idiom-bett-past-full": {
			input: {
				markedContext:
					"Wegen der Grippe <TARGET>hütete</TARGET> sie <TARGET>das</TARGET> <TARGET>Bett</TARGET>.",
			},
			idealOutput: finite(
				["hütete", "das", "Bett"],
				"das Bett hüten",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-idiom-lemma:das-bett-hueten"],
		},
		"grammar-de-idiom-fliegen-present-full": {
			input: {
				markedContext:
					"Mit derselben Maßnahme löst sie beide Probleme; damit <TARGET>schlägt</TARGET> sie <TARGET>zwei</TARGET> <TARGET>Fliegen</TARGET> <TARGET>mit</TARGET> <TARGET>einer</TARGET> <TARGET>Klappe</TARGET>.",
			},
			idealOutput: finite(
				["schlägt", "zwei", "Fliegen", "mit", "einer", "Klappe"],
				"zwei Fliegen mit einer Klappe schlagen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				[
					"Standard",
					"Standard",
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
			),
			contaminationKeys: ["de-idiom-lemma:zwei-fliegen-eine-klappe"],
		},
		"grammar-de-idiom-fliegen-participle-full": {
			input: {
				markedContext:
					"Mit einer Maßnahme <TARGET>hat</TARGET> sie beide Ziele erreicht und <TARGET>zwei</TARGET> <TARGET>Fliegen</TARGET> <TARGET>mit</TARGET> <TARGET>einer</TARGET> <TARGET>Klappe</TARGET> <TARGET>geschlagen</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: [
					"hat",
					"zwei",
					"Fliegen",
					"mit",
					"einer",
					"Klappe",
					"geschlagen",
				],
				canonicalForm: "zwei Fliegen mit einer Klappe schlagen",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
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
			contaminationKeys: ["de-idiom-lemma:zwei-fliegen-eine-klappe"],
		},
		"grammar-de-idiom-loeffel-past-full": {
			input: {
				markedContext:
					"Nach langer Krankheit starb der Schurke; am Ende <TARGET>gab</TARGET> er <TARGET>den</TARGET> <TARGET>Löffel</TARGET> <TARGET>ab</TARGET>.",
			},
			idealOutput: finite(
				["gab", "den", "Löffel", "ab"],
				"den Löffel abgeben",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-idiom-lemma:den-loeffel-abgeben"],
		},
		"grammar-de-idiom-loeffel-typo": {
			input: {
				markedContext:
					"Im Nachruf stand, dass er <TARGET>den</TARGET> <TARGET>Löfel</TARGET> <TARGET>abgab</TARGET>.",
			},
			idealOutput: finite(
				["den", "Löffel", "abgab"],
				"den Löffel abgeben",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Typo", "Standard"],
			),
			contaminationKeys: ["de-idiom-lemma:den-loeffel-abgeben"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

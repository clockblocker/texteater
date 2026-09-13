import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, finite, idiomInput, inflection } from "./builders";

const participle = {
	aspect: null,
	gender: null,
	mood: null,
	number: null,
	person: null,
	tense: null,
	verbForm: "Part",
	voice: null,
} as const;

const infinitive = {
	mood: null,
	number: null,
	person: null,
	tense: null,
	verbForm: "Inf",
	voice: null,
} as const;

export const formCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-idiom-flinte-past-full": {
			input: idiomInput(
				"Nach dem Rückstand <TARGET>warf</TARGET> die Trainerin <TARGET>die</TARGET> <TARGET>Flinte</TARGET> endgültig <TARGET>ins</TARGET> <TARGET>Korn</TARGET>.",
			),
			idealOutput: finite(
				["warf", "die", "Flinte", "ins", "Korn"],
				"die Flinte ins Korn werfen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard", "Standard", "Standard"],
			),
			contaminationKeys: ["de-idiom-lemma:flinte-ins-korn-werfen"],
		},
		"grammar-de-idiom-grass-citation": {
			input: idiomInput(
				"Im Wörterbuch steht der Eintrag <TARGET>ins</TARGET> <TARGET>Gras</TARGET> <TARGET>beißen</TARGET>.",
			),
			idealOutput: citation({
				normalizedMembers: ["ins", "Gras", "beißen"],
				canonicalForm: "ins Gras beißen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
			contaminationKeys: ["de-idiom-lemma:ins-gras-beissen"],
		},
		"grammar-de-idiom-woelfe-present-full": {
			input: idiomInput(
				"<TARGET>Heult</TARGET> nicht länger <TARGET>mit</TARGET> <TARGET>den</TARGET> <TARGET>Wölfen</TARGET>!",
			),
			idealOutput: inflection({
				normalizedMembers: ["heult", "mit", "den", "Wölfen"],
				canonicalForm: "mit den Wölfen heulen",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
				inflectionalFeatures: {
					mood: "Imp",
					number: "Plur",
					person: "2",
					tense: null,
					verbForm: "Fin",
					voice: null,
				},
			}),
			explanation:
				"Heult starts sentence. Standard spelling. Normalize verb to heult.",
			contaminationKeys: ["de-idiom-lemma:mit-den-woelfen-heulen"],
		},
		"grammar-de-idiom-teufel-wand-full": {
			input: idiomInput(
				"Kaum sprachen wir von ihr, da <TARGET>malten</TARGET> wir offenbar <TARGET>den</TARGET> <TARGET>Teufel</TARGET> <TARGET>an</TARGET> <TARGET>die</TARGET> <TARGET>Wand</TARGET>.",
			),
			idealOutput: finite(
				["malten", "den", "Teufel", "an", "die", "Wand"],
				"den Teufel an die Wand malen",
				{ mood: "Ind", number: "Plur", person: "1", tense: "Past" },
				Array(6).fill("Standard"),
			),
			contaminationKeys: ["de-idiom-lemma:teufel-an-die-wand-malen"],
		},
		"grammar-de-idiom-nase-typo-full": {
			input: idiomInput(
				"Der Praktikant <TARGET>tanzte</TARGET> dem Chef <TARGET>auf</TARGET> <TARGET>der</TARGET> <TARGET>Nahse</TARGET> <TARGET>herum</TARGET>.",
			),
			idealOutput: finite(
				["tanzte", "auf", "der", "Nase", "herum"],
				"auf der Nase herumtanzen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Standard", "Standard", "Typo", "Standard"],
			),
			explanation:
				"dem Chef is free argument. Do not add jemandem to canonicalForm.",
			contaminationKeys: ["de-idiom-lemma:auf-der-nase-herumtanzen"],
		},
		"grammar-de-idiom-handtuch-ellipsis-partial": {
			input: idiomInput(
				"Die erste Mannschaft hat das Handtuch geworfen, und später <TARGET>hat</TARGET> auch die zweite <TARGET>geworfen</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: ["hat", "geworfen"],
				canonicalForm: "das Handtuch werfen",
				memberOrthographies: ["Standard", "Standard"],
				realizationCoverage: "Partial",
				inflectionalFeatures: participle,
			}),
			explanation:
				"Second occurrence. Fixed object omitted by coordination. Meaning stays clear.",
			contaminationKeys: ["de-idiom-lemma:das-handtuch-werfen"],
		},
		"grammar-de-idiom-was-zum-truncation-partial": {
			input: idiomInput("<TARGET>Was</TARGET> <TARGET>zum</TARGET> …?"),
			idealOutput: citation({
				normalizedMembers: ["was", "zum"],
				canonicalForm: "was zum Teufel",
				memberOrthographies: ["Standard", "Standard"],
				realizationCoverage: "Partial",
			}),
			explanation:
				"Conventional truncation. Was + zum identify the exact Idiom; Teufel is unrealized fixed material.",
			contaminationKeys: ["de-idiom-lemma:was-zum-teufel"],
		},
		"grammar-de-idiom-faeustchen-perfect-full": {
			input: idiomInput(
				"Nach der überraschenden Nachricht <TARGET>hat</TARGET> sie <TARGET>sich</TARGET> heimlich <TARGET>ins</TARGET> <TARGET>Fäustchen</TARGET> <TARGET>gelacht</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: [
					"hat",
					"sich",
					"ins",
					"Fäustchen",
					"gelacht",
				],
				canonicalForm: "sich ins Fäustchen lachen",
				memberOrthographies: Array(5).fill("Standard"),
				inflectionalFeatures: participle,
			}),
			contaminationKeys: ["de-idiom-lemma:sich-ins-faeustchen-lachen"],
		},
		"grammar-de-idiom-truebsal-imperative-full": {
			input: idiomInput(
				"<TARGET>Blase</TARGET> jetzt nicht länger <TARGET>Trübsal</TARGET>!",
			),
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
			contaminationKeys: ["de-idiom-lemma:truebsal-blasen"],
		},
		"grammar-de-idiom-hand-fuss-subjunctive-full": {
			input: idiomInput(
				"Wenn der Vorschlag <TARGET>Hand</TARGET> <TARGET>und</TARGET> <TARGET>Fuß</TARGET> <TARGET>hätte</TARGET>, stimmte ich zu.",
			),
			idealOutput: finite(
				["Hand", "und", "Fuß", "hätte"],
				"Hand und Fuß haben",
				{ mood: "Sub", number: "Sing", person: "3", tense: "Past" },
				Array(4).fill("Standard"),
			),
			contaminationKeys: ["de-idiom-lemma:hand-und-fuss-haben"],
		},
		"grammar-de-idiom-schneider-past-full": {
			input: idiomInput(
				"Ohne Mantel <TARGET>fror</TARGET> sie <TARGET>wie</TARGET> <TARGET>ein</TARGET> <TARGET>Schneider</TARGET>.",
			),
			idealOutput: finite(
				["fror", "wie", "ein", "Schneider"],
				"frieren wie ein Schneider",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				Array(4).fill("Standard"),
			),
			contaminationKeys: ["de-idiom-lemma:frieren-wie-ein-schneider"],
		},
		"grammar-de-idiom-fliegen-present-full": {
			input: idiomInput(
				"Mit derselben Maßnahme <TARGET>schlägt</TARGET> sie <TARGET>zwei</TARGET> <TARGET>Fliegen</TARGET> <TARGET>mit</TARGET> <TARGET>einer</TARGET> <TARGET>Klappe</TARGET>.",
			),
			idealOutput: finite(
				["schlägt", "zwei", "Fliegen", "mit", "einer", "Klappe"],
				"zwei Fliegen mit einer Klappe schlagen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				Array(6).fill("Standard"),
			),
			contaminationKeys: ["de-idiom-lemma:zwei-fliegen-eine-klappe"],
		},
		"grammar-de-idiom-loeffel-typo-full": {
			input: idiomInput(
				"Im Nachruf stand, dass er <TARGET>den</TARGET> <TARGET>Löfel</TARGET> schließlich <TARGET>abgab</TARGET>.",
			),
			idealOutput: finite(
				["den", "Löffel", "abgab"],
				"den Löffel abgeben",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				["Standard", "Typo", "Standard"],
			),
			contaminationKeys: ["de-idiom-lemma:den-loeffel-abgeben"],
		},
		"grammar-de-idiom-kalte-schulter-future-full": {
			input: idiomInput(
				"Morgen <TARGET>wird</TARGET> sie ihm wohl <TARGET>die</TARGET> <TARGET>kalte</TARGET> <TARGET>Schulter</TARGET> <TARGET>zeigen</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: [
					"wird",
					"die",
					"kalte",
					"Schulter",
					"zeigen",
				],
				canonicalForm: "die kalte Schulter zeigen",
				memberOrthographies: Array(5).fill("Standard"),
				inflectionalFeatures: infinitive,
			}),
			contaminationKeys: ["de-idiom-lemma:kalte-schulter-zeigen"],
		},
		"grammar-de-idiom-fettnaepfchen-infinitive-full": {
			input: idiomInput(
				"Er versucht, nicht wieder <TARGET>ins</TARGET> <TARGET>Fettnäpfchen</TARGET> zu <TARGET>treten</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: ["ins", "Fettnäpfchen", "treten"],
				canonicalForm: "ins Fettnäpfchen treten",
				memberOrthographies: Array(3).fill("Standard"),
				inflectionalFeatures: infinitive,
			}),
			contaminationKeys: ["de-idiom-lemma:ins-fettnaepfchen-treten"],
		},
		"grammar-de-idiom-tomaten-present-full": {
			input: idiomInput(
				"Du <TARGET>hast</TARGET> heute wohl <TARGET>Tomaten</TARGET> <TARGET>auf</TARGET> <TARGET>den</TARGET> <TARGET>Augen</TARGET>.",
			),
			idealOutput: finite(
				["hast", "Tomaten", "auf", "den", "Augen"],
				"Tomaten auf den Augen haben",
				{ mood: "Ind", number: "Sing", person: "2", tense: "Pres" },
				Array(5).fill("Standard"),
			),
			contaminationKeys: ["de-idiom-lemma:tomaten-auf-den-augen-haben"],
		},
		"grammar-de-idiom-nagel-passive-full": {
			input: idiomInput(
				"Mit dieser Diagnose <TARGET>wurde</TARGET> <TARGET>der</TARGET> <TARGET>Nagel</TARGET> genau <TARGET>auf</TARGET> <TARGET>den</TARGET> <TARGET>Kopf</TARGET> <TARGET>getroffen</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: [
					"wurde",
					"der",
					"Nagel",
					"auf",
					"den",
					"Kopf",
					"getroffen",
				],
				canonicalForm: "den Nagel auf den Kopf treffen",
				memberOrthographies: Array(7).fill("Standard"),
				inflectionalFeatures: { ...participle, voice: "Pass" },
			}),
			contaminationKeys: ["de-idiom-lemma:nagel-auf-den-kopf-treffen"],
		},
		"grammar-de-idiom-zunge-im-zaum-infinitive-full": {
			input: idiomInput(
				"Sie versprach, künftig <TARGET>die</TARGET> <TARGET>Zunge</TARGET> <TARGET>im</TARGET> <TARGET>Zaum</TARGET> zu <TARGET>halten</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: ["die", "Zunge", "im", "Zaum", "halten"],
				canonicalForm: "die Zunge im Zaum halten",
				memberOrthographies: Array(5).fill("Standard"),
				inflectionalFeatures: infinitive,
			}),
			contaminationKeys: ["de-idiom-lemma:zunge-im-zaum-halten"],
		},
		"grammar-de-idiom-dick-duenn-past-full": {
			input: idiomInput(
				"Die Freunde <TARGET>gingen</TARGET> gemeinsam <TARGET>durch</TARGET> <TARGET>dick</TARGET> <TARGET>und</TARGET> <TARGET>dünn</TARGET>.",
			),
			idealOutput: finite(
				["gingen", "durch", "dick", "und", "dünn"],
				"durch dick und dünn gehen",
				{ mood: "Ind", number: "Plur", person: "3", tense: "Past" },
				Array(5).fill("Standard"),
			),
			contaminationKeys: ["de-idiom-lemma:durch-dick-und-duenn-gehen"],
		},
		"grammar-de-idiom-faden-perfect-full": {
			input: idiomInput(
				"Mitten in der Erklärung <TARGET>hat</TARGET> er völlig <TARGET>den</TARGET> <TARGET>Faden</TARGET> <TARGET>verloren</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: ["hat", "den", "Faden", "verloren"],
				canonicalForm: "den Faden verlieren",
				memberOrthographies: Array(4).fill("Standard"),
				inflectionalFeatures: participle,
			}),
			contaminationKeys: ["de-idiom-lemma:den-faden-verlieren"],
		},
		"grammar-de-idiom-ohr-present-full": {
			input: idiomInput(
				"Der Verkäufer <TARGET>haut</TARGET> die Kundschaft ständig <TARGET>übers</TARGET> <TARGET>Ohr</TARGET>.",
			),
			idealOutput: finite(
				["haut", "übers", "Ohr"],
				"übers Ohr hauen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				Array(3).fill("Standard"),
			),
			contaminationKeys: ["de-idiom-lemma:uebers-ohr-hauen"],
		},
		"grammar-de-idiom-kuerzeren-ellipsis-partial": {
			input: idiomInput(
				"Im ersten Duell hat Anna den Kürzeren gezogen; im zweiten <TARGET>hat</TARGET> auch Ben <TARGET>gezogen</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: ["hat", "gezogen"],
				canonicalForm: "den Kürzeren ziehen",
				memberOrthographies: ["Standard", "Standard"],
				realizationCoverage: "Partial",
				inflectionalFeatures: participle,
			}),
			explanation:
				"Second occurrence. Fixed object omitted. Parallel clause identifies idiom.",
			contaminationKeys: ["de-idiom-lemma:den-kuerzeren-ziehen"],
		},
		"grammar-de-idiom-bett-literal-figurative-full": {
			input: idiomInput(
				"Während der Wärter das historische Bett hütete, <TARGET>hütete</TARGET> die kranke Kuratorin <TARGET>das</TARGET> <TARGET>Bett</TARGET>.",
			),
			idealOutput: finite(
				["hütete", "das", "Bett"],
				"das Bett hüten",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				Array(3).fill("Standard"),
			),
			explanation:
				"First phrase literal. Marked second phrase means staying in bed ill.",
			contaminationKeys: ["de-idiom-lemma:das-bett-hueten"],
		},
		"grammar-de-idiom-wolke-present-full": {
			input: idiomInput(
				"Das Sprichwort Morgenstund hat Gold im Mund half ihm nicht; seit der Zusage <TARGET>schwebt</TARGET> er trotzdem <TARGET>auf</TARGET> <TARGET>Wolke</TARGET> <TARGET>sieben</TARGET>.",
			),
			idealOutput: finite(
				["schwebt", "auf", "Wolke", "sieben"],
				"auf Wolke sieben schweben",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Pres" },
				Array(4).fill("Standard"),
			),
			contaminationKeys: ["de-idiom-lemma:auf-wolke-sieben-schweben"],
		},
		"grammar-de-idiom-wolken-past-full": {
			input: idiomInput(
				"Nach dem Aphorismus über die Hoffnung <TARGET>fiel</TARGET> sie bei der Absage <TARGET>aus</TARGET> <TARGET>allen</TARGET> <TARGET>Wolken</TARGET>.",
			),
			idealOutput: finite(
				["fiel", "aus", "allen", "Wolken"],
				"aus allen Wolken fallen",
				{ mood: "Ind", number: "Sing", person: "3", tense: "Past" },
				Array(4).fill("Standard"),
			),
			contaminationKeys: ["de-idiom-lemma:aus-allen-wolken-fallen"],
		},
		"grammar-de-idiom-katze-perfect-full": {
			input: idiomInput(
				"Nach der Formel „Guten Morgen“ <TARGET>hat</TARGET> sie ohne Prüfung <TARGET>die</TARGET> <TARGET>Katze</TARGET> <TARGET>im</TARGET> <TARGET>Sack</TARGET> <TARGET>gekauft</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: [
					"hat",
					"die",
					"Katze",
					"im",
					"Sack",
					"gekauft",
				],
				canonicalForm: "die Katze im Sack kaufen",
				memberOrthographies: Array(6).fill("Standard"),
				inflectionalFeatures: participle,
			}),
			contaminationKeys: ["de-idiom-lemma:katze-im-sack-kaufen"],
		},
		"grammar-de-idiom-kirche-imperative-full": {
			input: idiomInput(
				"Nachdem der Ausschuss eine Entscheidung getroffen hat, <TARGET>lass</TARGET> bitte <TARGET>die</TARGET> <TARGET>Kirche</TARGET> <TARGET>im</TARGET> <TARGET>Dorf</TARGET>!",
			),
			idealOutput: inflection({
				normalizedMembers: ["lass", "die", "Kirche", "im", "Dorf"],
				canonicalForm: "die Kirche im Dorf lassen",
				memberOrthographies: Array(5).fill("Standard"),
				inflectionalFeatures: {
					mood: "Imp",
					number: "Sing",
					person: "2",
					tense: null,
					verbForm: "Fin",
					voice: null,
				},
			}),
			contaminationKeys: ["de-idiom-lemma:kirche-im-dorf-lassen"],
		},
		"grammar-de-idiom-blatt-future-full": {
			input: idiomInput(
				"Morgen <TARGET>wird</TARGET> sie wohl <TARGET>kein</TARGET> <TARGET>Blatt</TARGET> <TARGET>vor</TARGET> <TARGET>den</TARGET> <TARGET>Mund</TARGET> <TARGET>nehmen</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: [
					"wird",
					"kein",
					"Blatt",
					"vor",
					"den",
					"Mund",
					"nehmen",
				],
				canonicalForm: "kein Blatt vor den Mund nehmen",
				memberOrthographies: Array(7).fill("Standard"),
				inflectionalFeatures: infinitive,
			}),
			contaminationKeys: [
				"de-idiom-lemma:kein-blatt-vor-den-mund-nehmen",
			],
		},
		"grammar-de-idiom-kopf-sand-typo-perfect": {
			input: idiomInput(
				"Trotz der Warnung <TARGET>hat</TARGET> er <TARGET>den</TARGET> <TARGET>Kopf</TARGET> weiter <TARGET>in</TARGET> <TARGET>den</TARGET> <TARGET>Sant</TARGET> <TARGET>gesteckt</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: [
					"hat",
					"den",
					"Kopf",
					"in",
					"den",
					"Sand",
					"gesteckt",
				],
				canonicalForm: "den Kopf in den Sand stecken",
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
					"Standard",
					"Typo",
					"Standard",
				],
				inflectionalFeatures: participle,
			}),
			contaminationKeys: ["de-idiom-lemma:kopf-in-den-sand-stecken"],
		},
		"grammar-de-idiom-licht-passive-full": {
			input: idiomInput(
				"Durch die Akten <TARGET>wurde</TARGET> endlich <TARGET>Licht</TARGET> <TARGET>ins</TARGET> <TARGET>Dunkel</TARGET> <TARGET>gebracht</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: [
					"wurde",
					"Licht",
					"ins",
					"Dunkel",
					"gebracht",
				],
				canonicalForm: "Licht ins Dunkel bringen",
				memberOrthographies: Array(5).fill("Standard"),
				inflectionalFeatures: { ...participle, voice: "Pass" },
			}),
			contaminationKeys: ["de-idiom-lemma:licht-ins-dunkel-bringen"],
		},
		"grammar-de-idiom-haende-present-full": {
			input: idiomInput(
				"Mit dem Umzug <TARGET>hat</TARGET> die Familie <TARGET>alle</TARGET> <TARGET>Hände</TARGET> <TARGET>voll</TARGET> zu <TARGET>tun</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: ["hat", "alle", "Hände", "voll", "tun"],
				canonicalForm: "alle Hände voll zu tun haben",
				memberOrthographies: Array(5).fill("Standard"),
				inflectionalFeatures: infinitive,
			}),
			contaminationKeys: ["de-idiom-lemma:alle-haende-voll-zu-tun-haben"],
		},
		"grammar-de-idiom-schlauch-present-full": {
			input: idiomInput(
				"Bei dieser Frage <TARGET>stehe</TARGET> ich völlig <TARGET>auf</TARGET> <TARGET>dem</TARGET> <TARGET>Schlauch</TARGET>.",
			),
			idealOutput: finite(
				["stehe", "auf", "dem", "Schlauch"],
				"auf dem Schlauch stehen",
				{ mood: "Ind", number: "Sing", person: "1", tense: "Pres" },
				Array(4).fill("Standard"),
			),
			contaminationKeys: ["de-idiom-lemma:auf-dem-schlauch-stehen"],
		},
		"grammar-de-idiom-segel-ellipsis-partial": {
			input: idiomInput(
				"Eva hat die Segel gestrichen; nach der Niederlage <TARGET>hat</TARGET> auch Tom <TARGET>gestrichen</TARGET>.",
			),
			idealOutput: inflection({
				normalizedMembers: ["hat", "gestrichen"],
				canonicalForm: "die Segel streichen",
				memberOrthographies: ["Standard", "Standard"],
				realizationCoverage: "Partial",
				inflectionalFeatures: participle,
			}),
			explanation:
				"Second occurrence. Fixed object omitted. Parallel clause identifies idiom.",
			contaminationKeys: ["de-idiom-lemma:die-segel-streichen"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

import type { Reading } from "dumling/types";
import {
	germanKnowledgeAnalysisSchema,
	germanKnowledgeGenerationInputSchema,
} from "../../../../../../knowledge-generation/de/schemas";
import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	type GoldenCaseRegistry,
} from "../../../../../assembly";

const noun = (
	canonicalForm: string,
	emojiDescription: string,
): Reading<"de"> => ({
	lemma: {
		language: "de",
		canonicalForm,
		family: "Lexeme",
		kind: "NOUN",
		coreFeatures: {
			gender:
				canonicalForm === "Bank" || canonicalForm === "Maus"
					? "Fem"
					: "Neut",
			hyph: null,
		},
	},
	emojiDescription,
});

const ordinaryVerbCore = {
	hasGovPrep: null,
	hasSepPrefix: null,
	lexicallyReflexive: null,
	verbType: null,
} as const;

const cases = {
	"combined-demo-haus-all-relations": {
		input: {
			markedContext: "Das <TARGET>Haus</TARGET> hat einen roten Giebel.",
			reading: noun("Haus", "🏠"),
			request: {
				transcription: null,
				definition: null,
				translations: { en: null },
				semanticRelations: {
					synonym: null,
					nearSynonym: null,
					antonym: null,
					hypernym: null,
					hyponym: null,
					meronym: null,
					holonym: null,
				},
			},
		},
		idealOutput: {
			transcription: "haʊ̯s",
			definition: "Gebäude, das Menschen als Wohnung dient",
			translations: { en: "house" },
			semanticRelations: {
				synonym: null,
				nearSynonym: [shadow("Gebäude", "Lexeme", "NOUN")],
				antonym: null,
				hypernym: [shadow("Gebäude", "Lexeme", "NOUN")],
				hyponym: [shadow("Einfamilienhaus", "Lexeme", "NOUN")],
				meronym: [shadow("Zimmer", "Lexeme", "NOUN")],
				holonym: [shadow("Wohnviertel", "Lexeme", "NOUN")],
			},
		},
		explanation:
			"A broad noun mask is answered as one coherent Reading update; unavailable exact synonym and antonym leaves remain null.",
	},
	"combined-demo-laufen-context": {
		input: {
			markedContext:
				"Jeden Morgen <TARGET>läuft</TARGET> sie fünf Kilometer.",
			reading: reading(
				"laufen",
				"Lexeme",
				"VERB",
				ordinaryVerbCore,
				"🏃",
			),
			request: {
				transcription: null,
				definition: null,
				translations: { en: null },
				semanticRelations: relationRequest([
					"synonym",
					"nearSynonym",
					"antonym",
					"meronym",
					"holonym",
				]),
			},
		},
		idealOutput: {
			transcription: "ˈlaʊ̯fn̩",
			definition: "sich zu Fuß in schnellem Tempo fortbewegen",
			translations: { en: "run" },
			semanticRelations: {
				synonym: null,
				nearSynonym: [shadow("rennen", "Lexeme", "VERB")],
				antonym: [shadow("stehen", "Lexeme", "VERB")],
				meronym: null,
				holonym: null,
			},
		},
	},
	"combined-demo-cconj-sparse": {
		input: {
			markedContext: "Anna <TARGET>und</TARGET> Ben kommen.",
			reading: reading(
				"und",
				"Lexeme",
				"CCONJ",
				{ conjType: null },
				"➕",
			),
			request: {
				semanticRelations: relationRequest(["synonym", "antonym"]),
			},
		},
		idealOutput: {
			semanticRelations: {
				synonym: [shadow("sowie", "Lexeme", "CCONJ")],
				antonym: [shadow("oder", "Lexeme", "CCONJ")],
			},
		},
	},
	"combined-demo-prefix-base": {
		input: {
			markedContext:
				"In <TARGET>un</TARGET>möglich verneint das Präfix die Eigenschaft.",
			reading: reading(
				"un-",
				"Morpheme",
				"Prefix",
				{ hasSepPrefix: null },
				"🚫",
			),
			request: {
				transcription: null,
				definition: null,
				translations: { en: null },
			},
		},
		idealOutput: {
			transcription: "ʊn",
			definition: "Präfix zur Verneinung oder Umkehrung",
			translations: { en: "un-" },
		},
	},
	"combined-dev-bank-finance": {
		input: {
			markedContext: "Die <TARGET>Bank</TARGET> genehmigte den Kredit.",
			reading: noun("Bank", "🏦"),
			request: baseWithRelations([
				"synonym",
				"nearSynonym",
				"antonym",
				"hypernym",
			]),
		},
		idealOutput: {
			transcription: "baŋk",
			definition: "Institut, das Geldgeschäfte und Kredite anbietet",
			translations: { en: "bank" },
			semanticRelations: {
				synonym: [shadow("Kreditinstitut", "Lexeme", "NOUN")],
				nearSynonym: [shadow("Geldinstitut", "Lexeme", "NOUN")],
				antonym: null,
				hypernym: [shadow("Finanzinstitut", "Lexeme", "NOUN")],
			},
		},
	},
	"combined-dev-bank-bench": {
		input: {
			markedContext:
				"Wir sitzen auf einer <TARGET>Bank</TARGET> im Park.",
			reading: noun("Bank", "🪑"),
			request: baseWithRelations([
				"synonym",
				"nearSynonym",
				"antonym",
				"hypernym",
			]),
		},
		idealOutput: {
			transcription: "baŋk",
			definition: "lange Sitzgelegenheit für mehrere Personen",
			translations: { en: "bench" },
			semanticRelations: {
				synonym: null,
				nearSynonym: [shadow("Sitzbank", "Lexeme", "NOUN")],
				antonym: null,
				hypernym: [shadow("Sitzmöbel", "Lexeme", "NOUN")],
			},
		},
		explanation:
			"This pair with the financial Reading exposes cross-aspect polysemy interference.",
	},
	"combined-dev-adjective": {
		input: {
			markedContext: "Das Zimmer ist sehr <TARGET>hell</TARGET>.",
			reading: reading(
				"hell",
				"Lexeme",
				"ADJ",
				{ abbr: null, foreign: null, numType: null, variant: null },
				"💡",
			),
			request: baseWithRelations(["synonym", "nearSynonym", "antonym"]),
		},
		idealOutput: {
			transcription: "hɛl",
			definition: "mit viel Licht erfüllt oder beleuchtet",
			translations: { en: "bright" },
			semanticRelations: {
				synonym: [shadow("licht", "Lexeme", "ADJ")],
				nearSynonym: [shadow("leuchtend", "Lexeme", "ADJ")],
				antonym: [shadow("dunkel", "Lexeme", "ADJ")],
			},
		},
	},
	"combined-dev-proper-noun": {
		input: {
			markedContext: "<TARGET>Berlin</TARGET> liegt an der Spree.",
			reading: reading(
				"Berlin",
				"Lexeme",
				"PROPN",
				{ abbr: null, foreign: null, gender: "Neut" },
				"🏙️",
			),
			request: baseWithRelations(["synonym", "meronym", "holonym"]),
		},
		idealOutput: {
			transcription: "bɛʁˈliːn",
			definition:
				"Hauptstadt und Bundesland der Bundesrepublik Deutschland",
			translations: { en: "Berlin" },
			semanticRelations: {
				synonym: null,
				meronym: [shadow("Mitte", "Lexeme", "PROPN")],
				holonym: [shadow("Deutschland", "Lexeme", "PROPN")],
			},
		},
	},
	"combined-dev-numeral": {
		input: {
			markedContext: "Es fehlt noch <TARGET>eins</TARGET>.",
			reading: reading(
				"eins",
				"Lexeme",
				"NUM",
				{ abbr: null, foreign: null, numType: "Card" },
				"1️⃣",
			),
			request: baseWithRelations(["synonym"]),
		},
		idealOutput: {
			transcription: "aɪ̯ns",
			definition: "Kardinalzahl mit dem Wert 1",
			translations: { en: "one" },
			semanticRelations: { synonym: [shadow("ein", "Lexeme", "NUM")] },
		},
	},
	"combined-dev-phraseme": {
		input: {
			markedContext: "Das ist <TARGET>auf jeden Fall</TARGET> richtig.",
			reading: reading(
				"auf jeden Fall",
				"Phraseme",
				"DiscourseFormula",
				{ discourseFormulaRole: "Reaction" },
				"✅",
			),
			request: baseWithRelations(["synonym", "nearSynonym", "antonym"]),
		},
		idealOutput: {
			transcription: "aʊ̯f ˈjeːdn̩ fal",
			definition: "Formel zur nachdrücklichen Bestätigung",
			translations: { en: "definitely" },
			semanticRelations: {
				synonym: [shadow("definitiv", "Lexeme", "ADV")],
				nearSynonym: [shadow("jedenfalls", "Lexeme", "ADV")],
				antonym: [
					shadow("auf keinen Fall", "Phraseme", "DiscourseFormula"),
				],
			},
		},
	},
	"combined-dev-nfc-translation-only": {
		input: {
			markedContext: "Das <TARGET>Café</TARGET> öffnet früh.",
			reading: noun("Cafe\u0301", "☕"),
			request: { translations: { en: null } },
		},
		idealOutput: { translations: { en: "café" } },
	},
	"combined-dev-multi-member-context": {
		input: {
			markedContext:
				"Die Mannschaft <TARGET>gab</TARGET> den Vorsprung <TARGET>auf</TARGET>.",
			reading: reading(
				"aufgeben",
				"Lexeme",
				"VERB",
				{ ...ordinaryVerbCore, hasSepPrefix: "auf" },
				"🏳️",
			),
			request: { definition: null, translations: { en: null } },
		},
		idealOutput: {
			definition: "den Versuch oder Widerstand beenden",
			translations: { en: "gave up" },
		},
	},
	"combined-dev-defensive-null": {
		input: {
			markedContext:
				"Das Symbol <TARGET>§</TARGET> markiert einen Paragrafen.",
			reading: reading(
				"§",
				"Lexeme",
				"SYM",
				{ foreign: null, numType: null },
				"📜",
			),
			request: { semanticRelations: relationRequest(["antonym"]) },
		},
		idealOutput: { semanticRelations: { antonym: null } },
	},
	"combined-accept-maus-animal": {
		input: {
			markedContext: "Die Katze jagt eine <TARGET>Maus</TARGET>.",
			reading: noun("Maus", "🐭"),
			request: baseWithRelations(["nearSynonym", "antonym", "hypernym"]),
		},
		idealOutput: {
			transcription: "maʊ̯s",
			definition: "kleines Nagetier mit langem Schwanz",
			translations: { en: "mouse" },
			semanticRelations: {
				nearSynonym: null,
				antonym: null,
				hypernym: [shadow("Nagetier", "Lexeme", "NOUN")],
			},
		},
	},
	"combined-accept-maus-computer": {
		input: {
			markedContext: "Bewege den Zeiger mit der <TARGET>Maus</TARGET>.",
			reading: noun("Maus", "🖱️"),
			request: baseWithRelations(["nearSynonym", "antonym", "hypernym"]),
		},
		idealOutput: {
			transcription: "maʊ̯s",
			definition:
				"Eingabegerät zum Steuern eines Zeigers auf dem Bildschirm",
			translations: { en: "mouse" },
			semanticRelations: {
				nearSynonym: null,
				antonym: null,
				hypernym: [shadow("Eingabegerät", "Lexeme", "NOUN")],
			},
		},
	},
	"combined-accept-fusion-base": {
		input: {
			markedContext: "Wir treffen uns <TARGET>im</TARGET> Park.",
			reading: reading("im", "Construction", "Fusion", {}, "🔗"),
			request: {
				transcription: null,
				definition: null,
				translations: { en: null },
			},
		},
		idealOutput: {
			transcription: "ɪm",
			definition: "Verschmelzung der Präposition in mit dem Artikel dem",
			translations: { en: "in the" },
		},
	},
	"combined-accept-all-null": {
		input: {
			markedContext:
				"Die Abkürzung <TARGET>u. a.</TARGET> steht in der Liste.",
			reading: reading(
				"u. a.",
				"Lexeme",
				"ADV",
				{ foreign: null, numType: null, pronType: null },
				"❔",
			),
			request: {
				semanticRelations: relationRequest([
					"synonym",
					"nearSynonym",
					"antonym",
				]),
			},
		},
		idealOutput: {
			semanticRelations: {
				synonym: null,
				nearSynonym: null,
				antonym: null,
			},
		},
	},
} as const satisfies GoldenCaseRegistry<
	typeof germanKnowledgeGenerationInputSchema,
	typeof germanKnowledgeAnalysisSchema
>;

const demonstrations = defineGoldenCaseCollection(import.meta.url, {
	cases: pick(cases, [
		"combined-demo-haus-all-relations",
		"combined-demo-laufen-context",
		"combined-demo-cconj-sparse",
		"combined-demo-prefix-base",
	]),
});

const development = defineGoldenCaseCollection(import.meta.url, {
	cases: pick(cases, [
		"combined-dev-bank-finance",
		"combined-dev-bank-bench",
		"combined-dev-adjective",
		"combined-dev-proper-noun",
		"combined-dev-numeral",
		"combined-dev-phraseme",
		"combined-dev-nfc-translation-only",
		"combined-dev-multi-member-context",
		"combined-dev-defensive-null",
	]),
});

const acceptance = defineGoldenCaseCollection(import.meta.url, {
	cases: pick(cases, [
		"combined-accept-maus-animal",
		"combined-accept-maus-computer",
		"combined-accept-fusion-base",
		"combined-accept-all-null",
	]),
});

export const corpus = defineGoldenCorpus({
	route: "knowledge-analysis/de/combined",
	inputSchema: germanKnowledgeGenerationInputSchema,
	outputSchema: germanKnowledgeAnalysisSchema,
	collections: { demonstrations, development, acceptance },
});

function shadow(canonicalForm: string, family: string, kind: string) {
	return { language: "de" as const, canonicalForm, family, kind };
}

function reading(
	canonicalForm: string,
	family: string,
	kind: string,
	coreFeatures: object,
	emojiDescription: string,
): Reading<"de"> {
	return {
		lemma: {
			language: "de",
			canonicalForm,
			family,
			kind,
			coreFeatures,
		} as Reading<"de">["lemma"],
		emojiDescription,
	};
}

function relationRequest<const Relation extends string>(
	relations: readonly Relation[],
) {
	return Object.fromEntries(
		relations.map((relation) => [relation, null]),
	) as Record<Relation, null>;
}

function baseWithRelations<const Relation extends string>(
	relations: readonly Relation[],
) {
	return {
		transcription: null,
		definition: null,
		translations: { en: null },
		semanticRelations: relationRequest(relations),
	} as const;
}

function pick<
	Registry extends Record<string, object>,
	Key extends keyof Registry,
>(registry: Registry, keys: readonly Key[]): Pick<Registry, Key> {
	return Object.fromEntries(keys.map((key) => [key, registry[key]])) as Pick<
		Registry,
		Key
	>;
}

import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { particleCase, unmarkedCore } from "./builders";

const negativeCore = { ...unmarkedCore, polarity: "Neg" } as const;
const positiveCore = { ...unmarkedCore, polarity: "Pos" } as const;
const infinitivalCore = { ...unmarkedCore, partType: "Inf" } as const;

export const particleCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-part-demo-negative-nicht": particleCase(
			"Heute fährt der letzte Bus <TARGET>nicht</TARGET>.",
			"nicht",
			"nicht",
			{
				coreFeatures: negativeCore,
				explanation:
					"Clause-negating nicht is PART with Polarity=Neg; the fixed route is not reconsidered.",
			},
		),
		"grammar-de-part-demo-infinitival-zu": particleCase(
			"Mina hofft, das Paket morgen <TARGET>zu</TARGET> erhalten.",
			"zu",
			"zu",
			{
				coreFeatures: infinitivalCore,
				explanation:
					"The infinitive marker has PartType=Inf and no polarity.",
			},
		),
		"grammar-de-part-demo-modal-halt": particleCase(
			"Dann warten wir <TARGET>halt</TARGET> bis Montag.",
			"halt",
			"halt",
			{
				explanation:
					"The modal particle is an uninflected Citation Surface; the codec has no modal PartType value.",
			},
		),
		"grammar-de-part-demo-focus-sogar": particleCase(
			"Lea hat <TARGET>sogar</TARGET> den schwierigen Zusatztest bestanden.",
			"sogar",
			"sogar",
			{
				explanation:
					"The supplied focus-particle route is authoritative even though the form can be analyzed differently elsewhere.",
			},
		),
		"grammar-de-part-demo-typo-ebn": particleCase(
			"Das ist <TARGET>ebn</TARGET> der entscheidende Unterschied.",
			"ebn",
			"eben",
			{
				normalizedMember: "eben",
				orthography: "Typo",
				explanation:
					"Repair the omitted letter while recording the supplied member as Typo.",
			},
		),
		"grammar-de-part-demo-archaic-nit": particleCase(
			"Das historische Wörterbuch kennzeichnet <TARGET>nit</TARGET> ausdrücklich als alte Variante von nicht.",
			"nit",
			"nicht",
			{
				spelling: "Variant",
				historicalStatus: "Archaic",
				coreFeatures: negativeCore,
				explanation:
					"The explicit lexicographic variant-of relation makes nicht the Lemma and nit its archaic Variant Surface.",
			},
		),
		"grammar-de-part-demo-distinct-archaic-ni": particleCase(
			"Das Fachlexikon führt die historische Negationspartikel <TARGET>ni</TARGET> unter einem eigenen Lemmaeintrag.",
			"ni",
			"ni",
			{
				historicalStatus: "Archaic",
				coreFeatures: negativeCore,
				explanation:
					"An explicit own-headword cue establishes a distinct archaic Lemma, so the attested form is Canonical rather than a Variant of nicht.",
			},
		),
		"grammar-de-part-demo-foreign-yes": particleCase(
			"Im deutsch-englischen Gespräch sagte sie: „Das ist <TARGET>yes</TARGET>, ganz eindeutig.“",
			"yes",
			"yes",
			{
				coreFeatures: { ...positiveCore, foreign: "Yes" },
				explanation:
					"The overt English particle keeps an English Lemma; its unchanged source-language form is Canonical relative to that Lemma, not a German Variant.",
			},
		),
		"grammar-de-part-demo-abbreviation-aff": particleCase(
			"In der Codeliste wird die affirmative Partikel mit <TARGET>aff</TARGET>. abgekürzt.",
			"aff",
			"aff.",
			{
				spelling: "Variant",
				coreFeatures: { ...positiveCore, abbr: "Yes" },
				explanation:
					"The supplied letters plus the punctuation outside TARGET identify the established abbreviation Lemma aff.; never expand its canonicalForm to the full word affirmativ.",
			},
		),

		"grammar-de-part-dev-negative-initial": particleCase(
			"<TARGET>Nicht</TARGET> jeder Vorschlag wurde angenommen.",
			"Nicht",
			"nicht",
			{ normalizedMember: "nicht", coreFeatures: negativeCore },
		),
		"grammar-de-part-dev-answer-ja": particleCase(
			"Auf die Kontrollfrage antwortete sie klar mit <TARGET>ja</TARGET>.",
			"ja",
			"ja",
			{
				coreFeatures: positiveCore,
				explanation:
					"The already-classified affirmative answer particle has Polarity=Pos rather than modal-particle null polarity.",
			},
		),
		"grammar-de-part-dev-foreign-not": particleCase(
			"Im deutsch-englischen Gespräch sagte er: „Das ist <TARGET>not</TARGET> okay.“",
			"not",
			"not",
			{
				coreFeatures: {
					...negativeCore,
					foreign: "Yes",
				},
			},
		),
		"grammar-de-part-dev-abbreviation-n": particleCase(
			"Im Transkript wurde die Partikel nicht als <TARGET>n</TARGET>. abgekürzt.",
			"n",
			"n.",
			{
				spelling: "Variant",
				coreFeatures: { ...negativeCore, abbr: "Yes" },
				explanation:
					"The period is outside the supplied member; the conventional abbreviated Lemma retains it.",
			},
		),
		"grammar-de-part-dev-modal-doch": particleCase(
			"Komm <TARGET>doch</TARGET> nach der Arbeit kurz vorbei!",
			"doch",
			"doch",
		),
		"grammar-de-part-dev-modal-denn": particleCase(
			"Wie hast du das <TARGET>denn</TARGET> so schnell geschafft?",
			"denn",
			"denn",
		),
		"grammar-de-part-dev-modal-wohl": particleCase(
			"Der Zug wird <TARGET>wohl</TARGET> erst am Abend eintreffen.",
			"wohl",
			"wohl",
		),
		"grammar-de-part-dev-modal-mal": particleCase(
			"Sieh <TARGET>mal</TARGET> im oberen Fach nach.",
			"mal",
			"mal",
		),
		"grammar-de-part-dev-modal-ja": particleCase(
			"Du kennst den Weg <TARGET>ja</TARGET> bereits.",
			"ja",
			"ja",
			{
				explanation:
					"Modal ja is clause-dependent and therefore has null polarity, unlike an affirmative answer particle.",
			},
		),
		"grammar-de-part-dev-focus-nur": particleCase(
			"Für die Reparatur braucht sie <TARGET>nur</TARGET> einen Schraubendreher.",
			"nur",
			"nur",
		),
		"grammar-de-part-dev-focus-selbst": particleCase(
			"<TARGET>Selbst</TARGET> der erfahrenste Techniker übersah den Riss.",
			"Selbst",
			"selbst",
			{ normalizedMember: "selbst" },
		),
		"grammar-de-part-dev-intensifying-sehr": particleCase(
			"Das Ergebnis ist <TARGET>sehr</TARGET> viel besser als erwartet.",
			"sehr",
			"sehr",
			{
				explanation:
					"The fixed PART route identifies the supplied intensifying particle; do not reclassify it as ADV.",
			},
		),
		"grammar-de-part-dev-answer-doch": particleCase(
			"Auf die negative Frage antwortete Pavel entschieden mit <TARGET>doch</TARGET>.",
			"doch",
			"doch",
			{ coreFeatures: positiveCore },
		),
		"grammar-de-part-dev-infinitival-beside-adp": particleCase(
			"Sie fährt zum Archiv, um die Akte <TARGET>zu</TARGET> prüfen.",
			"zu",
			"zu",
			{
				coreFeatures: infinitivalCore,
				explanation:
					"The marked infinitive particle remains PART; the earlier fusion zum is only context, not ADP membership.",
			},
		),
		"grammar-de-part-dev-focus-beside-adv": particleCase(
			"Er arbeitet heute <TARGET>bloß</TARGET> vormittags von zu Hause.",
			"bloß",
			"bloß",
			{
				explanation:
					"The supplied focus particle is PART, not the later temporal ADV vormittags.",
			},
		),
		"grammar-de-part-dev-modal-beside-sconj": particleCase(
			"Sie ist <TARGET>eben</TARGET> gegangen, weil der Bus schon kam.",
			"eben",
			"eben",
			{
				explanation:
					"The marked modal particle is PART; the unmarked weil remains SCONJ context.",
			},
		),
		"grammar-de-part-dev-modal-aber-not-cconj": particleCase(
			"Das ist <TARGET>aber</TARGET> eine erfreuliche Nachricht!",
			"aber",
			"aber",
			{
				explanation:
					"The supplied emphatic particle use is PART, not the clause-linking CCONJ homograph.",
			},
		),
		"grammar-de-part-dev-beside-verb-particle": particleCase(
			"Hör <TARGET>mal</TARGET> mit dem Lärm auf!",
			"mal",
			"mal",
			{
				explanation:
					"Only mal is the supplied PART member; the later separable VERB element auf stays outside membership.",
			},
		),
		"grammar-de-part-dev-variant-nich": particleCase(
			"Das Dialektwörterbuch bezeichnet <TARGET>nich</TARGET> als regionale Variante von nicht.",
			"nich",
			"nicht",
			{ spelling: "Variant", coreFeatures: negativeCore },
		),
		"grammar-de-part-dev-typo-dohc": particleCase(
			"Komm <TARGET>dohc</TARGET> bitte kurz herein.",
			"dohc",
			"doch",
			{ normalizedMember: "doch", orthography: "Typo" },
		),
		"grammar-de-part-dev-other-eigentlich": particleCase(
			"Was wolltest du <TARGET>eigentlich</TARGET> noch erzählen?",
			"eigentlich",
			"eigentlich",
		),

		"grammar-de-part-accept-v2-negative-nicht": particleCase(
			"Der Wartungsbericht wurde gestern <TARGET>nicht</TARGET> veröffentlicht.",
			"nicht",
			"nicht",
			{ coreFeatures: negativeCore },
		),
		"grammar-de-part-accept-v2-infinitival-zu": particleCase(
			"Die Technikerin versucht, den Fehler vor Mittag <TARGET>zu</TARGET> beheben.",
			"zu",
			"zu",
			{ coreFeatures: infinitivalCore },
		),
		"grammar-de-part-accept-v2-answer-doch": particleCase(
			"Auf die Frage, ob sie nicht teilnehmen könne, antwortete sie mit <TARGET>doch</TARGET>.",
			"doch",
			"doch",
			{ coreFeatures: positiveCore },
		),
		"grammar-de-part-accept-v2-foreign-never": particleCase(
			"Im deutsch-englischen Dialog sagte Kim: „Das würde ich <TARGET>never</TARGET> machen.“",
			"never",
			"never",
			{
				coreFeatures: {
					...negativeCore,
					foreign: "Yes",
				},
			},
		),
		"grammar-de-part-accept-v2-abbreviation-pos": particleCase(
			"In der Tag-Legende wird die positive Antwortpartikel mit <TARGET>pos</TARGET>. abgekürzt.",
			"pos",
			"pos.",
			{
				spelling: "Variant",
				coreFeatures: { ...positiveCore, abbr: "Yes" },
			},
		),
		"grammar-de-part-accept-v2-modal-bloss": particleCase(
			"Wie konnte der Schlüssel <TARGET>bloß</TARGET> hinter den Schrank geraten?",
			"bloß",
			"bloß",
		),
		"grammar-de-part-accept-v2-focus-lediglich": particleCase(
			"Die Änderung betrifft <TARGET>lediglich</TARGET> den letzten Absatz.",
			"lediglich",
			"lediglich",
		),
		"grammar-de-part-accept-v2-intensifying-gar": particleCase(
			"Die Messwerte waren <TARGET>gar</TARGET> nicht so ungewöhnlich.",
			"gar",
			"gar",
		),
		"grammar-de-part-accept-v2-modal-ja-not-intj": particleCase(
			"Der neue Ablauf ist <TARGET>ja</TARGET> deutlich einfacher als der alte.",
			"ja",
			"ja",
			{
				explanation:
					"The embedded supplied modal particle is PART with null polarity, not a standalone INTJ answer.",
			},
		),
		"grammar-de-part-accept-v2-typo-nciht": particleCase(
			"Die Datei wurde <TARGET>nciht</TARGET> rechtzeitig gespeichert.",
			"nciht",
			"nicht",
			{
				normalizedMember: "nicht",
				orthography: "Typo",
				coreFeatures: negativeCore,
			},
		),
		"grammar-de-part-accept-v2-explicit-variant-nedd": particleCase(
			"Das Regionalwörterbuch nennt <TARGET>nedd</TARGET> ausdrücklich eine Mundartvariante von nicht.",
			"nedd",
			"nicht",
			{ spelling: "Variant", coreFeatures: negativeCore },
		),
		"grammar-de-part-accept-v2-distinct-archaic-en": particleCase(
			"Das historische Lexikon führt die Negationspartikel <TARGET>en</TARGET> als selbstständiges Stichwort.",
			"en",
			"en",
			{
				historicalStatus: "Archaic",
				coreFeatures: negativeCore,
			},
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

import { zeroEndingCanonicalForm } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import { parseGermanReading } from "../../server/operationalParsing";
import {
	fixtureSurface,
	type NoteStudyDatabaseUnit,
} from "./note-study-dummy-database";

/**
 * Breakdown fixtures for the playground (ADR 0050, ADR 0051). Nothing
 * produces Breakdowns yet, so these Readings carry hand-written ones that
 * Dumrel validates. Stored parts are Lemma targets; pending parts are Unit
 * Shadows, so the Notes show partial walks and Shadow Formations.
 */

type Route = { readonly family: string; readonly kind: string };
type Piece = { readonly letters: string; readonly target?: Dumrel.LinkTarget };

const coreFeaturesByRoute: Readonly<Record<string, object>> = {
	"Lexeme/NOUN": { gender: null },
	"Lexeme/VERB": { hasSepPrefix: null },
	"Locution/ADV": { comparable: null },
	"Locution/VERB": {},
	"Morpheme/Suffix": {},
};

function lemma(
	family: string,
	kind: string,
	canonicalForm: string,
): Dumling.Lemma<"de"> {
	return parseGermanReading({
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family,
			kind,
			canonicalForm,
			coreFeatures: coreFeaturesByRoute[`${family}/${kind}`] ?? {},
		},
		emojiDescription: "🔗",
	}).lemma;
}

const noun = (canonicalForm: string) => lemma("Lexeme", "NOUN", canonicalForm);
const verb = (canonicalForm: string) => lemma("Lexeme", "VERB", canonicalForm);

function shadow(route: Route, canonicalForm: string): Dumrel.UnitShadow {
	return { language: "de", ...route, canonicalForm } as Dumrel.UnitShadow;
}

const morpheme = (kind: string, canonicalForm: string) =>
	shadow({ family: "Morpheme", kind }, canonicalForm);
const pendingNoun = (canonicalForm: string) =>
	shadow({ family: "Lexeme", kind: "NOUN" }, canonicalForm);
const pendingWord = (kind: string, canonicalForm: string) =>
	shadow({ family: "Lexeme", kind }, canonicalForm);

const link = (letters: string, target: Dumrel.LinkTarget): Piece => ({
	letters,
	target,
});
const filler = (letters: string): Piece => ({ letters });
const space = filler(" ");
const root = (letters: string) =>
	link(letters, morpheme("Root", letters.toLowerCase()));
const ending = (letters: string) =>
	link(
		letters,
		morpheme(
			"Ending",
			letters === "" ? zeroEndingCanonicalForm : `-${letters}`,
		),
	);

const KAUFEN = verb("kaufen");
const EINKAUFEN = verb("einkaufen");
const HAUS = noun("Haus");
const GAST = noun("Gast");
const ARZT = noun("Arzt");
const LAUFEN = verb("laufen");
const STUBE = noun("Stube");
const ZU_HAUSE = lemma("Locution", "ADV", "zu Hause");
/** The Notes Study's stored Suffix Lemma, so `-ung` links to a real Note. */
const UNG = lemma("Morpheme", "Suffix", "-ung");

type BreakdownFixture = {
	readonly lemma: Dumling.Lemma<"de">;
	readonly emoji: string;
	readonly definition: string;
	readonly translations: readonly [string, string];
	readonly constituents?: readonly Piece[];
	readonly morphemes?: readonly Piece[];
	readonly source?: Dumrel.LinkTarget;
};

const BREAKDOWN_FIXTURES: readonly BreakdownFixture[] = [
	{
		lemma: KAUFEN,
		emoji: "🛒",
		definition: "Etwas gegen Bezahlung erwerben.",
		translations: ["to buy", "покупать"],
		morphemes: [root("kauf"), ending("en")],
	},
	{
		lemma: EINKAUFEN,
		emoji: "🛍️",
		definition: "Waren für den täglichen Bedarf kaufen.",
		translations: ["to shop", "делать покупки"],
		constituents: [
			link("ein", morpheme("Prefix", "ein-")),
			link("kaufen", KAUFEN),
		],
	},
	{
		lemma: verb("verkaufen"),
		emoji: "💰",
		definition: "Etwas gegen Bezahlung abgeben.",
		translations: ["to sell", "продавать"],
		constituents: [
			link("ver", morpheme("Prefix", "ver-")),
			link("kaufen", KAUFEN),
		],
	},
	{
		lemma: verb("abkaufen"),
		emoji: "🤝",
		definition: "Jemandem etwas abnehmen, indem man es ihm bezahlt.",
		translations: ["to buy from someone", "купить у кого-то"],
		constituents: [
			link("ab", morpheme("Prefix", "ab-")),
			link("kaufen", KAUFEN),
		],
	},
	{
		lemma: verb("aufkaufen"),
		emoji: "📦",
		definition: "Alle vorhandenen Stücke einer Ware kaufen.",
		translations: ["to buy up", "скупать"],
		constituents: [
			link("auf", morpheme("Prefix", "auf-")),
			link("kaufen", KAUFEN),
		],
	},
	{
		lemma: verb("erkaufen"),
		emoji: "💸",
		definition: "Etwas durch Opfer oder Zugeständnisse erlangen.",
		translations: ["to purchase at a price", "покупать ценой"],
		constituents: [
			link("er", morpheme("Prefix", "er-")),
			link("kaufen", KAUFEN),
		],
	},
	{
		// The user's sketch (#1241): ein · kauf · ∅, through its Source.
		lemma: noun("Einkauf"),
		emoji: "🧺",
		definition: "Das Einkaufen von Waren für den täglichen Bedarf.",
		translations: ["shopping", "покупка"],
		source: EINKAUFEN,
	},
	{
		lemma: noun("Kauf"),
		emoji: "🤝",
		definition: "Erwerb einer Sache gegen Bezahlung.",
		translations: ["purchase", "покупка"],
		source: KAUFEN,
	},
	{
		lemma: noun("Kaufhaus"),
		emoji: "🏬",
		definition: "Großes Geschäft mit Waren aller Art.",
		translations: ["department store", "универмаг"],
		constituents: [link("Kauf", KAUFEN), link("haus", HAUS)],
	},
	{
		lemma: noun("Käufer"),
		emoji: "🧾",
		definition: "Person, die etwas kauft.",
		translations: ["buyer", "покупатель"],
		constituents: [
			link("Käuf", KAUFEN),
			link("er", morpheme("Suffix", "-er")),
		],
	},
	{
		lemma: HAUS,
		emoji: "🏠",
		definition: "Gebäude, in dem Menschen wohnen.",
		translations: ["house", "дом"],
		morphemes: [root("Haus"), ending("")],
	},
	{
		lemma: GAST,
		emoji: "🧳",
		definition: "Person, die eingeladen ist oder irgendwo zu Besuch ist.",
		translations: ["guest", "гость"],
		morphemes: [root("Gast"), ending("")],
	},
	{
		lemma: noun("Gästehaus"),
		emoji: "🏨",
		definition: "Haus, in dem Gäste untergebracht werden.",
		translations: ["guest house", "гостевой дом"],
		constituents: [
			link("Gäst", GAST),
			link("e", morpheme("Interfix", "-e-")),
			link("haus", HAUS),
		],
	},
	{
		lemma: ARZT,
		emoji: "🩺",
		definition: "Person, die Kranke behandelt.",
		translations: ["doctor", "врач"],
		morphemes: [root("Arzt"), ending("")],
	},
	{
		lemma: verb("verarzten"),
		emoji: "🩹",
		definition: "Jemanden rasch und notdürftig ärztlich versorgen.",
		translations: ["to patch up", "подлатать"],
		constituents: [
			link("ver", morpheme("Prefix", "ver-")),
			link("arzt", ARZT),
			filler("en"),
		],
	},
	{
		lemma: noun("Kohlekraftwerk"),
		emoji: "🏭",
		definition: "Kraftwerk, das Strom aus Kohle erzeugt.",
		translations: ["coal power plant", "угольная электростанция"],
		constituents: [
			link("Kohle", pendingNoun("Kohle")),
			link("kraftwerk", pendingNoun("Kraftwerk")),
		],
	},
	{
		lemma: noun("Entspannung"),
		emoji: "😌",
		definition: "Zustand, in dem man sich erholt und ruhig wird.",
		translations: ["relaxation", "расслабление"],
		constituents: [
			link("Entspann", pendingWord("VERB", "entspannen")),
			link("ung", UNG),
		],
	},
	{
		lemma: LAUFEN,
		emoji: "🏃",
		definition: "Sich schnell auf den Füßen fortbewegen.",
		translations: ["to run", "бегать"],
		morphemes: [root("lauf"), ending("en")],
	},
	{
		lemma: noun("Lauf"),
		emoji: "👟",
		definition: "Das Laufen als sportliche Übung oder Wettkampf.",
		translations: ["run", "бег"],
		source: LAUFEN,
	},
	{
		lemma: STUBE,
		emoji: "🪑",
		definition: "Wohnraum, Zimmer.",
		translations: ["room", "комната"],
		morphemes: [root("Stub"), ending("e")],
	},
	{
		lemma: noun("Wachstube"),
		emoji: "💂",
		definition: "Raum, in dem sich die Wache aufhält.",
		translations: ["guardroom", "караульное помещение"],
		constituents: [
			// DWDS splits it wachen + Stube, as the Breakdown Record does.
			link("Wach", pendingWord("VERB", "wachen")),
			link("stube", STUBE),
		],
	},
	{
		lemma: noun("Wachstube"),
		emoji: "🕯️",
		definition: "Tube, in der Wachs aufbewahrt wird.",
		translations: ["tube of wax", "тюбик воска"],
		constituents: [
			link("Wachs", pendingNoun("Wachs")),
			link("tube", pendingNoun("Tube")),
		],
	},
	{
		lemma: ZU_HAUSE,
		emoji: "🏡",
		definition: "In der eigenen Wohnung.",
		translations: ["at home", "дома"],
		constituents: [
			link("zu", pendingWord("ADP", "zu")),
			space,
			link("Hause", HAUS),
		],
	},
	{
		lemma: lemma("Locution", "VERB", "sich wie zu Hause fühlen"),
		emoji: "🛋️",
		definition: "Sich irgendwo wohl und ungezwungen fühlen.",
		translations: ["to feel at home", "чувствовать себя как дома"],
		constituents: [
			link("sich", pendingWord("VERB", "sich fühlen")),
			space,
			link("wie", pendingWord("ADV", "wie")),
			space,
			link("zu Hause", ZU_HAUSE),
			space,
			link("fühlen", pendingWord("VERB", "sich fühlen")),
		],
	},
	{
		lemma: lemma("Locution", "VERB", "den Faden verlieren"),
		emoji: "🧵",
		definition: "Beim Sprechen nicht mehr wissen, was man sagen wollte.",
		translations: ["to lose the thread", "потерять нить"],
		constituents: [
			link("den Faden", pendingNoun("Faden")),
			space,
			link("verlieren", pendingWord("VERB", "verlieren")),
		],
	},
	{
		lemma: lemma("Locution", "VERB", "da liegt der Hase im Pfeffer"),
		emoji: "🐇",
		definition: "Das ist der eigentliche Grund der Schwierigkeit.",
		translations: [
			"that's the crux of the matter",
			"вот где собака зарыта",
		],
		constituents: [
			link("da", pendingWord("ADV", "da")),
			space,
			link("liegt", pendingWord("VERB", "liegen")),
			space,
			link("der Hase", pendingNoun("Hase")),
			space,
			link("i", pendingWord("ADP", "in")),
			link("m Pfeffer", pendingNoun("Pfeffer")),
		],
	},
];

function unitFor(fixture: BreakdownFixture): NoteStudyDatabaseUnit {
	const reading = parseGermanReading({
		unitKind: "Reading",
		lemma: fixture.lemma,
		emojiDescription: fixture.emoji,
	});
	const [english, russian] = fixture.translations;
	const parsed = parseReadingKnowledge({
		source: reading,
		knowledge: {
			definition: fixture.definition,
			translations: { en: [english], ru: [russian] },
			...(fixture.constituents || fixture.morphemes
				? {
						breakdown: {
							...(fixture.constituents
								? { constituents: fixture.constituents }
								: {}),
							...(fixture.morphemes
								? { morphemes: fixture.morphemes }
								: {}),
						},
					}
				: {}),
			...(fixture.source ? { source: { target: fixture.source } } : {}),
		},
	});
	if (!parsed.success) throw parsed.error;
	return {
		reading,
		readingKey: readingIdentityKey(reading),
		lemmaKey: lemmaIdentityKey(reading.lemma),
		citationSurface: fixtureSurface(reading.lemma),
		presentationSurfaces: [],
		knowledge: parsed.value,
		personalAnnotation: "",
		occurrences: [],
	};
}

/** Runtime-validated Breakdown Readings the playground seed stores. */
export const NOTE_STUDY_BREAKDOWN_DATABASE = BREAKDOWN_FIXTURES.map(unitFor);

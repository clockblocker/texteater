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
 * Shadows, so the Notes show partial walks and Shadow Formations. Some carry
 * a hand-written Valency Frame too, so the lexical reflexive's Citation and
 * Valency Line can be judged (ADR 0052).
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
	coreFeatures: object = coreFeaturesByRoute[`${family}/${kind}`] ?? {},
): Dumling.Lemma<"de"> {
	return parseGermanReading({
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family,
			kind,
			canonicalForm,
			coreFeatures,
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
const ERINNERN = verb("erinnern");
const adposition = (canonicalForm: string) => ({
	unitKind: "Lemma" as const,
	language: "de" as const,
	family: "Lexeme" as const,
	kind: "ADP" as const,
	canonicalForm,
	coreFeatures: {},
});
/** The Notes Study's stored Suffix Lemma, so `-ung` links to a real Note. */
const UNG = lemma("Morpheme", "Suffix", "-ung");

type BreakdownFixture = {
	readonly lemma: Dumling.Lemma<"de">;
	readonly emoji: string;
	readonly definition: string;
	/** The English Translation, then the Russian one (ADR 0055). */
	readonly translations: readonly [Dumrel.Translation, Dumrel.Translation];
	readonly constituents?: readonly Piece[];
	readonly morphemes?: readonly Piece[];
	readonly source?: Dumrel.LinkTarget;
	readonly valency?: readonly Dumrel.ValencySlot[];
};

const subject: Dumrel.ValencySlot = {
	status: "Required",
	complements: [{ kind: "Case", governedCase: "Nom", referent: "Someone" }],
};

/** A lexical reflexive's Slot, after its fixed phrase's preposition if any (ADR 0052). */
const reflexive = (
	governedCase: "Acc" | "Dat",
	options: {
		readonly status?: Dumrel.ValencySlotStatus;
		readonly after?: string;
	} = {},
): Dumrel.ValencySlot => ({
	status: options.status ?? "Required",
	complements: [
		{
			kind: "Reflexive",
			governedCase,
			...(options.after
				? { preposition: adposition(options.after) }
				: {}),
		},
	],
});

const governed = (
	preposition: string,
	governedCase: "Acc" | "Dat",
	status: Dumrel.ValencySlotStatus = "Optional",
): Dumrel.ValencySlot => ({
	status,
	complements: [
		{
			kind: "Preposition",
			preposition: adposition(preposition),
			governedCase,
			referent: "Either",
		},
	],
});

const BREAKDOWN_FIXTURES: readonly BreakdownFixture[] = [
	{
		lemma: KAUFEN,
		emoji: "🛒",
		definition: "Etwas gegen Bezahlung erwerben.",
		translations: [
			[{ kind: "Text", text: "to buy" }],
			[{ kind: "Text", text: "покупать" }],
		],
		morphemes: [root("kauf"), ending("en")],
	},
	{
		lemma: EINKAUFEN,
		emoji: "🛍️",
		definition: "Waren für den täglichen Bedarf kaufen.",
		translations: [
			[{ kind: "Text", text: "to shop" }],
			[{ kind: "Text", text: "делать покупки" }],
		],
		constituents: [
			link("ein", morpheme("Prefix", "ein-")),
			link("kaufen", KAUFEN),
		],
	},
	{
		lemma: verb("verkaufen"),
		emoji: "💰",
		definition: "Etwas gegen Bezahlung abgeben.",
		translations: [
			[{ kind: "Text", text: "to sell" }],
			[{ kind: "Text", text: "продавать" }],
		],
		constituents: [
			link("ver", morpheme("Prefix", "ver-")),
			link("kaufen", KAUFEN),
		],
	},
	{
		lemma: verb("abkaufen"),
		emoji: "🤝",
		definition: "Jemandem etwas abnehmen, indem man es ihm bezahlt.",
		translations: [
			[
				{ kind: "Text", text: "to buy" },
				{ kind: "Preposition", text: "from" },
				{ kind: "Slot", text: "someone" },
			],
			[
				{ kind: "Text", text: "купить" },
				{ kind: "Preposition", text: "у" },
				{ kind: "Slot", text: "кого-то" },
			],
		],
		constituents: [
			link("ab", morpheme("Prefix", "ab-")),
			link("kaufen", KAUFEN),
		],
	},
	{
		lemma: verb("aufkaufen"),
		emoji: "📦",
		definition: "Alle vorhandenen Stücke einer Ware kaufen.",
		translations: [
			[{ kind: "Text", text: "to buy up" }],
			[{ kind: "Text", text: "скупать" }],
		],
		constituents: [
			link("auf", morpheme("Prefix", "auf-")),
			link("kaufen", KAUFEN),
		],
	},
	{
		lemma: verb("erkaufen"),
		emoji: "💸",
		definition: "Etwas durch Opfer oder Zugeständnisse erlangen.",
		translations: [
			[{ kind: "Text", text: "to purchase at a price" }],
			[{ kind: "Text", text: "покупать ценой" }],
		],
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
		translations: [
			[{ kind: "Text", text: "shopping" }],
			[{ kind: "Text", text: "покупка" }],
		],
		source: EINKAUFEN,
	},
	{
		lemma: noun("Kauf"),
		emoji: "🤝",
		definition: "Erwerb einer Sache gegen Bezahlung.",
		translations: [
			[{ kind: "Text", text: "purchase" }],
			[{ kind: "Text", text: "покупка" }],
		],
		source: KAUFEN,
	},
	{
		lemma: noun("Kaufhaus"),
		emoji: "🏬",
		definition: "Großes Geschäft mit Waren aller Art.",
		translations: [
			[{ kind: "Text", text: "department store" }],
			[{ kind: "Text", text: "универмаг" }],
		],
		constituents: [link("Kauf", KAUFEN), link("haus", HAUS)],
	},
	{
		lemma: noun("Käufer"),
		emoji: "🧾",
		definition: "Person, die etwas kauft.",
		translations: [
			[{ kind: "Text", text: "buyer" }],
			[{ kind: "Text", text: "покупатель" }],
		],
		constituents: [
			link("Käuf", KAUFEN),
			link("er", morpheme("Suffix", "-er")),
		],
	},
	{
		lemma: HAUS,
		emoji: "🏠",
		definition: "Gebäude, in dem Menschen wohnen.",
		translations: [
			[{ kind: "Text", text: "house" }],
			[{ kind: "Text", text: "дом" }],
		],
		morphemes: [root("Haus"), ending("")],
	},
	{
		lemma: GAST,
		emoji: "🧳",
		definition: "Person, die eingeladen ist oder irgendwo zu Besuch ist.",
		translations: [
			[{ kind: "Text", text: "guest" }],
			[{ kind: "Text", text: "гость" }],
		],
		morphemes: [root("Gast"), ending("")],
	},
	{
		lemma: noun("Gästehaus"),
		emoji: "🏨",
		definition: "Haus, in dem Gäste untergebracht werden.",
		translations: [
			[{ kind: "Text", text: "guest house" }],
			[{ kind: "Text", text: "гостевой дом" }],
		],
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
		translations: [
			[{ kind: "Text", text: "doctor" }],
			[{ kind: "Text", text: "врач" }],
		],
		morphemes: [root("Arzt"), ending("")],
	},
	{
		lemma: verb("verarzten"),
		emoji: "🩹",
		definition: "Jemanden rasch und notdürftig ärztlich versorgen.",
		translations: [
			[{ kind: "Text", text: "to patch up" }],
			[{ kind: "Text", text: "подлатать" }],
		],
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
		translations: [
			[{ kind: "Text", text: "coal power plant" }],
			[{ kind: "Text", text: "угольная электростанция" }],
		],
		constituents: [
			link("Kohle", pendingNoun("Kohle")),
			link("kraftwerk", pendingNoun("Kraftwerk")),
		],
	},
	{
		lemma: noun("Entspannung"),
		emoji: "😌",
		definition: "Zustand, in dem man sich erholt und ruhig wird.",
		translations: [
			[{ kind: "Text", text: "relaxation" }],
			[{ kind: "Text", text: "расслабление" }],
		],
		constituents: [
			link("Entspann", pendingWord("VERB", "entspannen")),
			link("ung", UNG),
		],
	},
	{
		lemma: LAUFEN,
		emoji: "🏃",
		definition: "Sich schnell auf den Füßen fortbewegen.",
		translations: [
			[{ kind: "Text", text: "to run" }],
			[{ kind: "Text", text: "бегать" }],
		],
		morphemes: [root("lauf"), ending("en")],
	},
	{
		lemma: noun("Lauf"),
		emoji: "👟",
		definition: "Das Laufen als sportliche Übung oder Wettkampf.",
		translations: [
			[{ kind: "Text", text: "run" }],
			[{ kind: "Text", text: "бег" }],
		],
		source: LAUFEN,
	},
	{
		lemma: STUBE,
		emoji: "🪑",
		definition: "Wohnraum, Zimmer.",
		translations: [
			[{ kind: "Text", text: "room" }],
			[{ kind: "Text", text: "комната" }],
		],
		morphemes: [root("Stub"), ending("e")],
	},
	{
		lemma: noun("Wachstube"),
		emoji: "💂",
		definition: "Raum, in dem sich die Wache aufhält.",
		translations: [
			[{ kind: "Text", text: "guardroom" }],
			[{ kind: "Text", text: "караульное помещение" }],
		],
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
		translations: [
			[{ kind: "Text", text: "tube of wax" }],
			[{ kind: "Text", text: "тюбик воска" }],
		],
		constituents: [
			link("Wachs", pendingNoun("Wachs")),
			link("tube", pendingNoun("Tube")),
		],
	},
	{
		lemma: ZU_HAUSE,
		emoji: "🏡",
		definition: "In der eigenen Wohnung.",
		translations: [
			[{ kind: "Text", text: "at home" }],
			[{ kind: "Text", text: "дома" }],
		],
		constituents: [
			link("zu", pendingWord("ADP", "zu")),
			space,
			link("Hause", HAUS),
		],
	},
	{
		lemma: lemma("Locution", "VERB", "wie zu Hause fühlen"),
		emoji: "🪞🏠😌",
		definition: "Sich irgendwo wohl und ungezwungen fühlen.",
		translations: [
			[{ kind: "Text", text: "to feel at home" }],
			[{ kind: "Text", text: "чувствовать себя как дома" }],
		],
		constituents: [
			link("wie", pendingWord("CCONJ", "wie")),
			space,
			link("zu Hause", ZU_HAUSE),
			space,
			link("fühlen", pendingWord("VERB", "fühlen")),
		],
		valency: [subject, reflexive("Acc")],
	},
	{
		lemma: ERINNERN,
		emoji: "💭",
		definition: "Jemanden dazu bringen, an etwas zu denken.",
		translations: [
			[{ kind: "Text", text: "to remind" }],
			[{ kind: "Text", text: "напоминать" }],
		],
		valency: [
			subject,
			{
				status: "Required",
				complements: [
					{ kind: "Case", governedCase: "Acc", referent: "Someone" },
				],
			},
			governed("an", "Acc", "Required"),
		],
	},
	{
		lemma: ERINNERN,
		emoji: "🪞🧠",
		definition: "Etwas im Gedächtnis haben und es wieder vor Augen sehen.",
		translations: [
			[{ kind: "Text", text: "to remember" }],
			[{ kind: "Text", text: "вспоминать" }],
		],
		valency: [subject, reflexive("Acc"), governed("an", "Acc")],
	},
	{
		lemma: verb("schämen"),
		emoji: "🪞😳",
		definition: "Ein Gefühl der Scham empfinden.",
		translations: [
			[{ kind: "Text", text: "to be ashamed" }],
			[{ kind: "Text", text: "стыдиться" }],
		],
		valency: [subject, reflexive("Acc"), governed("für", "Acc")],
	},
	{
		lemma: lemma("Lexeme", "VERB", "ausruhen", { hasSepPrefix: "aus" }),
		emoji: "🛌",
		definition: "Eine Pause machen, um wieder zu Kräften zu kommen.",
		translations: [
			[{ kind: "Text", text: "to rest" }],
			[{ kind: "Text", text: "отдыхать" }],
		],
		valency: [subject, reflexive("Acc", { status: "Optional" })],
	},
	{
		lemma: lemma("Locution", "VERB", "Sorgen machen"),
		emoji: "🪞😟",
		definition: "Sich um jemanden oder etwas sorgen.",
		translations: [
			[{ kind: "Text", text: "to worry" }],
			[{ kind: "Text", text: "беспокоиться" }],
		],
		valency: [subject, reflexive("Dat"), governed("um", "Acc")],
	},
	{
		lemma: lemma("Locution", "VERB", "es gemütlich machen"),
		emoji: "🪞🛋️",
		definition: "Sich bequem einrichten und entspannen.",
		translations: [
			[{ kind: "Text", text: "to make oneself comfortable" }],
			[{ kind: "Text", text: "устроиться поудобнее" }],
		],
		valency: [subject, reflexive("Dat")],
	},
	{
		lemma: lemma("Locution", "VERB", "außer sein"),
		emoji: "🪞😤",
		definition: "Vor Wut oder Aufregung die Fassung verloren haben.",
		translations: [
			[{ kind: "Text", text: "to be beside oneself" }],
			[{ kind: "Text", text: "быть вне себя" }],
		],
		valency: [subject, reflexive("Dat", { after: "außer" })],
	},
	{
		lemma: lemma("Locution", "VERB", "den Faden verlieren"),
		emoji: "🧵",
		definition: "Beim Sprechen nicht mehr wissen, was man sagen wollte.",
		translations: [
			[{ kind: "Text", text: "to lose the thread" }],
			[{ kind: "Text", text: "потерять нить" }],
		],
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
			[{ kind: "Text", text: "that's the crux of the matter" }],
			[{ kind: "Text", text: "вот где собака зарыта" }],
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
			...(fixture.valency ? { valency: fixture.valency } : {}),
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

import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import {
	parseGermanAttestation,
	parseGermanReading,
	parseGermanSurface,
} from "../../server/operationalParsing";
import {
	fixtureSurface,
	type NoteStudyDatabaseUnit,
} from "./note-study-dummy-database";

/**
 * A click whose Deck tells its whole story (tf-demo ADR 0011). The other
 * fixtures' occurrences are a standard word in its citation form with one
 * Reading, so their Decks deal one Card or two. Clicking `Bank` in `zur
 * Bank` deals all four, each step saying something:
 *
 * ```
 * zur Bank · zur = zu der     the Attestation owns the fused article
 * Bank · dative of            the Surface is not its Lemma's Grundform
 * Bank · 2 readings: 🏦 🪑     the Lemma holds two Readings
 * 🏦 Bank                     the Reading
 * ```
 */

const BANK = parseGermanReading({
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem" },
	},
	emojiDescription: "🏦",
}).lemma;

/** `zur` as intake stores it: its pieces, each with the word it stands for. */
const ZUR = {
	spelling: "zur",
	components: [
		{ span: "zu", surface: "zu" },
		{ span: "r", surface: "der" },
	],
};

/** The Lemma marks the gender, so the singular Surface does not. */
const DATIVE_BANK = parseGermanSurface({
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "Bank",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: { case: "Dat", gender: null, number: "Sing" },
	lemma: BANK,
});

const word = (text: string) => ({ kind: "ResolvableText", text }) as const;
const space = { kind: "Whitespace", text: " " } as const;

/** `Nach der Arbeit ging sie noch schnell zur Bank.` */
const ZUR_BANK_SEGMENTS = [
	word("Nach"),
	space,
	word("der"),
	space,
	word("Arbeit"),
	space,
	word("ging"),
	space,
	word("sie"),
	space,
	word("noch"),
	space,
	word("schnell"),
	space,
	{ ...word("zu"), surface: "zu" },
	{ ...word("r"), surface: "der" },
	space,
	word("Bank"),
	{ kind: "Punctuation", text: "." },
] as const;

const ZUR_BANK = {
	submissionKey: "notes-study:click-story:zur-bank",
	segmentedSentenceId: "notes-study:click-story:zur-bank:sentence",
	segments: ZUR_BANK_SEGMENTS,
	memberSegmentIndices: [15, 17],
	attestation: parseGermanAttestation({
		unitKind: "Attestation",
		members: [
			{ attested: "r", orthography: "Fused", fusion: ZUR, component: 1 },
			{ attested: "Bank", orthography: "Standard" },
		],
		realizationCoverage: "Full",
		articleEvidence: { kind: "Owned", member: 0 },
		valencyEvidence: [],
		surface: DATIVE_BANK,
	}),
} as const;

type ClickStoryFixture = {
	readonly emoji: string;
	readonly definition: string;
	/** The English Translation, then the Russian one (ADR 0055). */
	readonly translations: readonly [Dumrel.Translation, Dumrel.Translation];
	readonly occurrences: NoteStudyDatabaseUnit["occurrences"];
};

const BANK_READINGS: readonly ClickStoryFixture[] = [
	{
		emoji: "🏦",
		definition:
			"Unternehmen, das Geld verwahrt, verleiht und Zahlungen abwickelt.",
		translations: [
			[{ kind: "Text", text: "bank" }],
			[{ kind: "Text", text: "банк" }],
		],
		occurrences: [ZUR_BANK],
	},
	{
		emoji: "🪑",
		definition: "Sitzmöbel für mehrere Personen, oft im Freien.",
		translations: [
			[{ kind: "Text", text: "bench" }],
			[{ kind: "Text", text: "скамейка" }],
		],
		occurrences: [],
	},
];

function unitFor(fixture: ClickStoryFixture): NoteStudyDatabaseUnit {
	const reading: Dumling.Reading<"de"> = parseGermanReading({
		unitKind: "Reading",
		lemma: BANK,
		emojiDescription: fixture.emoji,
	});
	const [english, russian] = fixture.translations;
	const parsed = parseReadingKnowledge({
		source: reading,
		knowledge: {
			definition: fixture.definition,
			translations: { en: [english], ru: [russian] },
		},
	});
	if (!parsed.success) throw parsed.error;
	return {
		reading,
		readingKey: readingIdentityKey(reading),
		lemmaKey: lemmaIdentityKey(reading.lemma),
		citationSurface: fixtureSurface(reading.lemma),
		presentationSurfaces: [DATIVE_BANK],
		knowledge: parsed.value,
		personalAnnotation: "",
		occurrences: fixture.occurrences,
	};
}

/** Runtime-validated Readings behind a click whose Deck deals every Card. */
export const NOTE_STUDY_CLICK_STORY_DATABASE = BANK_READINGS.map(unitFor);

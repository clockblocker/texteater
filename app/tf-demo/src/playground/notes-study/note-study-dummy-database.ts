import {
	type Attestation,
	dumling,
	type Lemma,
	ParsingError,
	parseAsAttestation,
	parseAsReading,
	parseAsSurface,
	type Reading,
	readingFingerprint,
	type Surface,
} from "dumling";
import {
	type DirectSemanticRelation,
	inverseRelationFor,
	parseAsReadingKnowledge,
	type ReadingKnowledge,
	type SemanticRelation,
	type TranslationLanguage,
	type UnitShadow,
} from "dumrel";

import { lemmaIdentityKey } from "../../../server/linguisticIdentity";
import { NOTE_STUDY_FIXTURES } from "./fixtures";
import type {
	NoteStudyFixture,
	NoteStudyLine,
	NoteStudyToken,
} from "./note-study-fixture";

export const NOTE_STUDY_VISITOR_ID = "playground:notes-study:visitor";

type Segment = {
	readonly kind: "ResolvableText" | "Whitespace" | "Punctuation";
	readonly text: string;
};

export type NoteStudyOccurrence = {
	readonly submissionKey: string;
	readonly segmentedSentenceId: string;
	readonly segments: readonly Segment[];
	readonly memberSegmentIndices: readonly number[];
	readonly attestation: Attestation<"de">;
};

export type NoteStudyDatabaseUnit = {
	readonly reading: Reading<"de">;
	readonly readingKey: string;
	readonly lemmaKey: string;
	readonly citationSurface: Surface<"de", "Citation">;
	readonly presentationSurfaces: readonly Surface<"de", "Citation">[];
	readonly knowledge: ReadingKnowledge<TranslationLanguage>;
	readonly occurrences: readonly NoteStudyOccurrence[];
};

export type NoteStudyResolvedRelation = {
	readonly sourceReadingKey: string;
	readonly relation: SemanticRelation;
	readonly target: NoteStudyDatabaseUnit;
};

export type NoteStudyPendingRelation = {
	readonly sourceReadingKey: string;
	readonly relation: DirectSemanticRelation;
	readonly target: UnitShadow<"de">;
};

const NULL_CORE_FEATURES_BY_KIND = {
	ADJ: { abbr: null, foreign: null, numType: null, variant: null },
	ADP: {
		abbr: null,
		adpType: null,
		extPos: null,
		foreign: null,
		governedCase: null,
		partType: null,
	},
	ADV: { foreign: null, numType: null, pronType: null },
	AUX: { verbType: null },
	CCONJ: { conjType: null },
	DET: {
		definite: null,
		extPos: null,
		foreign: null,
		numType: null,
		person: null,
		polite: null,
		poss: null,
		pronType: null,
	},
	INTJ: { partType: null },
	NOUN: { gender: null, hyph: null },
	NUM: { abbr: null, foreign: null, numType: null },
	PART: { abbr: null, foreign: null, partType: null, polarity: null },
	PRON: {
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		pronType: null,
		referenceGender: null,
		referenceNumber: null,
	},
	PROPN: { abbr: null, foreign: null, gender: null },
	PUNCT: { punctType: null },
	SCONJ: { conjType: null },
	SYM: { foreign: null, numType: null },
	VERB: {
		hasGovPrep: null,
		hasSepPrefix: null,
		lexicallyReflexive: null,
		verbType: null,
	},
	X: { abbr: null, foreign: null, hyph: null, numType: null },
	Aphorism: {},
	Collocation: {},
	DiscourseFormula: { discourseFormulaRole: null },
	Idiom: {},
	Proverb: {},
	Circumfix: {},
	Clitic: {},
	Duplifix: {},
	Infix: {},
	Interfix: {},
	Prefix: { hasSepPrefix: null },
	Root: {},
	Suffix: {},
	Suffixoid: {},
	ToneMarking: {},
	Transfix: {},
	Fusion: {},
} as const;

/** Dumling identity inventory. It deliberately does not contain UI copy. */
const NOTE_STUDY_READING_IDENTITIES = [
	["Ruhig", "Lexeme", "ADJ", "ruhig", "🤫"],
	["Trotz", "Lexeme", "ADP", "trotz", "🧱"],
	["Dennoch", "Lexeme", "ADV", "dennoch", "↩️"],
	["Sein", "Lexeme", "AUX", "sein", "🔗"],
	["Aber", "Lexeme", "CCONJ", "aber", "↔️"],
	["Dieser", "Lexeme", "DET", "dieser", "👉"],
	["Ach", "Lexeme", "INTJ", "ach", "😮"],
	["Daemmerung", "Lexeme", "NOUN", "Dämmerung", "🌒"],
	["Drei", "Lexeme", "NUM", "drei", "3️⃣"],
	["Doch", "Lexeme", "PART", "doch", "💬"],
	["Einander", "Lexeme", "PRON", "einander", "🤝"],
	["Berlin", "Lexeme", "PROPN", "Berlin", "🐻"],
	["Obwohl", "Lexeme", "SCONJ", "obwohl", "↔️"],
	["%", "Lexeme", "SYM", "%", "💯"],
	["Anrufen", "Lexeme", "VERB", "anrufen", "📞"],
	["Lorem", "Lexeme", "X", "Lorem", "🧩"],
	[
		"Der-Weg-ist-das-Ziel",
		"Phraseme",
		"Aphorism",
		"Der Weg ist das Ziel",
		"🧭",
	],
	[
		"Eine-Entscheidung-treffen",
		"Phraseme",
		"Collocation",
		"eine Entscheidung treffen",
		"✅",
	],
	[
		"Wie-dem-auch-sei",
		"Phraseme",
		"DiscourseFormula",
		"Wie dem auch sei",
		"↪️",
	],
	[
		"Tomaten-auf-den-Augen-haben",
		"Phraseme",
		"Idiom",
		"Tomaten auf den Augen haben",
		"🍅",
	],
	[
		"Morgenstund-hat-Gold-im-Mund",
		"Phraseme",
		"Proverb",
		"Morgenstund hat Gold im Mund",
		"🌅",
	],
	["Ge-t", "Morpheme", "Circumfix", "ge-…-t", "🧲"],
	["Clitic-s", "Morpheme", "Clitic", "’s", "🔗"],
	["Fugen-s", "Morpheme", "Interfix", "-s-", "🌉"],
	["Un", "Morpheme", "Prefix", "un-", "🚫"],
	["Fahr", "Morpheme", "Root", "fahr", "🚲"],
	["Ung", "Morpheme", "Suffix", "-ung", "🌒"],
	["Werk", "Morpheme", "Suffixoid", "-werk", "🛠️"],
] as const;

const NOTE_STUDY_IDENTITY_BY_PRESENTATION_KEY = new Map(
	NOTE_STUDY_READING_IDENTITIES.map(
		([key, family, kind, canonicalForm, emojiDescription]) => [
			key,
			{ family, kind, canonicalForm, emojiDescription },
		],
	),
);

function unwrap<T>(value: T | ParsingError<T>, label: string): T {
	if (value instanceof ParsingError) {
		throw new Error(`${label}: ${value.message}`);
	}
	return value;
}

function readingFor(fixture: NoteStudyFixture): Reading<"de"> {
	const identity = NOTE_STUDY_IDENTITY_BY_PRESENTATION_KEY.get(
		fixture.presentationKey as (typeof NOTE_STUDY_READING_IDENTITIES)[number][0],
	);
	if (!identity)
		throw new Error(
			`Missing Notes Study identity ${fixture.presentationKey}.`,
		);
	const input = {
		lemma: {
			language: "de",
			family: identity.family,
			kind: identity.kind,
			canonicalForm: identity.canonicalForm,
			coreFeatures: NULL_CORE_FEATURES_BY_KIND[identity.kind],
		},
		emojiDescription: identity.emojiDescription,
	};
	return unwrap(
		parseAsReading(input, "de", identity.family, identity.kind),
		`Invalid Notes Study Reading ${fixture.titleText}`,
	) as Reading<"de">;
}

function knowledgeFor(
	fixture: NoteStudyFixture,
): ReadingKnowledge<TranslationLanguage> {
	const [english, russian] = fixture.translations;
	if (!english || !russian) {
		throw new Error(
			`${fixture.titleText} needs English and Russian translations.`,
		);
	}
	return unwrap(
		parseAsReadingKnowledge({
			...(fixture.ipa
				? { transcription: fixture.ipa.replaceAll("/", "") }
				: {}),
			definition: fixture.definition,
			translations: { en: [english], ru: [russian] },
		}),
		`Invalid Notes Study Knowledge ${fixture.titleText}`,
	) as ReadingKnowledge<TranslationLanguage>;
}

function splitLiteral(text: string): Segment[] {
	return text
		.split(/( )/u)
		.filter((part) => part !== "")
		.map((part) => ({
			kind:
				part === " "
					? "Whitespace"
					: /^\p{P}+$/u.test(part)
						? "Punctuation"
						: "ResolvableText",
			text: part,
		}));
}

function targetTokens(fixture: NoteStudyFixture, line: NoteStudyLine) {
	const tokens = line.filter(
		(part): part is NoteStudyToken => typeof part !== "string",
	);
	return fixture.presentationKey === "Anrufen"
		? tokens
		: tokens.filter((_, index) => index === 0);
}

function occurrenceFor(
	fixture: NoteStudyFixture,
	reading: Reading<"de">,
	context: NoteStudyLine,
	contextIndex: number,
): NoteStudyOccurrence {
	const targets = new Set(targetTokens(fixture, context));
	const segments: Segment[] = [];
	const memberSegmentIndices: number[] = [];
	for (const part of context) {
		if (typeof part === "string") {
			segments.push(...splitLiteral(part));
			continue;
		}
		if (targets.has(part)) memberSegmentIndices.push(segments.length);
		segments.push({ kind: "ResolvableText", text: part.text });
	}
	if (memberSegmentIndices.length === 0) {
		throw new Error(
			`${fixture.titleText} context ${contextIndex} has no target.`,
		);
	}
	const citationSurface = dumling.de.convert.lemma.toSurface(reading.lemma);
	const attestation = unwrap(
		parseAsAttestation(
			{
				members: memberSegmentIndices.map((index) => ({
					attested: segments[index]?.text ?? "",
					orthography: "Standard",
				})),
				realizationCoverage: "Full",
				surface: citationSurface,
			},
			"de",
			"Citation",
			reading.lemma.family,
			reading.lemma.kind,
		),
		`Invalid Notes Study Attestation ${fixture.titleText}`,
	) as Attestation<"de">;
	return {
		submissionKey: `notes-study:${fixture.presentationKey}:${contextIndex}`,
		segmentedSentenceId: `notes-study:${fixture.presentationKey}:${contextIndex}:sentence`,
		segments,
		memberSegmentIndices,
		attestation,
	};
}

function databaseUnitFor(fixture: NoteStudyFixture): NoteStudyDatabaseUnit {
	const reading = readingFor(fixture);
	const presentationSurfaceTexts = [
		...(fixture.forms ?? []).flatMap(({ content }) =>
			content.flatMap((part) =>
				typeof part === "string" ? [] : [part.text],
			),
		),
		...(fixture.formTable?.rows ?? []).flatMap(({ cells }) =>
			cells.flatMap((cell) =>
				cell.flatMap((part) =>
					typeof part === "string" ? [] : [part.text],
				),
			),
		),
	];
	return {
		reading,
		readingKey: readingFingerprint(reading),
		lemmaKey: lemmaIdentityKey(reading.lemma),
		citationSurface: dumling.de.convert.lemma.toSurface(reading.lemma),
		presentationSurfaces: [...new Set(presentationSurfaceTexts)].map(
			(text) =>
				unwrap(
					parseAsSurface(
						{
							...dumling.de.convert.lemma.toSurface(
								reading.lemma,
							),
							normalizedSurface: text,
							spelling:
								text === reading.lemma.canonicalForm
									? "Canonical"
									: "Variant",
						},
						"de",
						"Citation",
						reading.lemma.family,
						reading.lemma.kind,
					),
					`Invalid Notes Study presentation Surface ${text}`,
				) as Surface<"de", "Citation">,
		),
		knowledge: knowledgeFor(fixture),
		occurrences: fixture.contexts.map((context, index) =>
			occurrenceFor(fixture, reading, context, index),
		),
	};
}

/** Committed, runtime-validated Dumling/Dumrel values used by the local seed. */
export const NOTE_STUDY_DATABASE = NOTE_STUDY_FIXTURES.map(databaseUnitFor);

function relatedUnitFor(token: NoteStudyToken): NoteStudyDatabaseUnit {
	const reading = unwrap(
		parseAsReading(
			{
				lemma: {
					language: "de",
					family: "Lexeme",
					kind: "X",
					canonicalForm: token.text,
					coreFeatures: NULL_CORE_FEATURES_BY_KIND.X,
				},
				emojiDescription: "🔗",
			},
			"de",
			"Lexeme",
			"X",
		),
		`Invalid related Reading ${token.text}`,
	) as Reading<"de">;
	const fixture = {
		presentationKey: `related-${encodeURIComponent(token.text)}`,
		family: "Lexeme" as const,
		kind: "X" as const,
		emoji: "🔗",
		title: [token],
		titleText: token.text,
		summary: token.description ?? "Relation counterpart",
		contexts: [[token, "."]],
		definition:
			token.description ?? `Relation counterpart for ${token.text}.`,
		translations: [token.text, token.text],
		tags: [],
	} satisfies NoteStudyFixture;
	return {
		reading,
		readingKey: readingFingerprint(reading),
		lemmaKey: lemmaIdentityKey(reading.lemma),
		citationSurface: dumling.de.convert.lemma.toSurface(reading.lemma),
		presentationSurfaces: [],
		knowledge: { definition: fixture.definition },
		occurrences: [occurrenceFor(fixture, reading, fixture.contexts[0], 0)],
	};
}

const RELATED_UNIT_BY_CANONICAL_FORM = new Map<string, NoteStudyDatabaseUnit>();
function resolveRelatedUnit(token: NoteStudyToken) {
	const existing = RELATED_UNIT_BY_CANONICAL_FORM.get(token.text);
	if (existing) return existing;
	const created = relatedUnitFor(token);
	RELATED_UNIT_BY_CANONICAL_FORM.set(token.text, created);
	return created;
}

export const NOTE_STUDY_RESOLVED_RELATIONS: readonly NoteStudyResolvedRelation[] =
	(NOTE_STUDY_FIXTURES as readonly NoteStudyFixture[]).flatMap(
		(fixture, fixtureIndex) => {
			const source = NOTE_STUDY_DATABASE[fixtureIndex];
			if (!source) return [];
			return (fixture.relations ?? []).flatMap(({ relation, content }) =>
				content.flatMap((part): NoteStudyResolvedRelation[] =>
					typeof part === "string" || part.tone === "shadow"
						? []
						: [
								{
									sourceReadingKey: source.readingKey,
									relation,
									target: resolveRelatedUnit(part),
								},
							],
				),
			);
		},
	);

export const NOTE_STUDY_RELATED_DATABASE = [
	...RELATED_UNIT_BY_CANONICAL_FORM.values(),
];

export const NOTE_STUDY_PENDING_RELATIONS: readonly NoteStudyPendingRelation[] =
	(NOTE_STUDY_FIXTURES as readonly NoteStudyFixture[]).flatMap(
		(fixture, fixtureIndex) => {
			const source = NOTE_STUDY_DATABASE[fixtureIndex];
			if (!source) return [];
			return (fixture.relations ?? []).flatMap(({ relation, content }) =>
				content.flatMap((part): NoteStudyPendingRelation[] =>
					typeof part === "string" || part.tone !== "shadow"
						? []
						: [
								{
									sourceReadingKey: source.readingKey,
									relation:
										relation as DirectSemanticRelation,
									target: {
										language: "de",
										canonicalForm: part.text,
										family: "Lexeme",
										kind: "X",
									},
								},
							],
				),
			);
		},
	);

export function storedRelation(relation: NoteStudyResolvedRelation): {
	readonly sourceReadingKey: string;
	readonly relation: DirectSemanticRelation;
	readonly targetLemmaKey: string;
} {
	if (relation.relation === "hyponym" || relation.relation === "meronym") {
		return {
			sourceReadingKey: relation.target.readingKey,
			relation: inverseRelationFor(
				relation.relation,
			) as DirectSemanticRelation,
			targetLemmaKey:
				NOTE_STUDY_DATABASE.find(
					({ readingKey }) =>
						readingKey === relation.sourceReadingKey,
				)?.lemmaKey ?? "",
		};
	}
	return {
		sourceReadingKey: relation.sourceReadingKey,
		relation: relation.relation as DirectSemanticRelation,
		targetLemmaKey: relation.target.lemmaKey,
	};
}

export function makeUrl(unit: Reading<"de">): string {
	const canonical = unit.lemma.canonicalForm
		.normalize("NFC")
		.replaceAll("ä", "ae")
		.replaceAll("ö", "oe")
		.replaceAll("ü", "ue")
		.replaceAll("Ä", "Ae")
		.replaceAll("Ö", "Oe")
		.replaceAll("Ü", "Ue")
		.replaceAll("ß", "ss")
		.replaceAll(" ", "_");
	return `${canonical}/reading/${unit.emojiDescription}`;
}

export const NOTE_STUDY_DATABASE_BY_URL = new Map(
	NOTE_STUDY_DATABASE.map((unit) => [makeUrl(unit.reading), unit]),
);

export const NOTE_STUDY_READING_BY_LEMMA = new Map<string, Lemma<"de">>(
	NOTE_STUDY_DATABASE.map(({ lemmaKey, reading }) => [
		lemmaKey,
		reading.lemma,
	]),
);

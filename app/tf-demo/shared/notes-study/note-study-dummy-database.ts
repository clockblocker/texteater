import { splitGermanFusedWords } from "dumgen/authored";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	lemmaIdentityKey,
	readingIdentityKey as readingFingerprint,
} from "../../server/linguisticIdentity";
import {
	parseGermanAttestation,
	parseGermanReading,
	parseGermanSurface,
} from "../../server/operationalParsing";
import {
	germanGovernorKinds,
	germanVerbalKinds,
} from "../german-evidence-kinds";
import { NOTE_STUDY_FIXTURES } from "./fixtures/index";
import type {
	NoteStudyFixture,
	NoteStudyLine,
	NoteStudyToken,
} from "./note-study-fixture";

export const NOTE_STUDY_VISITOR_ID = "playground:notes-study:visitor";

type Segment = {
	readonly kind: "ResolvableText" | "Whitespace" | "Punctuation";
	readonly text: string;
	/** The word a fusion component stands for, as intake stores it. */
	readonly surface?: string;
};

export type NoteStudyOccurrence = {
	readonly submissionKey: string;
	readonly segmentedSentenceId: string;
	readonly segments: readonly Segment[];
	readonly memberSegmentIndices: readonly number[];
	readonly attestation: Dumling.Attestation<"de">;
};

export type NoteStudyDatabaseUnit = {
	readonly reading: Dumling.Reading<"de">;
	readonly readingKey: string;
	readonly lemmaKey: string;
	readonly citationSurface: Dumling.Surface<"de">;
	readonly presentationSurfaces: readonly Dumling.Surface<"de">[];
	readonly knowledge: Dumrel.ReadingKnowledge;
	readonly personalAnnotation: string;
	readonly occurrences: readonly NoteStudyOccurrence[];
};

export type NoteStudyResolvedRelation = {
	readonly sourceReadingKey: string;
	readonly relation: Dumrel.SemanticRelation;
	readonly target: NoteStudyDatabaseUnit;
};

export type NoteStudyPendingRelation = {
	readonly sourceReadingKey: string;
	readonly relation: Dumrel.DirectSemanticRelation;
	readonly target: Dumrel.UnitShadow;
};

const NULL_CORE_FEATURES_BY_KIND = {
	ADJ: { abbr: null, foreign: null, numType: null, variant: null },
	ADP: {
		abbr: null,
		adpType: null,
		extPos: null,
		foreign: null,
		partType: null,
	},
	ADV: { foreign: null, numType: null, pronType: null },
	AUX: { verbType: null },
	CCONJ: { conjType: null },
	DET: {
		case: null,
		definite: null,
		extPos: null,
		foreign: null,
		gender: null,
		number: null,
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
		case: null,
		number: null,
		gender: null,
	},
	PROPN: { abbr: null, article: null, foreign: null, gender: null },
	PUNCT: { punctType: null },
	SCONJ: { conjType: null },
	SYM: { foreign: null, numType: null },
	VERB: {
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
	Duplifix: {},
	Infix: {},
	Interfix: {},
	Prefix: { hasSepPrefix: null },
	Root: {},
	Suffix: {},
	Suffixoid: {},
	Transfix: {},
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

function readingFor(fixture: NoteStudyFixture): Dumling.Reading<"de"> {
	const identity = NOTE_STUDY_IDENTITY_BY_PRESENTATION_KEY.get(
		fixture.presentationKey as (typeof NOTE_STUDY_READING_IDENTITIES)[number][0],
	);
	if (!identity)
		throw new Error(
			`Missing Notes Study identity ${fixture.presentationKey}.`,
		);
	const input = {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: identity.family,
			kind: identity.kind,
			canonicalForm: identity.canonicalForm,
			coreFeatures: NULL_CORE_FEATURES_BY_KIND[identity.kind],
		},
		emojiDescription: identity.emojiDescription,
	};
	return parseGermanReading(input);
}

function knowledgeFor(fixture: NoteStudyFixture): Dumrel.ReadingKnowledge {
	const [english, russian] = fixture.translations;
	if (!english || !russian) {
		throw new Error(
			`${fixture.titleText} needs English and Russian translations.`,
		);
	}
	const parsed = parseReadingKnowledge({
		source: readingFor(fixture),
		knowledge: {
			...(fixture.ipa
				? { transcription: fixture.ipa.replaceAll("/", "") }
				: {}),
			definition: fixture.definition,
			translations: { en: [english], ru: [russian] },
		},
	});
	if (!parsed.success) throw parsed.error;
	return parsed.value;
}

/** Context words as intake stores them: a fused word (`Am`) as its pieces. */
function splitLiteral(text: string): readonly Segment[] {
	return splitGermanFusedWords(
		text
			.split(/( )/u)
			.filter((part) => part !== "")
			.map((part) => ({
				kind:
					part === " "
						? ("Whitespace" as const)
						: /^\p{P}+$/u.test(part)
							? ("Punctuation" as const)
							: ("ResolvableText" as const),
				text: part,
			})),
	);
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
	reading: Dumling.Reading<"de">,
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
	const citationSurface = fixtureSurface(reading.lemma);
	const attestation = parseGermanAttestation({
		unitKind: "Attestation",
		members: memberSegmentIndices.map((index) => ({
			attested: segments[index]?.text ?? "",
			orthography: "Standard",
		})),
		realizationCoverage: "Full",
		...(reading.lemma.kind === "NOUN" || reading.lemma.kind === "PROPN"
			? { articleEvidence: null }
			: {}),
		...(germanVerbalKinds.includes(reading.lemma.kind)
			? { expletiveEvidence: null }
			: {}),
		...(germanGovernorKinds.includes(reading.lemma.kind)
			? { valencyEvidence: [] }
			: {}),
		...(reading.lemma.kind === "ADP" ? { valencyEvidence: [] } : {}),
		surface: citationSurface,
	});
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
		citationSurface: fixtureSurface(reading.lemma),
		presentationSurfaces: [...new Set(presentationSurfaceTexts)].map(
			(text) => fixtureSurface(reading.lemma, text),
		),
		knowledge: knowledgeFor(fixture),
		personalAnnotation: fixture.summary,
		occurrences: fixture.contexts.map((context, index) =>
			occurrenceFor(fixture, reading, context, index),
		),
	};
}

/** Committed, runtime-validated Dumling/Dumrel values used by the local seed. */
export const NOTE_STUDY_DATABASE = NOTE_STUDY_FIXTURES.map(databaseUnitFor);

/** Explicit target routes; missing identities fail instead of defaulting to Lexeme/X. */
const RELATED_ROUTES = {
	still: { family: "Lexeme", kind: "ADJ" },
	gelassen: { family: "Lexeme", kind: "ADJ" },
	unruhig: { family: "Lexeme", kind: "ADJ" },
	hektisch: { family: "Lexeme", kind: "ADJ" },
	ungeachtet: { family: "Lexeme", kind: "ADP" },
	unbeschadet: { family: "Lexeme", kind: "ADP" },
	trotzdem: { family: "Lexeme", kind: "ADV" },
	gleichwohl: { family: "Lexeme", kind: "ADV" },
	doch: { family: "Lexeme", kind: "CCONJ" },
	der: { family: "Lexeme", kind: "DET" },
	jener: { family: "Lexeme", kind: "DET" },
	oh: { family: "Lexeme", kind: "INTJ" },
	oje: { family: "Lexeme", kind: "INTJ" },
	Abendlicht: { family: "Lexeme", kind: "NOUN" },
	Tageshelle: { family: "Lexeme", kind: "NOUN" },
	Dunkelheit: { family: "Lexeme", kind: "NOUN" },
	Abenddämmerung: { family: "Lexeme", kind: "NOUN" },
	Morgendämmerung: { family: "Lexeme", kind: "NOUN" },
	"Blaue Stunde": { family: "Lexeme", kind: "NOUN" },
	Bundeshauptstadt: { family: "Lexeme", kind: "NOUN" },
	Stadt: { family: "Lexeme", kind: "NOUN" },
	Prozentsymbol: { family: "Lexeme", kind: "NOUN" },
	Prozentzeichen: { family: "Lexeme", kind: "NOUN" },
	Zwielicht: { family: "Lexeme", kind: "NOUN" },
	Sonnenuntergang: { family: "Lexeme", kind: "NOUN" },
	Tageslicht: { family: "Lexeme", kind: "NOUN" },
	Lichtzustand: { family: "Lexeme", kind: "NOUN" },
	Tageslauf: { family: "Lexeme", kind: "NOUN" },
	nein: { family: "Lexeme", kind: "PART" },
	"sich gegenseitig": { family: "Lexeme", kind: "PRON" },
	sich: { family: "Lexeme", kind: "PRON" },
	"sich selbst": { family: "Lexeme", kind: "PRON" },
	Deutschland: { family: "Lexeme", kind: "PROPN" },
	obgleich: { family: "Lexeme", kind: "SCONJ" },
	obschon: { family: "Lexeme", kind: "SCONJ" },
	wenngleich: { family: "Lexeme", kind: "SCONJ" },
	"auch wenn": { family: "Lexeme", kind: "SCONJ" },
	"v. H.": { family: "Lexeme", kind: "SYM" },
	durchklingeln: { family: "Lexeme", kind: "VERB" },
	kontaktieren: { family: "Lexeme", kind: "VERB" },
	"3": { family: "Lexeme", kind: "NUM" },
	"Der Zweck heiligt die Mittel": { family: "Phraseme", kind: "Aphorism" },
	"Der Weg ist wichtiger als das Ziel": {
		family: "Phraseme",
		kind: "Aphorism",
	},
	"eine Entscheidung fällen": { family: "Phraseme", kind: "Collocation" },
	"eine Entscheidung aufschieben": {
		family: "Phraseme",
		kind: "Collocation",
	},
	"zu einem Entschluss kommen": { family: "Phraseme", kind: "Collocation" },
	"wie auch immer": { family: "Phraseme", kind: "DiscourseFormula" },
	"sei's drum": { family: "Phraseme", kind: "DiscourseFormula" },
	"den Wald vor lauter Bäumen nicht sehen": {
		family: "Phraseme",
		kind: "Idiom",
	},
	"den Durchblick haben": { family: "Phraseme", kind: "Idiom" },
	"Der frühe Vogel fängt den Wurm": { family: "Phraseme", kind: "Proverb" },
	"Gut Ding will Weile haben": { family: "Phraseme", kind: "Proverb" },
} as const satisfies Record<
	string,
	Pick<Dumling.Lemma<"de">, "family" | "kind">
>;

function relatedRoute(canonicalForm: string, source: Dumling.Reading<"de">) {
	const route = RELATED_ROUTES[canonicalForm as keyof typeof RELATED_ROUTES];
	if (!route)
		throw new Error(
			`Missing Notes Study relation identity ${canonicalForm}.`,
		);
	if (route.family !== source.lemma.family)
		throw new Error(
			`Notes Study relation from ${source.lemma.canonicalForm} to ${canonicalForm} crosses Families.`,
		);
	return route;
}

function relatedUnitFor(
	token: NoteStudyToken,
	source: Dumling.Reading<"de">,
): NoteStudyDatabaseUnit {
	const route = relatedRoute(token.text, source);
	const reading = parseGermanReading({
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			...route,
			canonicalForm: token.text,
			coreFeatures: NULL_CORE_FEATURES_BY_KIND[route.kind],
		},
		emojiDescription: "🔗",
	});
	const fixture = {
		presentationKey: `related-${encodeURIComponent(token.text)}`,
		...route,
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
		citationSurface: fixtureSurface(reading.lemma),
		presentationSurfaces: [],
		knowledge: { definition: fixture.definition },
		personalAnnotation: "",
		occurrences: [occurrenceFor(fixture, reading, fixture.contexts[0], 0)],
	};
}

const RELATED_UNIT_BY_CANONICAL_FORM = new Map<string, NoteStudyDatabaseUnit>();
function resolveRelatedUnit(
	token: NoteStudyToken,
	source: Dumling.Reading<"de">,
) {
	relatedRoute(token.text, source);
	const existing = RELATED_UNIT_BY_CANONICAL_FORM.get(token.text);
	if (existing) return existing;
	const created = relatedUnitFor(token, source);
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
									target: resolveRelatedUnit(
										part,
										source.reading,
									),
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
										relation as Dumrel.DirectSemanticRelation,
									target: {
										language: "de",
										canonicalForm: part.text,
										...relatedRoute(
											part.text,
											source.reading,
										),
									},
								},
							],
				),
			);
		},
	);

export function storedRelation(relation: NoteStudyResolvedRelation): {
	readonly sourceReadingKey: string;
	readonly relation: Dumrel.DirectSemanticRelation;
	readonly targetLemmaKey: string;
} {
	if (relation.relation === "hyponym" || relation.relation === "meronym") {
		return {
			sourceReadingKey: relation.target.readingKey,
			relation: relation.relation === "hyponym" ? "hypernym" : "holonym",
			targetLemmaKey:
				NOTE_STUDY_DATABASE.find(
					({ readingKey }) =>
						readingKey === relation.sourceReadingKey,
				)?.lemmaKey ?? "",
		};
	}
	return {
		sourceReadingKey: relation.sourceReadingKey,
		relation: relation.relation as Dumrel.DirectSemanticRelation,
		targetLemmaKey: relation.target.lemmaKey,
	};
}

export function makeUrl(unit: Dumling.Reading<"de">): string {
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

export const NOTE_STUDY_READING_BY_LEMMA = new Map<string, Dumling.Lemma<"de">>(
	NOTE_STUDY_DATABASE.map(({ lemmaKey, reading }) => [
		lemmaKey,
		reading.lemma,
	]),
);

/** Fixture evidence intentionally leaves unrepresented inflection unknown. */
function fixtureSurface(
	lemma: Dumling.Lemma<"de">,
	text = lemma.canonicalForm,
): Dumling.Surface<"de"> {
	const input = {
		unitKind: "Surface",
		language: "de",
		lemma,
		normalizedSurface: text,
		spelling: "Canonical",
		surfaceFeatures: null,
	};
	const bare = parseUnit(input);
	if (
		bare.success &&
		bare.chain.unitKind === "Surface" &&
		bare.chain.language === "de"
	)
		return bare.chain.value;
	return parseGermanSurface({
		...input,
		inflectionalFeatures: null,
	});
}

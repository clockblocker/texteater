import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { splitFusedWords } from "legacy-dumgen/authored";
import {
	emojiDescriptionOf,
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

type NoteStudyRoute = Pick<Dumling.Lemma<"de">, "family" | "kind">;
type RouteKey<Route extends NoteStudyRoute = NoteStudyRoute> =
	Route extends unknown ? `${Route["family"]}/${Route["kind"]}` : never;

/** The unknown Core Features of every studied route. */
const NULL_CORE_FEATURES_BY_ROUTE = {
	"Lexeme/ADJ": { comparable: null },
	"Lexeme/ADP": {},
	"Lexeme/ADV": { comparable: null },
	"Lexeme/AUX": {},
	"Lexeme/CCONJ": {},
	"Lexeme/DET": {
		case: null,
		gender: null,
		number: null,
		person: null,
		polite: null,
		poss: null,
		pronType: null,
	},
	"Lexeme/INTJ": { partType: null },
	"Lexeme/NOUN": { gender: null },
	"Lexeme/NUM": {},
	"Lexeme/PRON": {
		case: null,
		gender: null,
		number: null,
		person: null,
		polite: null,
		poss: null,
		pronType: null,
	},
	"Lexeme/PROPN": { article: null, gender: null },
	"Lexeme/SCONJ": {},
	"Lexeme/SYM": {},
	"Lexeme/VERB": { hasSepPrefix: null, lexicallyReflexive: null },
	"Locution/ADV": { comparable: null },
	"Locution/VERB": {},
	"Saying/Saying": {},
	"Morpheme/Circumfix": {},
	"Morpheme/Interfix": {},
	"Morpheme/Prefix": { hasSepPrefix: null },
	"Morpheme/Root": {},
	"Morpheme/Suffix": {},
	"Morpheme/Suffixoid": {},
} as const satisfies Partial<Record<RouteKey, object>>;

/**
 * The Core Features a studied Reading knows; the rest stay unknown. An
 * answer word is an INTJ with partType Res, as dumspec's gold has it.
 */
const KNOWN_CORE_FEATURES: Partial<Record<string, object>> = {
	Doch: { partType: "Res" },
};

function nullCoreFeatures(route: NoteStudyRoute): object {
	const key = `${route.family}/${route.kind}`;
	if (!Object.hasOwn(NULL_CORE_FEATURES_BY_ROUTE, key))
		throw new Error(`Missing Notes Study Core Features for ${key}.`);
	return NULL_CORE_FEATURES_BY_ROUTE[
		key as keyof typeof NULL_CORE_FEATURES_BY_ROUTE
	];
}

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
	["Doch", "Lexeme", "INTJ", "doch", "💬"],
	["Einander", "Lexeme", "PRON", "einander", "🤝"],
	["Berlin", "Lexeme", "PROPN", "Berlin", "🐻"],
	["Obwohl", "Lexeme", "SCONJ", "obwohl", "↔️"],
	["%", "Lexeme", "SYM", "%", "💯"],
	["Anrufen", "Lexeme", "VERB", "anrufen", "📞"],
	[
		"Eine-Entscheidung-treffen",
		"Locution",
		"VERB",
		"eine Entscheidung treffen",
		"✅",
	],
	["Wie-dem-auch-sei", "Locution", "ADV", "wie dem auch sei", "↪️"],
	[
		"Tomaten-auf-den-Augen-haben",
		"Locution",
		"VERB",
		"Tomaten auf den Augen haben",
		"🍅",
	],
	["Der-Weg-ist-das-Ziel", "Saying", "Saying", "Der Weg ist das Ziel", "🧭"],
	[
		"Morgenstund-hat-Gold-im-Mund",
		"Saying",
		"Saying",
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
			coreFeatures: {
				...nullCoreFeatures(identity),
				...KNOWN_CORE_FEATURES[fixture.presentationKey],
			},
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

/** Lexeme Kinds whose Attestation says where its article is (ADR 0040). */
const germanArticleKinds: readonly string[] = [
	"ADJ",
	"NOUN",
	"NUM",
	"PRON",
	"PROPN",
];

/** Context words as intake stores them: a fused word (`Am`) as its pieces. */
function splitLiteral(text: string): readonly Segment[] {
	return splitFusedWords(
		"de",
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
		...(reading.lemma.family === "Lexeme" &&
		germanArticleKinds.includes(reading.lemma.kind)
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

/** Explicit target routes; a missing identity fails instead of defaulting. */
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
	nein: { family: "Lexeme", kind: "INTJ" },
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
	"eine Entscheidung fällen": { family: "Locution", kind: "VERB" },
	"eine Entscheidung aufschieben": { family: "Locution", kind: "VERB" },
	"zu einem Entschluss kommen": { family: "Locution", kind: "VERB" },
	"wie auch immer": { family: "Locution", kind: "ADV" },
	"sei's drum": { family: "Locution", kind: "ADV" },
	"den Wald vor lauter Bäumen nicht sehen": {
		family: "Locution",
		kind: "VERB",
	},
	"den Durchblick haben": { family: "Locution", kind: "VERB" },
	"Der Zweck heiligt die Mittel": { family: "Saying", kind: "Saying" },
	"Der Weg ist wichtiger als das Ziel": { family: "Saying", kind: "Saying" },
	"Der frühe Vogel fängt den Wurm": { family: "Saying", kind: "Saying" },
	"Gut Ding will Weile haben": { family: "Saying", kind: "Saying" },
} as const satisfies Record<
	string,
	Pick<Dumling.Lemma<"de">, "family" | "kind">
>;

/** Lexeme and Locution share one relation space (ADR 0039). */
function relationSpace(family: Dumling.Family<"de">) {
	return family === "Locution" ? "Lexeme" : family;
}

function relatedRoute(canonicalForm: string, source: Dumling.Reading<"de">) {
	const route = RELATED_ROUTES[canonicalForm as keyof typeof RELATED_ROUTES];
	if (!route)
		throw new Error(
			`Missing Notes Study relation identity ${canonicalForm}.`,
		);
	if (relationSpace(route.family) !== relationSpace(source.lemma.family))
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
			coreFeatures: nullCoreFeatures(route),
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
	return `${canonical}/reading/${emojiDescriptionOf(unit) ?? ""}`;
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
		spelling: { kind: "Canonical" },
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

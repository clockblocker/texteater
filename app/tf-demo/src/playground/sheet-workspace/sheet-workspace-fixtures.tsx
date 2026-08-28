import { presentedFeatureNames } from "dumling/vocabulary";
import { useCallback } from "react";

import type { SentenceView } from "@/lib/action-results";
import { renderNote } from "@/notes";
import type { ReadingNoteData } from "@/notes/reading";
import { createDefaultReadingNoteCapabilities } from "@/notes/reading/reading-note-render-context";
import type { RouteNoteData } from "@/notes/route";
import { createDefaultRouteNoteCapabilities } from "@/notes/route/route-note-render-context";
import { TextPresentation } from "@/views/text-view";
import type { CardSheetWorkspaceProps } from "@/workspace/card-sheet-workspace";
import type {
	SheetWorkspace,
	WorkspaceSubject,
} from "@/workspace/sheet-workspace";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";

export const FIXTURE_TEXT_SUBJECT = {
	kind: "Text",
	target: { kind: "Text", textId: "workspace-text-die-bank" },
} as const satisfies WorkspaceSubject;

const FIXTURE_SOURCE_TEXT =
	"Die Banken sind geöffnet. Morgen bleiben sie geschlossen.";

const FIXTURE_SENTENCES = [
	fixtureSentence(0, "Die Banken sind geöffnet.", [
		["ResolvableText", "Die"],
		["Whitespace", " "],
		["ResolvableText", "Banken"],
		["Whitespace", " "],
		["ResolvableText", "sind"],
		["Whitespace", " "],
		["ResolvableText", "geöffnet"],
		["Punctuation", "."],
	]),
	fixtureSentence(1, "Morgen bleiben sie geschlossen.", [
		["ResolvableText", "Morgen"],
		["Whitespace", " "],
		["ResolvableText", "bleiben"],
		["Whitespace", " "],
		["ResolvableText", "sie"],
		["Whitespace", " "],
		["ResolvableText", "geschlossen"],
		["Punctuation", "."],
	]),
] as const;

type FixtureNoteKind = "reading" | "lemma" | "surface" | "attestation";

const FIXTURE_CARD_ORDER = [
	"reading",
	"lemma",
	"surface",
	"attestation",
] as const satisfies readonly FixtureNoteKind[];

export function createSheetWorkspaceFixture(): SheetWorkspace {
	return {
		centralPaneId: "central",
		activePaneId: "central",
		panes: [
			{
				id: "west",
				sheets: [
					{
						instanceId: "sheet-west-text",
						subject: FIXTURE_TEXT_SUBJECT,
						locked: true,
					},
				],
			},
			{
				id: "central",
				sheets: [
					{
						instanceId: "sheet-central-text",
						subject: FIXTURE_TEXT_SUBJECT,
						locked: true,
					},
				],
			},
			{ id: "east", sheets: [] },
		],
	};
}

export const renderFixtureSubject: CardSheetWorkspaceProps["renderSubject"] = (
	subject,
	_presentation,
) => {
	if (subject.kind === "Text") {
		return <FixtureTextPresentation />;
	}
	const source = fixtureNoteSource(fixtureSubjectId(subject));
	if (!source) return <p>Unknown Note fixture.</p>;
	const note = fixtureNote(source);
	return note.kind === "UnitReadingNote"
		? renderNote(note, readingCapabilities(note))
		: renderNote(note, routeCapabilities());
};

export const renderFixtureCardTail: CardSheetWorkspaceProps["renderCardTail"] =
	(subject) => {
		if (subject.kind !== "Note") return <span>Text preview</span>;
		const source = fixtureNoteSource(fixtureSubjectId(subject));
		return (
			<span data-note-tail={source?.kind}>
				{source ? placeholderTail(source.kind) : "Note preview"}
			</span>
		);
	};

function FixtureTextPresentation() {
	const { presentCards } = useWorkspaceInteraction();
	const selectSegment = useCallback(
		async (
			selectedSentence: SentenceView,
			segmentIndex: number,
			_altKey: boolean,
			anchorElement: HTMLElement,
		) => {
			const segment = selectedSentence.segments.find(
				(candidate) => candidate.index === segmentIndex,
			);
			if (segment?.kind !== "ResolvableText") return;
			presentCards(
				FIXTURE_CARD_ORDER.map((kind) => ({
					key: `${kind}-${selectedSentence.position}-${segmentIndex}`,
					target: fixtureTarget(
						kind,
						selectedSentence.position,
						segmentIndex,
					),
				})),
				{ anchor: anchorElement },
			);
		},
		[presentCards],
	);
	return (
		<TextPresentation
			focus={{ kind: "None" }}
			isResolving={false}
			onSegmentClick={selectSegment}
			selectedSegmentKey={null}
			sentences={FIXTURE_SENTENCES}
		/>
	);
}

function fixtureNoteId(
	kind: FixtureNoteKind,
	sentencePosition: number,
	segmentIndex: number,
): string {
	return `workspace-note:${kind}:${sentencePosition}:${segmentIndex}`;
}

function fixtureTarget(
	kind: FixtureNoteKind,
	sentencePosition: number,
	segmentIndex: number,
) {
	const id = fixtureNoteId(kind, sentencePosition, segmentIndex);
	return kind === "reading"
		? ({ kind: "UnitReadingNote", readingId: id } as const)
		: ({
				kind: "RouteNote",
				routeKind:
					kind === "lemma"
						? "Lemma"
						: kind === "surface"
							? "Surface"
							: "Attestation",
				id,
			} as const);
}

function fixtureSubjectId(subject: WorkspaceSubject): string {
	if (subject.target.kind === "UnitReadingNote") {
		return subject.target.readingId;
	}
	if (subject.target.kind === "RouteNote") return subject.target.id;
	return "";
}

function fixtureNoteSource(noteId: string) {
	const [prefix, kind, sentencePosition, segmentIndex, ...rest] =
		noteId.split(":");
	if (
		prefix !== "workspace-note" ||
		!FIXTURE_CARD_ORDER.includes(kind as FixtureNoteKind) ||
		rest.length > 0
	)
		return null;
	const position = Number(sentencePosition);
	const index = Number(segmentIndex);
	const sentence = FIXTURE_SENTENCES.find(
		(candidate) => candidate.position === position,
	);
	const segment = sentence?.segments.find(
		(candidate) => candidate.index === index,
	);
	return sentence && segment?.kind === "ResolvableText"
		? {
				kind: kind as FixtureNoteKind,
				sentence,
				segmentIndex: index,
				segment,
			}
		: null;
}

function fixtureNote(
	source: NonNullable<ReturnType<typeof fixtureNoteSource>>,
): ReadingNoteData | RouteNoteData {
	const { kind, sentence, segment, segmentIndex } = source;
	const written = segment.text;
	const normalized = written.toLocaleLowerCase("de");
	const lexeme = fixtureLexeme(normalized);
	const suffix = `${sentence.position}-${segmentIndex}`;
	if (kind === "reading") {
		return {
			kind: "UnitReadingNote",
			target: {
				kind: "UnitReadingNote",
				readingId: `reading-${suffix}` as never,
			},
			reading: {
				ownerKind: "Reading",
				ownerKey: `reading-key-${suffix}`,
				readingId: `reading-${suffix}` as never,
				emojiDescription: lexeme.emojiDescription,
				lemma: {
					ownerKind: "Lemma",
					ownerKey: `lemma-key-${suffix}`,
					language: "de",
					family: "Lexeme",
					kind: lexeme.kind,
					canonicalForm: lexeme.canonicalForm,
					coreFeatures: lexeme.coreFeatures,
				},
			},
			knowledgeState: { status: "Full", activity: "Idle" },
			knowledge: {
				transcription: lexeme.transcription,
				translations: { en: [lexeme.translation] },
			},
			knowledgeUpdatedAt: null,
			relations: [],
			pendingRelations: [],
			structuralReferences: [],
			sourceContexts: {
				page: [sourceContext(sentence, segmentIndex)],
				continueCursor: "",
				isDone: true,
			},
		} as unknown as ReadingNoteData;
	}
	if (kind === "lemma") {
		return {
			kind: "RouteNote",
			routeKind: "Lemma",
			target: {
				kind: "RouteNote",
				routeKind: "Lemma",
				id: `lemma-${suffix}`,
			},
			presented: fixturePresentedLemma(lexeme),
			connections: {
				surfaces: [
					{
						surfaceId: `surface-${suffix}`,
						normalizedSurface: normalized,
						canonicalForm: lexeme.canonicalForm,
						family: "Lexeme",
						kind: lexeme.kind,
						target: routeTarget("Surface", `surface-${suffix}`),
					},
				],
				readings: [
					{
						readingId: `reading-${suffix}`,
						emojiDescription: lexeme.emojiDescription,
						target: {
							kind: "UnitReadingNote",
							readingId: `reading-${suffix}`,
						},
					},
				],
				sameWrittenForm: [],
				continueCursor: "",
				isDone: true,
			},
		} as unknown as RouteNoteData;
	}
	if (kind === "surface") {
		return {
			kind: "RouteNote",
			routeKind: "Surface",
			target: routeTarget("Surface", `surface-${suffix}`),
			presented: fixturePresentedSurface(normalized, lexeme),
			lemmaTarget: routeTarget("Lemma", `lemma-${suffix}`),
			connections: {
				occurrences: [
					{
						attestationId: `attestation-${suffix}`,
						sentenceSnippet: sentence.stitchedText,
						members: [written],
						target: routeTarget(
							"Attestation",
							`attestation-${suffix}`,
						),
					},
				],
				sameWrittenForm: [],
				continueCursor: "",
				isDone: true,
			},
		} as unknown as RouteNoteData;
	}
	return {
		kind: "RouteNote",
		routeKind: "Attestation",
		target: routeTarget("Attestation", `attestation-${suffix}`),
		source: sourceContext(sentence, segmentIndex),
		presented: {
			members: [{ attested: written, orthography: "Standard" }],
			realizationCoverage: "Full",
			surface: fixturePresentedSurface(normalized, lexeme),
		},
		surfaceTarget: routeTarget("Surface", `surface-${suffix}`),
		reading: {
			emojiDescription: lexeme.emojiDescription,
			target: {
				kind: "UnitReadingNote",
				readingId: `reading-${suffix}`,
			},
		},
	} as unknown as RouteNoteData;
}

function fixturePresentedFeatureSet(
	features: Readonly<Record<string, string | readonly string[] | null>> = {},
) {
	return Object.fromEntries(
		presentedFeatureNames.map((name) => [name, features[name] ?? null]),
	);
}

function fixturePresentedLemma(lexeme: ReturnType<typeof fixtureLexeme>) {
	return {
		language: "de" as const,
		canonicalForm: lexeme.canonicalForm,
		family: "Lexeme" as const,
		kind: lexeme.kind,
		coreFeatures: fixturePresentedFeatureSet(lexeme.coreFeatures),
	};
}

function fixturePresentedSurface(
	normalizedSurface: string,
	lexeme: ReturnType<typeof fixtureLexeme>,
) {
	return {
		language: "de" as const,
		normalizedSurface,
		spelling: "Canonical" as const,
		surfaceKind: "Citation" as const,
		surfaceFeatures: { historicalStatus: null },
		lemma: fixturePresentedLemma(lexeme),
		inflectionalFeatures: fixturePresentedFeatureSet(),
	};
}

function sourceContext(sentence: SentenceView, segmentIndex: number) {
	const suffix = `${sentence.position}-${segmentIndex}`;
	return {
		attestationId: `attestation-${suffix}` as never,
		textId: FIXTURE_TEXT_SUBJECT.target.textId as never,
		sentencePosition: sentence.position,
		sentenceSnippet: sentence.stitchedText,
		memberSegmentIndices: [segmentIndex],
		target: {
			kind: "Text" as const,
			textId: FIXTURE_TEXT_SUBJECT.target.textId as never,
			focusAttestationId: `attestation-${suffix}` as never,
		},
	};
}

function routeTarget(
	routeKind: "Attestation" | "Surface" | "Lemma",
	id: string,
) {
	return { kind: "RouteNote" as const, routeKind, id: id as never };
}

function readingCapabilities(note: ReadingNoteData) {
	return createDefaultReadingNoteCapabilities(note);
}

function routeCapabilities() {
	return createDefaultRouteNoteCapabilities();
}

function fixtureSentence(
	position: number,
	stitchedText: string,
	segments: readonly (readonly [
		"ResolvableText" | "Whitespace" | "Punctuation",
		string,
	])[],
): SentenceView {
	return {
		sentenceId: `workspace-sentence-${position}` as never,
		position,
		language: "de",
		stitchedText,
		sourceText: FIXTURE_SOURCE_TEXT,
		segments: segments.map(([kind, text], index) => ({
			index,
			kind,
			text,
			isClicked: false,
			isResolutionMember: false,
		})),
	} as SentenceView;
}

function fixtureLexeme(normalizedSurface: string): {
	readonly canonicalForm: string;
	readonly transcription: string;
	readonly translation: string;
	readonly emojiDescription: string;
	readonly kind: "NOUN" | "VERB";
	readonly coreFeatures: Readonly<Record<string, string>>;
} {
	const known: Record<
		string,
		{
			readonly canonicalForm: string;
			readonly transcription: string;
			readonly translation: string;
			readonly emojiDescription: string;
			readonly kind: "NOUN" | "VERB";
		}
	> = {
		die: {
			canonicalForm: "die",
			transcription: "diː",
			translation: "the",
			emojiDescription: "👉",
			kind: "NOUN",
		},
		banken: {
			canonicalForm: "Bank",
			transcription: "baŋk",
			translation: "bank",
			emojiDescription: "🏦",
			kind: "NOUN",
		},
		sind: {
			canonicalForm: "sein",
			transcription: "zaɪ̯n",
			translation: "to be",
			emojiDescription: "🟰",
			kind: "VERB",
		},
		geöffnet: {
			canonicalForm: "öffnen",
			transcription: "ˈœfnən",
			translation: "to open",
			emojiDescription: "🔓",
			kind: "VERB",
		},
		morgen: {
			canonicalForm: "Morgen",
			transcription: "ˈmɔʁɡn̩",
			translation: "tomorrow",
			emojiDescription: "🌅",
			kind: "NOUN",
		},
		bleiben: {
			canonicalForm: "bleiben",
			transcription: "ˈblaɪ̯bn̩",
			translation: "to remain",
			emojiDescription: "⏸️",
			kind: "VERB",
		},
		sie: {
			canonicalForm: "sie",
			transcription: "ziː",
			translation: "they",
			emojiDescription: "👥",
			kind: "NOUN",
		},
		geschlossen: {
			canonicalForm: "schließen",
			transcription: "ˈʃliːsn̩",
			translation: "to close",
			emojiDescription: "🔒",
			kind: "VERB",
		},
	};
	const entry = known[normalizedSurface] ?? {
		canonicalForm: normalizedSurface,
		transcription: normalizedSurface,
		translation: normalizedSurface,
		emojiDescription: "💭",
		kind: "NOUN" as const,
	};
	return {
		...entry,
		coreFeatures: entry.kind === "NOUN" ? { gender: "Neut" } : {},
	};
}

function placeholderTail(kind: FixtureNoteKind): string {
	switch (kind) {
		case "reading":
			return "Reading";
		case "lemma":
			return "Lemma";
		case "surface":
			return "Surface";
		case "attestation":
			return "Occurrence Attestation";
	}
}

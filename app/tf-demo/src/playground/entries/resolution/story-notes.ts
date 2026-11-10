import type { FunctionReturnType } from "convex/server";
import type { ResolutionNote } from "@/views/resolution-deck";
import type { api } from "../../../../convex/_generated/api";
import type { Id, TableNames } from "../../../../convex/_generated/dataModel";
import {
	attestationSaysSomething,
	lemmaSaysSomething,
	surfaceSaysSomething,
} from "../../../../shared/click-story";
import { past, type SessionPhase } from "./session";
import {
	STORY_SENTENCES,
	type Story,
	sentenceText,
	storyWords,
} from "./stories";

/**
 * What the real backend would answer for a story at each phase of its fake
 * Session: the selection's result and the Resolution Note the Session
 * projects. The stored Notes a commit hands over to are in
 * `stored-notes.ts`.
 */

type SelectionResult = FunctionReturnType<
	typeof api.resolutionSessions.selectSegment
>;
type Canonical = Extract<SelectionResult, { kind: "Available" }>["canonical"];

export const STORY_SCROLL_ID = "story-scroll" as Id<"scrolls">;
const STORY_SCROLL_TITLE = "Am Bahnhof";

/** A story's ids in the stored tables, stable and readable. */
export function storyId<Table extends TableNames>(
	table: Table,
	name: string,
): Id<Table> {
	return `story:${name}:${table}` as Id<Table>;
}

export function sentenceId(sentence: number): Id<"sentences"> {
	return storyId("sentences", sentence.toString());
}

/** The index of the Sentence `id` names, or `null`. */
export function sentenceIndexOf(id: string): number | null {
	const index = STORY_SENTENCES.findIndex(
		(_, sentence) => sentenceId(sentence) === id,
	);
	return index === -1 ? null : index;
}

const lemmaName = (story: Story) =>
	`${story.lemma.kind}-${story.lemma.canonicalForm}`;

export function storyIds(story: Story) {
	return {
		readingId: storyId(
			"readings",
			`${lemmaName(story)}-${story.reading.toString()}`,
		),
		lemmaId: storyId("lemmas", lemmaName(story)),
		surfaceId: storyId(
			"surfaces",
			`${lemmaName(story)}-${story.surface.normalizedSurface}`,
		),
		attestationId: storyId("attestations", story.key),
	};
}

export function lemmaOf(story: Story) {
	return {
		language: "de" as const,
		family: "Lexeme" as const,
		kind: story.lemma.kind,
		canonicalForm: story.lemma.canonicalForm,
		coreFeatures: story.lemma.coreFeatures,
	};
}

/** The stored Surface, as a Note presents it. */
export function presentedSurface(story: Story) {
	return {
		language: "de" as const,
		normalizedSurface: story.surface.normalizedSurface,
		grundform: story.surface.grundform,
		spelling: { kind: "Canonical" as const },
		surfaceFeatures: { historicalStatus: null },
		inflectionalFeatures: story.surface.inflectionalFeatures,
		lemma: lemmaOf(story),
	};
}

/** Which of a story's Cards say something, by the Deck's own rules. */
export function storySteps(story: Story): Canonical["steps"] {
	return {
		attestation:
			story.members.length > 1 ||
			attestationSaysSomething(story.grammarMembers),
		surface: surfaceSaysSomething(presentedSurface(story)),
		lemma: lemmaSaysSomething(story.lemma.readings.length),
	};
}

function canonicalOf(story: Story): Canonical {
	const ids = storyIds(story);
	return {
		...ids,
		surfaceLanguage: "de",
		normalizedSurface: story.surface.normalizedSurface,
		steps: storySteps(story),
	};
}

const unitRoute = (story: Story) => ({
	language: "de" as const,
	family: "Lexeme" as const,
	kind: story.lemma.kind,
});

/**
 * What `selectSegment` answers: a stored route's canonical occurrence, or
 * the Session it started, with the clicked unit's stored route and Segments.
 */
export function selectionResult(
	story: Story,
	requestId: string,
	stored: boolean,
	deduplicated = false,
): SelectionResult {
	if (stored) return { kind: "Available", canonical: canonicalOf(story) };
	return {
		kind: "Resolving",
		requestId,
		progress: "Starting",
		activity: "Scheduled",
		deduplicated,
		unitRoute: unitRoute(story),
		unitSegments: [...story.members],
	} as SelectionResult;
}

function lifecycleAt(
	story: Story,
	phase: SessionPhase,
): ResolutionNote["lifecycle"] {
	if (phase === "Committed" || phase === "Stored") {
		const canonical = canonicalOf(story);
		return {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
			attestationId: canonical.attestationId,
			readingId: canonical.readingId,
			canonical,
		};
	}
	if (phase === "Failed")
		return {
			state: "Terminal",
			progress: "GrammarAvailable",
			outcome: "PermanentFailure",
			failureCode: "ProviderUnavailable",
			diagnosticId: "fake-session",
			message: `“${storyWords(story)}” could not be resolved. Please retry.`,
		};
	return {
		state: "Active",
		progress:
			phase === "Knowledge"
				? "ReadingAvailable"
				: phase === "Grammar"
					? "GrammarAvailable"
					: "Starting",
		activity: "Running",
	};
}

/**
 * The Resolution Note the Session projects at `phase`: the clicked
 * sentence from its first result, Grammar's reading once it has read the
 * words, Luna's emoji once the Knowledge lands, then its Terminal outcome.
 * Null before the first result.
 */
export function resolutionNoteAt(
	story: Story,
	requestId: string,
	phase: SessionPhase,
	/** The Segment the click landed on; the unit's last member by default. */
	clicked = story.members.at(-1) ?? 0,
): ResolutionNote | null {
	if (phase === "Clicked" || phase === "Selected") return null;
	const segments = STORY_SENTENCES[story.sentence] ?? [];
	const reading = story.lemma.readings[story.reading];
	const grammar = past(phase, "Grammar");
	const note = {
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId },
		lifecycle: lifecycleAt(story, phase),
		route: {
			scrollId: STORY_SCROLL_ID,
			sentenceId: sentenceId(story.sentence),
			stitchedText: sentenceText(story.sentence),
			clickedSegmentIndex: clicked,
			selectedSegment: segments[clicked]?.text ?? "",
		},
		source: {
			segments: segments.map(({ kind, text }) => ({ kind, text })),
			memberSegmentIndices: [...story.members],
			scrollTitle: STORY_SCROLL_TITLE,
		},
		unit: { segments: [...story.members], route: unitRoute(story) },
		...(grammar
			? {
					grammar: {
						members: story.grammarMembers,
						valencyMembers: [],
						realizationCoverage: "Full",
						normalizedSurface: story.surface.normalizedSurface,
						spelling: { kind: "Canonical" },
						grundform: story.surface.grundform,
						canonicalForm: story.lemma.canonicalForm,
						family: "Lexeme",
						kind: story.lemma.kind,
						coreFeatures: story.lemma.coreFeatures,
					},
				}
			: {}),
		...(past(phase, "Knowledge") && phase !== "Failed"
			? {
					reading: {
						emojiDescription: reading?.emoji,
						canonicalForm: story.lemma.canonicalForm,
						family: "Lexeme",
						kind: story.lemma.kind,
					},
				}
			: {}),
		updatedAt: 1,
	};
	/* the projection is per Kind; the fixture names its Kind as a string */
	return note as ResolutionNote;
}

export { STORY_SCROLL_TITLE };

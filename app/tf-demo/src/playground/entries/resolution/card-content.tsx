import type { ReactNode } from "react";
import {
	renderFixtureNoteParts,
	renderNoteParts,
	resolvingAttestationCaption,
	resolvingAttestationNoteParts,
	resolvingUnitTitle,
} from "@/notes";
import { ResolutionStepNoteFrame } from "@/views/resolution-note-view";
import { resolvingReadingNoteData } from "@/views/resolving-reading-note";
import { NotePartProvider } from "@/workspace/note-part";
import type { Role } from "./deck-plan";
import type { SessionPhase } from "./session";
import { storedNotesOf } from "./stored-notes";
import type { Story } from "./stories";
import { resolutionNoteAt, storyIds } from "./story-notes";

/**
 * What a Card of a click's Deck shows at a phase of its Session: its
 * Heading Block and its other Blocks, from the app's own Note renderers.
 * A step and the stored Note that replaces it go through the same
 * renderer, so the Card's face keeps its elements across the hand-over.
 */

export type CardParts = {
	readonly heading: ReactNode;
	readonly body: ReactNode;
};

const follow = () => {};
const PAGINATION = {
	hasMore: false,
	isLoading: false,
	error: null,
	loadMore: null,
};

const committed = (phase: SessionPhase) =>
	phase === "Committed" || phase === "Stored";

/** The Reading: the stored Note once committed, the Note it is becoming before. */
function readingParts(
	story: Story,
	phase: SessionPhase,
	requestId: string,
	clicked: number,
): CardParts {
	const note = resolutionNoteAt(story, requestId, phase, clicked);
	if (phase === "Failed" && note) {
		const frame = (
			<ResolutionStepNoteFrame
				stepKind="Reading"
				requestId={requestId}
				presentation="Card"
				note={note}
			/>
		);
		return {
			heading: (
				<NotePartProvider value="heading">{frame}</NotePartProvider>
			),
			body: <NotePartProvider value="body">{frame}</NotePartProvider>,
		};
	}
	const stored = storedNotesOf(story).Reading;
	const resolving = committed(phase)
		? null
		: resolvingReadingNoteData({
				requestId,
				note,
				unitRoute: {
					language: "de",
					family: "Lexeme",
					kind: story.lemma.kind,
				} as NonNullable<
					Parameters<typeof resolvingReadingNoteData>[0]["unitRoute"]
				>,
			});
	/* The renderer keys a Note's Blocks by its owner key, and the app's
	   resolving Note has a placeholder for one, so its Blocks remount at
	   commit. Here the step is known by the key its stored Note will have. */
	const noteData = committed(phase)
		? stored
		: resolving && {
				...resolving,
				reading: {
					...resolving.reading,
					ownerKey: stored.reading.ownerKey,
				},
			};
	if (!noteData) return { heading: null, body: null };
	return renderFixtureNoteParts({
		noteData,
		presentation: "Card",
		follow,
	});
}

/**
 * The Attestation: its unit as written from the click, its caption once
 * Grammar has read the words, the stored Note once committed.
 */
function attestationParts(
	story: Story,
	phase: SessionPhase,
	requestId: string,
	clicked: number,
): CardParts {
	if (committed(phase))
		return renderNoteParts({
			noteData: storedNotesOf(story).Attestation,
			capabilities: {
				presentation: "Card",
				pagination: PAGINATION,
				follow,
				clickedSegmentIndex: clicked,
			},
		});
	/* the client holds the sentence and the unit before any result */
	const known =
		phase === "Clicked" || phase === "Selected" ? "Started" : phase;
	const note = resolutionNoteAt(story, requestId, known, clicked);
	if (!note) return { heading: null, body: null };
	const parts = resolvingAttestationNoteParts({
		title: resolvingUnitTitle(note),
		caption: resolvingAttestationCaption(note),
		segments: note.source.segments,
		memberSegmentIndices: note.source.memberSegmentIndices,
		settled: phase === "Failed",
		presentation: "Card",
		follow,
	});
	return { heading: parts.heading, body: parts.body };
}

/** One Card's parts at `phase`. */
export function cardParts(
	story: Story,
	role: Role,
	phase: SessionPhase,
	requestId: string,
	clicked: number,
): CardParts {
	const stored = storedNotesOf(story);
	const ids = storyIds(story);
	switch (role) {
		case "Reading":
			return readingParts(story, phase, requestId, clicked);
		case "Attestation":
			return attestationParts(story, phase, requestId, clicked);
		case "Surface":
			return renderNoteParts({
				noteData: stored.Surface,
				capabilities: {
					presentation: "Card",
					activeAnalysisKey: ids.surfaceId,
					pagination: PAGINATION,
					follow,
				},
			});
		case "Lemma":
			return renderNoteParts({
				noteData: stored.Lemma,
				capabilities: {
					presentation: "Card",
					pagination: PAGINATION,
					follow,
					activeReadingId: ids.readingId,
				},
			});
	}
}

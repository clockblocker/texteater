import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { ResolvingReadingHeading, type renderNote } from "@/notes";
import { knownUnitRoute, type ResolutionNote } from "@/views/resolution-deck";
import {
	PlacedNote,
	PlacedNoteSkeleton,
	useNotePart,
} from "@/workspace/note-part";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import type { UnitRoute } from "@/workspace/workspace-subject";
import { api } from "../../convex/_generated/api";
import type { Id, TableNames } from "../../convex/_generated/dataModel";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../../shared/knowledge-preferences";

type Presentation = "Card" | "Sheet";
type ReadingNoteData = Extract<
	Parameters<typeof renderNote>[0]["noteData"],
	{ readonly kind: "Reading" }
>;
type SourceContext = ReadingNoteData["sourceContexts"]["page"][number];

/**
 * What a running Resolution knows of its Reading: the Session's projection
 * once its first result arrives, and the clicked unit's route before then.
 */
export type ResolvingReading = {
	readonly requestId: string;
	readonly note: ResolutionNote | null;
	readonly unitRoute?: UnitRoute;
};

/**
 * The Reading Note of a Resolution that is still running, shaped exactly like
 * the stored Note it becomes. It is laid out by the unit's route until
 * Grammar gives the Reading's own, and headed by the clicked words until
 * Grammar gives the headword. The sentence is known from the Session's first
 * result; the emoji, Knowledge and identities are marked pending so the
 * renderer shows bones in their place. Identities are placeholders: the
 * `pending` marker keeps every block from following them. Null while no
 * route is known.
 */
export function resolvingReadingNoteData(
	resolving: ResolvingReading,
	options: { readonly animateArrivals?: boolean } = {},
): ReadingNoteData | null {
	const { requestId, note } = resolving;
	const grammar = note?.grammar;
	const route =
		grammar ??
		(note ? knownUnitRoute(note) : undefined) ??
		resolving.unitRoute;
	if (!route) return null;
	const animateArrivals = options.animateArrivals ?? true;
	const placeholder = <Table extends TableNames>(table: Table) =>
		`resolving:${requestId}:${table}` as Id<Table>;
	// The projection is per Kind, but spreading its fields loses that
	// correlation, so the assembled Reading is narrowed back to the Note's.
	const lemma = {
		unitKind: "Lemma" as const,
		ownerKind: "Lemma" as const,
		ownerKey: `resolving:${requestId}:Lemma`,
		lemmaId: placeholder("lemmas"),
		language: "de",
		family: route.family,
		kind: route.kind,
		canonicalForm: grammar?.canonicalForm ?? "",
		coreFeatures: grammar?.coreFeatures ?? {},
	};
	const reading = {
		unitKind: "Reading" as const,
		ownerKind: "Reading" as const,
		ownerKey: `resolving:${requestId}:Reading`,
		readingId: placeholder("readings"),
		lemma,
		emojiDescription: note?.reading?.emojiDescription ?? "",
	} as ReadingNoteData["reading"];
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: placeholder("readings") },
		reading,
		knowledgeState: { status: "Absent", activity: "Loading" },
		knowledge: {},
		personalAnnotation: "",
		knowledgeUpdatedAt: null,
		relations: [],
		relationsTruncated: false,
		grammaticalAlternatives: [],
		participleLinks: [],
		pendingRelations: [],
		structuralReferences: [],
		definitionText: { state: "Pending" },
		sourceContexts: {
			page: note
				? [resolvingSourceContext(note, placeholder("attestations"))]
				: [],
			continueCursor: "",
			isDone: true,
		},
		pending: {
			identity: true,
			emojiDescription: !note?.reading,
			emojiArrived: !!note?.reading && animateArrivals,
			...(grammar
				? { headwordArrived: animateArrivals }
				: {
						headword: {
							words: note ? resolvingWords(note) : null,
							resolving: true,
						},
					}),
			...(note ? {} : { sourceContexts: true }),
		},
	};
}

/**
 * The words a click selected, in order; a gap between members reads as an
 * ellipsis. Grammar's members once it chose them, else the stored unit's.
 */
export function resolvingWords(note: ResolutionNote): string {
	const { segments, memberSegmentIndices } = note.source;
	return memberSegmentIndices
		.map((index, position) => {
			const previous = memberSegmentIndices[position - 1];
			const text = segments[index]?.text ?? "";
			if (previous === undefined) return text;
			const between = segments.slice(previous + 1, index);
			if (between.length === 0) return text;
			return between.every(({ kind }) => kind === "Whitespace")
				? ` ${text}`
				: ` … ${text}`;
		})
		.join("");
}

/**
 * The clicked sentence as the Reading's first Source Context, quoted from the
 * stored Segments and members the server projects for the Session.
 */
function resolvingSourceContext(
	note: ResolutionNote,
	attestationId: Id<"attestations">,
): SourceContext {
	const { segments, memberSegmentIndices } = note.source;
	return {
		attestationId,
		textId: note.route.textId,
		sentencePosition: 0,
		sentenceSnippet: note.route.stitchedText,
		segments,
		memberSegmentIndices,
		memberTexts: memberSegmentIndices.flatMap((index) => {
			const segment = segments[index];
			return segment ? [segment.text] : [];
		}),
		origin: { kind: "Text" },
		target: {
			kind: "Text",
			textId: note.route.textId,
			focusAttestationId: attestationId,
			title: note.source.textTitle,
		},
	};
}

/**
 * Renders a running Resolution through the Reading Note renderer, or, before
 * any route is known, as a Reading Note's bones under the clicked words.
 */
export function ResolvingReadingNote({
	resolving,
	presentation,
	animateArrivals = true,
}: {
	resolving: ResolvingReading;
	presentation: Presentation;
	/** Off when this Note stands in for a stored one, so the emoji does not fade in twice. */
	animateArrivals?: boolean;
}) {
	const part = useNotePart();
	const noteData = resolvingReadingNoteData(resolving, { animateArrivals });
	if (noteData)
		return (
			<RenderedResolvingReading
				noteData={noteData}
				presentation={presentation}
			/>
		);
	if (part === "heading")
		return (
			<ResolvingReadingHeading
				words={resolving.note ? resolvingWords(resolving.note) : null}
				resolving
			/>
		);
	return <PlacedNoteSkeleton kind="Reading" presentation={presentation} />;
}

function RenderedResolvingReading({
	noteData,
	presentation,
}: {
	noteData: ReadingNoteData;
	presentation: Presentation;
}) {
	const visitorId = useAnonymousVisitorId();
	const { follow } = useWorkspaceInteraction();
	const settingsQuery = useQuery(
		convexQuery(api.knowledgeSettings.get, { visitorId }),
	);
	return (
		<PlacedNote
			input={{
				noteData,
				capabilities: {
					presentation,
					knowledgeSettings:
						settingsQuery.data ?? DEFAULT_KNOWLEDGE_SETTINGS,
					sourceContexts: {
						items: noteData.sourceContexts.page,
						hasMore: false,
						isLoading: false,
						error: null,
						loadMore: null,
					},
					personalAnnotation: {
						isSaving: false,
						error: null,
						save: null,
					},
					// Nothing here has an identity yet; the only real destination is
					// the source Text, reached without a focus on a placeholder occurrence.
					follow: (target) => {
						if (target.kind === "Text")
							follow({
								kind: "Text",
								textId: target.textId,
								...(target.title
									? { title: target.title }
									: {}),
							});
					},
				},
			}}
		/>
	);
}

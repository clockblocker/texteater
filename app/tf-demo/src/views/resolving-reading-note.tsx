import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { renderNote } from "@/notes";
import type { NoteDataFor } from "@/notes/universal/note/data";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import type { Id, TableNames } from "../../convex/_generated/dataModel";
import type { ResolutionNote } from "../../convex/model/resolutionSessions";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../../shared/knowledge-preferences";

type Presentation = "Card" | "Sheet";
type ReadingNoteData = NoteDataFor<"Reading">;
type SourceContext = ReadingNoteData["sourceContexts"]["page"][number];

/**
 * The Reading Note of a Resolution that is still running, shaped exactly like
 * the stored Note it becomes. The headword and route are known as soon as
 * Grammar resolves, the sentence since the click; the emoji, Knowledge and
 * identities are marked pending so the renderer shows bones in their place.
 * Identities are placeholders: the `pending` marker keeps every block from
 * following them.
 */
export function resolvingReadingNoteData(
	note: ResolutionNote,
	options: { readonly animateArrivals?: boolean } = {},
): ReadingNoteData | null {
	const grammar = note.grammar;
	if (!grammar) return null;
	const requestId = note.target.requestId;
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
		family: grammar.family,
		kind: grammar.kind,
		canonicalForm: grammar.canonicalForm,
		coreFeatures: grammar.coreFeatures,
	};
	const reading = {
		unitKind: "Reading" as const,
		ownerKind: "Reading" as const,
		ownerKey: `resolving:${requestId}:Reading`,
		readingId: placeholder("readings"),
		lemma,
		emojiDescription: note.reading?.emojiDescription ?? "",
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
			page: [resolvingSourceContext(note, placeholder("attestations"))],
			continueCursor: "",
			isDone: true,
		},
		pending: {
			identity: true,
			emojiDescription: !note.reading,
			emojiArrived: !!note.reading && (options.animateArrivals ?? true),
		},
	};
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
		},
	};
}

/** Renders a running Resolution through the Reading Note renderer. */
export function ResolvingReadingNote({
	note,
	presentation,
	animateArrivals = true,
}: {
	note: ResolutionNote;
	presentation: Presentation;
	/** Off when this Note stands in for a stored one, so the emoji does not fade in twice. */
	animateArrivals?: boolean;
}) {
	const visitorId = useAnonymousVisitorId();
	const { follow } = useWorkspaceInteraction();
	const settingsQuery = useQuery({
		...convexQuery(api.knowledgeSettings.get, { visitorId }),
		gcTime: 10_000,
	});
	const noteData = resolvingReadingNoteData(note, { animateArrivals });
	if (!noteData) return null;
	return renderNote({
		noteData,
		capabilities: {
			presentation,
			knowledgeSettings: settingsQuery.data ?? DEFAULT_KNOWLEDGE_SETTINGS,
			sourceContexts: {
				items: noteData.sourceContexts.page,
				hasMore: false,
				isLoading: false,
				error: null,
				loadMore: null,
			},
			personalAnnotation: { isSaving: false, error: null, save: null },
			// Nothing here has an identity yet; the only real destination is
			// the source Text, reached without a focus on a placeholder occurrence.
			follow: (target) => {
				if (target.kind === "Text")
					follow({ kind: "Text", textId: target.textId });
			},
		},
	});
}

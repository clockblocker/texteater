import { convexQuery } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { readingBlockLayoutQuery } from "@/notes";
import { routeNoteQueryArgs } from "@/views/route-note-view";
import type { WorkspaceCardTarget } from "@/workspace/workspace-controller";
import {
	activeAnalysisKeyOf,
	activeReadingIdOf,
} from "@/workspace/workspace-subject";
import { api } from "../../convex/_generated/api";

/**
 * Loads the stored Notes a Deck's Cards will show, each under the query its
 * view asks, so a Deck dealt after this settles shows no bones. It settles
 * when every Note has loaded or failed; a Card whose Note failed says so
 * itself.
 */
export function prefetchCardNotes(
	queryClient: QueryClient,
	visitorId: string,
	cards: readonly WorkspaceCardTarget[],
): Promise<void> {
	return Promise.all(
		cards.map((card) => prefetchCardNote(queryClient, visitorId, card)),
	).then(() => {});
}

function prefetchCardNote(
	queryClient: QueryClient,
	visitorId: string,
	{ target, presentationContext }: WorkspaceCardTarget,
): Promise<void> {
	switch (target.kind) {
		case "Reading":
			return prefetchReadingNote(
				queryClient,
				visitorId,
				target.readingId,
			);
		case "Lemma":
		case "Surface":
		case "Attestation":
			return queryClient.prefetchQuery(
				convexQuery(api.routeNotes.get, {
					...routeNoteQueryArgs(
						target,
						activeAnalysisKeyOf(presentationContext),
						activeReadingIdOf(presentationContext),
					),
					visitorId,
				}),
			);
		default:
			return Promise.resolve();
	}
}

/**
 * A Reading Note with what its view waits for besides: the Visitor's
 * Knowledge settings, and the Block layout its body is laid out by.
 */
async function prefetchReadingNote(
	queryClient: QueryClient,
	visitorId: string,
	readingId: string,
): Promise<void> {
	const [note] = await Promise.all([
		queryClient
			.fetchQuery(
				convexQuery(api.readingNotes.get, { readingId, visitorId }),
			)
			.catch(() => null),
		queryClient.prefetchQuery(
			convexQuery(api.knowledgeSettings.get, { visitorId }),
		),
	]);
	if (note?.kind !== "Reading") return;
	await queryClient.prefetchQuery(
		readingBlockLayoutQuery(visitorId, note.reading.lemma),
	);
}

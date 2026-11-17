import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { RouteNoteTarget } from "../../shared/navigation";

// The queries a Note's view asks for its data. They live apart from the views
// so that prefetching a Deck's Notes needs no view, and no Note renderer.

/** The stored Block layout a Reading of `lemma`'s Family and Kind is laid out by. */
export function readingBlockLayoutQuery(
	visitorId: string,
	lemma: {
		readonly language: string;
		readonly family: string;
		readonly kind: string;
	},
) {
	return convexQuery(api.readingBlockLayouts.getFamilyKind, {
		visitorId,
		route: {
			targetLanguage: lemma.language as "de",
			family: lemma.family,
			kind: lemma.kind,
		},
	});
}

/** The `routeNotes.get` arguments a Route Note asks with, but for the Visitor. */
export function routeNoteQueryArgs(
	target: RouteNoteTarget,
	activeAnalysisKey?: Id<"surfaces">,
	activeReadingId?: Id<"readings">,
) {
	switch (target.kind) {
		case "Lemma":
			return {
				target: {
					kind: "Lemma" as const,
					lemmaId: target.lemmaId,
				},
			};
		case "Surface":
			return {
				target: {
					kind: "Surface" as const,
					language: target.language,
					normalizedSurface: target.normalizedSurface,
					...(activeAnalysisKey !== undefined
						? { activeAnalysisKey }
						: {}),
					...(activeReadingId !== undefined
						? { activeReadingId }
						: {}),
				},
			};
		case "Attestation":
			return {
				target: {
					kind: "Attestation" as const,
					attestationId: target.attestationId,
				},
			};
	}
}

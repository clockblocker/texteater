import type { Infer } from "convex/values";
import { derivePendingSemanticRelationLocator } from "dumdict/pending";
import {
	type LoadReadingEntryContextRequest,
	makeSurfaceId,
} from "dumdict/planning";

import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import { pendingLocatorIndexKey } from "../model/dumdictPendingIndexes";
import type { lemmaValueValidator } from "../model/validators";

/**
 * The Convex-side key set for one Reading Entry context read.
 *
 * Both dictionary adapters build the same keys from a Dumdict storage request:
 * the action adapter sends them across a query hop, the mutation adapter reads
 * them in its own transaction.
 */
export type ReadingEntryContextArgs =
	| {
			readonly intent: "addNewNote";
			readonly lemmaKey: string;
			readonly proposedLemma: Infer<typeof lemmaValueValidator>;
			readonly readingKey: string;
			readonly surfaceKeys: string[];
			readonly explicitLemmaTargetKeys: string[];
			readonly pendingLocatorKeys: string[];
			readonly pendingTargetCanonicalForms: string[];
	  }
	| {
			readonly intent: "applyGeneratedKnowledge";
			readonly readingKey: string;
			readonly pendingLocatorKeys: string[];
			readonly pendingTargetCanonicalForms: string[];
			readonly relationTargetLemmaKeys: string[];
			readonly relationTargetReadingKeys: string[];
	  }
	| {
			readonly intent: "ensureOwnedSurface";
			readonly lemmaKey: string;
			readonly readingKey: string;
			readonly surfaceKey: string;
	  }
	| {
			readonly intent: "ensureReadingEntry";
			readonly lemmaKey: string;
			readonly readingKey: string;
	  };

export function readingEntryContextArgs(
	request: LoadReadingEntryContextRequest<"de">,
): ReadingEntryContextArgs {
	const readingKey = readingIdentityKey(request.reading);
	switch (request.intent) {
		case "addNewNote":
			return {
				intent: request.intent,
				lemmaKey: lemmaIdentityKey(request.reading.lemma),
				proposedLemma: request.reading.lemma,
				readingKey,
				surfaceKeys: request.ownedSurfaces.map((surface) =>
					makeSurfaceId("de", surface),
				),
				explicitLemmaTargetKeys: request.relations.flatMap(
					({ target }) =>
						target.kind === "existing"
							? [lemmaIdentityKey(target.lemma)]
							: [],
				),
				pendingLocatorKeys: request.relations.flatMap(({ target }) =>
					target.kind === "pending"
						? [
								pendingLocatorIndexKey(
									derivePendingSemanticRelationLocator(
										request.reading,
										target.pending,
									),
								),
							]
						: [],
				),
				pendingTargetCanonicalForms: request.relations.flatMap(
					({ target }) =>
						target.kind === "pending"
							? [target.pending.target.canonicalForm]
							: [],
				),
			};
		case "applyGeneratedKnowledge":
			return {
				intent: request.intent,
				readingKey,
				pendingLocatorKeys: request.pendingRelations.map((pending) =>
					pendingLocatorIndexKey(
						derivePendingSemanticRelationLocator(
							request.reading,
							pending,
						),
					),
				),
				pendingTargetCanonicalForms: request.pendingRelations.map(
					({ target }) => target.canonicalForm,
				),
				relationTargetLemmaKeys: request.relationTargetLemmas.map(
					(lemma) => lemmaIdentityKey(lemma),
				),
				relationTargetReadingKeys: request.relationTargetReadings.map(
					(reading) => readingIdentityKey(reading),
				),
			};
		case "ensureOwnedSurface":
			return {
				intent: request.intent,
				lemmaKey: lemmaIdentityKey(request.reading.lemma),
				readingKey,
				surfaceKey: makeSurfaceId("de", request.surface),
			};
		case "ensureReadingEntry":
			return {
				intent: request.intent,
				lemmaKey: lemmaIdentityKey(request.reading.lemma),
				readingKey,
			};
	}
}

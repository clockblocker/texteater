import { lemmaKey, readingKey } from "../core/identity";
import { planCleanupRelations } from "../core/plan-mutation";
import { isKnownRelation } from "../core/relations/rules";
import { validateCleanupRelationsSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type { CleanupRelationsRequest, MutationResult } from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { assertLanguageMatches } from "./language-guard";
import { mutationResultFromCommit } from "./result-mapping";

function sourceKeyFor<L extends SupportedLanguage>(
	resolution: CleanupRelationsRequest<L>["resolutions"][number],
) {
	return resolution.relationFamily === "lexical"
		? readingKey(resolution.sourceReading)
		: lemmaKey(resolution.sourceLemma);
}

function hasDuplicateResolutionKey<L extends SupportedLanguage>(
	request: CleanupRelationsRequest<L>,
) {
	const keys = request.resolutions.map(
		(resolution) =>
			`${resolution.relationFamily}:${sourceKeyFor(resolution)}:${resolution.relation}:${resolution.targetPendingId}`,
	);
	return new Set(keys).size !== keys.length;
}

export async function cleanupRelations<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: CleanupRelationsRequest<L>,
): Promise<MutationResult<L>> {
	for (const resolution of request.resolutions) {
		if (resolution.relationFamily === "lexical") {
			assertLanguageMatches(
				options.language,
				resolution.sourceReading.lemma.language,
			);
			if (resolution.targetReading) {
				assertLanguageMatches(
					options.language,
					resolution.targetReading.lemma.language,
				);
			}
		} else {
			assertLanguageMatches(
				options.language,
				resolution.sourceLemma.language,
			);
			if (resolution.targetLemma) {
				assertLanguageMatches(
					options.language,
					resolution.targetLemma.language,
				);
			}
		}
	}
	if (request.resolutions.length === 0) {
		return {
			status: "applied",
			baseRevision: request.baseRevision,
			nextRevision: request.baseRevision,
			affected: {},
			summary: { message: "No relations cleaned up." },
		};
	}
	if (
		hasDuplicateResolutionKey(request) ||
		request.resolutions.some(
			(resolution) =>
				!isKnownRelation(resolution.relation) ||
				(resolution.relationFamily === "lexical" &&
					![
						"synonym",
						"nearSynonym",
						"antonym",
						"hypernym",
						"hyponym",
						"meronym",
						"holonym",
					].includes(resolution.relation)) ||
				(resolution.relationFamily === "morphological" &&
					![
						"consistsOf",
						"usedIn",
						"derivedFrom",
						"sourceFor",
					].includes(resolution.relation)),
		)
	) {
		return {
			status: "rejected",
			code: "invalidRequest",
			message: "Cleanup resolution is invalid or duplicated.",
		};
	}

	const slice = await options.storage.loadCleanupRelationsContext({
		resolutions: request.resolutions,
	});
	validateCleanupRelationsSlice(options.language, slice);

	if (slice.revision !== request.baseRevision) {
		return {
			status: "conflict",
			code: "revisionConflict",
			baseRevision: request.baseRevision,
			latestRevision: slice.revision,
			message: "Cleanup workset is stale.",
		};
	}

	const targetReadings = new Set(
		slice.targetReadings.map(({ reading }) => readingKey(reading.reading)),
	);
	const targetLemmas = new Set(
		slice.targetLemmas.map(({ lemma }) => lemmaKey(lemma)),
	);
	for (const resolution of request.resolutions) {
		if (
			(resolution.relationFamily === "lexical" &&
				resolution.targetReading &&
				!targetReadings.has(readingKey(resolution.targetReading))) ||
			(resolution.relationFamily === "morphological" &&
				resolution.targetLemma &&
				!targetLemmas.has(lemmaKey(resolution.targetLemma)))
		) {
			return {
				status: "conflict",
				code: "semanticPreconditionFailed",
				baseRevision: request.baseRevision,
				latestRevision: slice.revision,
				message: "Cleanup target no longer exists.",
			};
		}
	}

	const pendingRelationKeys = new Set(
		slice.pendingRelations.map((relation) => {
			const source =
				relation.relationFamily === "lexical"
					? readingKey(relation.sourceReading)
					: lemmaKey(relation.sourceLemma);
			return `${relation.relationFamily}:${source}:${relation.relation}:${relation.targetPendingId}`;
		}),
	);
	for (const resolution of request.resolutions) {
		const key = `${resolution.relationFamily}:${sourceKeyFor(resolution)}:${resolution.relation}:${resolution.targetPendingId}`;
		if (!pendingRelationKeys.has(key)) {
			return {
				status: "conflict",
				code: "semanticPreconditionFailed",
				baseRevision: request.baseRevision,
				latestRevision: slice.revision,
				message: "Cleanup pending relation no longer exists.",
			};
		}
	}

	const plan = planCleanupRelations(slice, request);
	if (plan.status === "rejected") {
		return plan;
	}
	const commit = await options.storage.commitChanges({
		baseRevision: plan.baseRevision,
		changes: plan.changes,
	});
	return mutationResultFromCommit(plan, commit);
}

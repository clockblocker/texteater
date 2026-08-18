import { readingFingerprint } from "dumling";
import { semanticRelationSchema } from "dumrel";
import { planCleanupRelations } from "../core/plan-mutation";
import { validateCleanupRelationsSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type {
	CleanupRelationsRequest,
	DumdictMutationOptions,
	MutationResult,
} from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { applyPlan } from "./apply-plan";
import { assertLanguageMatches } from "./language-guard";

function locatorKey(
	value: CleanupRelationsRequest<SupportedLanguage>["resolutions"][number]["locator"],
) {
	return `${value.sourceReadingKey}\0${value.relation}\0${value.targetPendingId}`;
}

export async function cleanupRelations<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: CleanupRelationsRequest<L>,
	mutationOptions?: DumdictMutationOptions<L>,
): Promise<MutationResult<L>> {
	for (const resolution of request.resolutions) {
		if (resolution.targetReading) {
			assertLanguageMatches(
				options.language,
				resolution.targetReading.lemma.language,
			);
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
	const keys = request.resolutions.map(({ locator }) => locatorKey(locator));
	if (
		new Set(keys).size !== keys.length ||
		request.resolutions.some(
			({ locator }) =>
				!semanticRelationSchema.safeParse(locator.relation).success,
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
		slice.targetReadings.map(({ reading }) =>
			readingFingerprint(reading.reading),
		),
	);
	for (const resolution of request.resolutions) {
		if (
			resolution.targetReading &&
			!targetReadings.has(readingFingerprint(resolution.targetReading))
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
	const pendingKeys = new Set(
		slice.pendingRelations.map(({ locator }) => locatorKey(locator)),
	);
	for (const resolution of request.resolutions) {
		if (!pendingKeys.has(locatorKey(resolution.locator))) {
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
	if (plan.status === "rejected") return plan;
	return applyPlan(options, plan, mutationOptions);
}

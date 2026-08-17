import { readingFingerprint } from "dumling";
import { inverseRelationFor, unitShadowSchema } from "dumrel";
import type {
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
	Reading,
} from "../../dto";
import type { SupportedLanguage } from "../../dumling";
import type { CleanupRelationsRequest } from "../../public";
import type { CleanupRelationsSlice } from "../../storage";
import { sameReading } from "../identity";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

function locatorKey<L extends SupportedLanguage>(
	value: PendingSemanticRelationLocator<L>,
) {
	return `${value.sourceReadingKey}\0${value.relation}\0${value.targetPendingId}`;
}

function targetMatches<L extends SupportedLanguage>(
	target: Reading<L>,
	record: PendingSemanticRelationRecord<L>,
) {
	const lemma = target.lemma;
	const shadow = unitShadowSchema.parse(record.pending.target);
	const targetShadow = unitShadowSchema.parse({
		language: lemma.language,
		canonicalForm: lemma.canonicalForm,
		family: lemma.family,
		kind: lemma.kind,
	});
	return (
		targetShadow.language === shadow.language &&
		targetShadow.canonicalForm === shadow.canonicalForm &&
		targetShadow.family === shadow.family &&
		targetShadow.kind === shadow.kind
	);
}

export function planCleanupRelations<L extends SupportedLanguage>(
	slice: CleanupRelationsSlice<L>,
	request: CleanupRelationsRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const keys = request.resolutions.map(({ locator }) => locatorKey(locator));
	if (new Set(keys).size !== keys.length) {
		return {
			status: "rejected",
			code: "invalidRequest",
			message: "Duplicate cleanup resolutions are not allowed.",
		};
	}

	const pendingByKey = new Map(
		slice.pendingRelations.map(
			(record) => [locatorKey(record.locator), record] as const,
		),
	);
	const targetReadings = new Set(
		slice.targetReadings.map(({ reading }) =>
			readingFingerprint(reading.reading),
		),
	);

	for (const resolution of request.resolutions) {
		const record = pendingByKey.get(locatorKey(resolution.locator));
		if (!record) continue;
		if (
			record.sourceReading.lemma.language !==
			record.pending.target.language
		) {
			return {
				status: "rejected",
				code: "invalidRequest",
				message:
					"Pending Semantic Relation endpoints must use the same language.",
			};
		}
		if (!resolution.targetReading) continue;
		if (sameReading(resolution.targetReading, record.sourceReading)) {
			return {
				status: "rejected",
				code: "selfRelation",
				message: "A Reading cannot relate directly to itself.",
			};
		}
		if (!targetReadings.has(readingFingerprint(resolution.targetReading))) {
			return {
				status: "rejected",
				code: "relationTargetMissing",
				message: "Cleanup target Reading is missing.",
			};
		}
		if (!targetMatches(resolution.targetReading, record)) {
			return {
				status: "rejected",
				code: "invalidRequest",
				message:
					"Cleanup target Reading must exactly match the pending Unit Shadow.",
			};
		}
	}

	const changes: PlanMutationResult<L>["changes"] = [];
	const affectedReadings = new Map<string, Reading<L>>();
	const affectedPendingIds = new Set<string>();
	for (const resolution of request.resolutions) {
		const record = pendingByKey.get(locatorKey(resolution.locator));
		if (!record) continue;
		if (resolution.targetReading) {
			const target = resolution.targetReading;
			changes.push(
				{
					type: "patchReading",
					reading: record.sourceReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								owner: {
									kind: "Reading",
									reading: record.sourceReading,
								},
								change: {
									kind: "Contribute",
									aspect: "semanticRelations",
									relation: record.pending.relation,
									value: [target],
								},
							},
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision: slice.revision },
						{
							kind: "readingExists",
							reading: record.sourceReading,
						},
						{ kind: "readingExists", reading: target },
					],
				},
				{
					type: "patchReading",
					reading: target,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								owner: { kind: "Reading", reading: target },
								change: {
									kind: "Contribute",
									aspect: "semanticRelations",
									relation: inverseRelationFor(
										record.pending.relation,
									),
									value: [record.sourceReading],
								},
							},
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision: slice.revision },
						{ kind: "readingExists", reading: target },
					],
				},
			);
			affectedReadings.set(readingFingerprint(target), target);
			affectedReadings.set(
				readingFingerprint(record.sourceReading),
				record.sourceReading,
			);
		}
		changes.push({
			type: "deletePendingSemanticRelation",
			record,
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "pendingRelationExists", record },
			],
		});
		affectedPendingIds.add(record.locator.targetPendingId);
	}

	return {
		status: "planned",
		baseRevision: slice.revision,
		changes,
		affected: {
			readings:
				affectedReadings.size > 0
					? Array.from(affectedReadings.values())
					: undefined,
			pendingIds:
				affectedPendingIds.size > 0
					? Array.from(affectedPendingIds)
					: undefined,
		},
		summary: {
			message:
				request.resolutions.length === 1
					? "Cleaned up 1 relation."
					: `Cleaned up ${request.resolutions.length} relations.`,
		},
	};
}

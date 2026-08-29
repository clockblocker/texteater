import type { Infer } from "convex/values";
import type { DumdictPlan } from "dumdict/runtime";
import type { Reading } from "dumling/reading";

import type { dictionaryPlanValidator } from "../model/validators";

export type DictionaryPlanResult = Infer<typeof dictionaryPlanValidator>;

function mutableReading(input: Reading<"de">) {
	return { ...input, lemma: { ...input.lemma } };
}

function mutablePendingRecord(
	input: Extract<
		DumdictPlan<"de">["changes"][number],
		{
			type:
				| "createPendingSemanticRelation"
				| "deletePendingSemanticRelation";
		}
	>["record"],
) {
	return {
		sourceReading: mutableReading(input.sourceReading),
		pending: {
			...input.pending,
			target: { ...input.pending.target },
		},
		locator: { ...input.locator },
	};
}

function mutablePreconditions(
	input: DumdictPlan<"de">["changes"][number]["preconditions"],
) {
	return input.map((precondition) => {
		switch (precondition.kind) {
			case "lemmaExists":
			case "lemmaMissing":
				return { ...precondition, lemma: { ...precondition.lemma } };
			case "readingExists":
			case "readingMissing":
			case "readingAttestationMissing":
				return {
					...precondition,
					reading: mutableReading(precondition.reading),
				};
			case "pendingRelationExists":
			case "pendingRelationMissing":
				return {
					...precondition,
					record: mutablePendingRecord(precondition.record),
				};
			default:
				return { ...precondition };
		}
	});
}

/** Converts the package plan into the mutable Convex transport shape. */
export function dictionaryPlanResult(
	input: DumdictPlan<"de">,
): DictionaryPlanResult {
	return {
		baseRevision: input.baseRevision,
		changes: input.changes.map((change) => {
			const preconditions = mutablePreconditions(change.preconditions);
			switch (change.type) {
				case "createLemma":
					return {
						...change,
						record: {
							...change.record,
							lemma: { ...change.record.lemma },
						},
						preconditions,
					};
				case "createReading":
					return {
						...change,
						entry: {
							...change.entry,
							reading: mutableReading(change.entry.reading),
							attestedTranslations: [
								...change.entry.attestedTranslations,
							],
							attestations: [...change.entry.attestations],
						},
						preconditions,
					};
				case "patchReading":
					return {
						...change,
						reading: mutableReading(change.reading),
						ops: change.ops.map((operation) =>
							operation.kind === "addAttestation"
								? { ...operation }
								: {
										...operation,
										envelope: {
											...operation.envelope,
											reading: mutableReading(
												operation.envelope.reading,
											),
										},
									},
						),
						preconditions,
					};
				case "createOwnedSurface":
					return {
						...change,
						entry: {
							...change.entry,
							ownerLemma: { ...change.entry.ownerLemma },
							surface: {
								...change.entry.surface,
								lemma: { ...change.entry.surface.lemma },
							},
							attestedTranslations: [
								...change.entry.attestedTranslations,
							],
							attestations: [...change.entry.attestations],
						},
						preconditions,
					};
				case "createPendingSemanticRelation":
				case "deletePendingSemanticRelation":
					return {
						...change,
						record: mutablePendingRecord(change.record),
						preconditions,
					};
				default: {
					const unsupported: never = change;
					throw new Error(
						`Unsupported Dumdict plan change: ${String(unsupported)}`,
					);
				}
			}
		}),
	};
}

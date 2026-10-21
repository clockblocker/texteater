import type { Infer } from "convex/values";
import type { DumdictPlan } from "dumdict/planning";

import type { dictionaryPlanValidator } from "../model/validators";

export type DictionaryPlanResult = Infer<typeof dictionaryPlanValidator>;

/** Copies a plan Reading; a Core value set (ihm's gender Masc, Neut) arrives readonly. */
function mutableReading<
	Reading extends { readonly lemma: { readonly coreFeatures: object } },
>(input: Reading) {
	return {
		...input,
		lemma: {
			...input.lemma,
			coreFeatures: Object.fromEntries(
				Object.entries(input.lemma.coreFeatures).map(
					([name, value]) => [
						name,
						Array.isArray(value) ? [...value] : value,
					],
				),
			),
		},
	};
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
		...(input.resolvedLemma === undefined
			? {}
			: {
					resolvedLemma: mutableReading({
						lemma: input.resolvedLemma,
					}).lemma,
				}),
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
			case "attestationMissing":
			case "attestationLinkExists":
				throw hostGraphOwnsAttestations();
			default:
				return { ...precondition };
		}
	});
}

/** A Reading Entry's links, which tf-demo's host graph keeps instead. */
function noLinks(links: readonly unknown[]): never[] {
	if (links.length > 0) throw hostGraphOwnsAttestations();
	return [];
}

/** tf-demo keeps occurrences in its host graph (tf-demo ADR 0001). */
function hostGraphOwnsAttestations(): Error {
	return new Error(
		"tf-demo stores occurrence Attestations in its host graph, not in Dumdict entries.",
	);
}

/**
 * Converts the package plan into the mutable Convex transport shape. Its base
 * revision is dropped: a plan commits against the transaction's own reads.
 */
export function dictionaryPlanResult(
	input: Pick<DumdictPlan<"de">, "changes">,
): DictionaryPlanResult {
	return {
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
							attestationLinks: noLinks(
								change.entry.attestationLinks,
							),
						},
						preconditions,
					};
				case "patchReading":
					return {
						...change,
						reading: mutableReading(change.reading),
						ops: change.ops.map((operation) => {
							if (operation.kind !== "applyKnowledgeChange")
								throw hostGraphOwnsAttestations();
							return {
								...operation,
								envelope: {
									...operation.envelope,
									reading: mutableReading(
										operation.envelope.reading,
									),
								},
							};
						}),
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
				case "setLemmaParadigm":
				case "deleteReading":
				case "deleteOwnedSurface":
				case "deleteLemma":
					throw new Error(
						`tf-demo does not commit a Dumdict ${change.type} change (texteater#1232).`,
					);
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

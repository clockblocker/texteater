import { readingFingerprint } from "dumling/id";
import type { Reading, SupportedLanguage } from "dumling/types";
import { fixedKnowledgeFor } from "dumrel/fixed";
import type { KnowledgeChange } from "dumrel/types";
import { planApplyGeneratedKnowledge } from "../core/plan-mutation";
import {
	parseKnowledgeChangeForDumdictRuntime,
	parsePendingSemanticRelationForDumdictRuntime,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import type {
	ApplyGeneratedKnowledgeRequest,
	DumdictMutationOptions,
	MutationResult,
} from "../public";
import { applyPlan } from "./apply-plan";
import { assertLanguageMatches } from "./language-guard";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export async function applyGeneratedKnowledge<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: ApplyGeneratedKnowledgeRequest<L>,
	mutationOptions?: DumdictMutationOptions<L>,
): Promise<MutationResult<L>> {
	assertLanguageMatches(options.language, request.reading.lemma.language);
	const changes = request.changes.map((change) =>
		unwrapDumdictParse(parseKnowledgeChangeForDumdictRuntime(change)),
	);
	const semanticChanges = changes.filter(
		(
			change,
		): change is Extract<
			KnowledgeChange,
			{ aspect: "semanticRelations" }
		> => change.aspect === "semanticRelations",
	);
	if (
		semanticChanges.length > 0 &&
		!approvedFixedReadingTargetChanges(request.reading, semanticChanges)
	) {
		return {
			status: "rejected",
			code: "invalidRequest",
			message:
				"Generated direct relations must enter as pending Unit Shadows unless they exactly match a reviewed fixed Reading-targeted set.",
		};
	}
	const pendingRelations = request.pendingRelations.map((pending) =>
		unwrapDumdictParse(
			parsePendingSemanticRelationForDumdictRuntime(pending),
		),
	) as unknown as ApplyGeneratedKnowledgeRequest<L>["pendingRelations"];
	for (const pending of pendingRelations)
		assertLanguageMatches(options.language, pending.target.language);

	const normalizedRequest = {
		reading: request.reading,
		changes,
		pendingRelations,
	} as ApplyGeneratedKnowledgeRequest<L>;
	const slice = await options.storage.loadNewNoteContext({
		draft: {
			reading: request.reading,
			note: { attestedTranslations: [], attestations: [], notes: "" },
			relations: pendingRelations.map((pending) => ({
				target: { kind: "pending" as const, pending },
			})),
		},
	});
	options.sliceValidation.newNote(slice);
	const plan = planApplyGeneratedKnowledge(slice, normalizedRequest);
	if (plan.status === "rejected") return plan;
	return applyPlan(options, plan, mutationOptions);
}

function approvedFixedReadingTargetChanges<L extends SupportedLanguage>(
	reading: Reading<L>,
	changes: readonly Extract<
		KnowledgeChange,
		{ aspect: "semanticRelations" }
	>[],
): boolean {
	const fixed = fixedKnowledgeFor(reading as unknown as Reading);
	if (
		fixed.decision !== "Found" ||
		fixed.coverage.semanticRelationTargetKind !== "reading" ||
		fixed.knowledge.semanticRelations?.targetKind !== "reading"
	)
		return false;
	const approved = fixed.knowledge.semanticRelations.synonym ?? [];
	const approvedKeys = approved.map(readingFingerprint).toSorted();
	return changes.every(
		(change) =>
			change.kind !== "Retract" &&
			change.targetKind === "reading" &&
			change.relation === "synonym" &&
			change.value.map(readingFingerprint).toSorted().join("\0") ===
				approvedKeys.join("\0"),
	);
}

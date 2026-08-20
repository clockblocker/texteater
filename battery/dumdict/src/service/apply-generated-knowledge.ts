import type { SupportedLanguage } from "dumling/types";
import {
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
} from "dumrel/schema";
import { planApplyGeneratedKnowledge } from "../core/plan-mutation";
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
		knowledgeChangeSchema.parse(change),
	);
	if (changes.some(({ aspect }) => aspect === "semanticRelations")) {
		return {
			status: "rejected",
			code: "invalidRequest",
			message:
				"Generated direct relations must enter as pending Unit Shadows.",
		};
	}
	const pendingRelations = request.pendingRelations.map((pending) =>
		pendingSemanticRelationSchema.parse(pending),
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

import type { SupportedLanguage } from "dumling/types";
import { planEnsureReadingEntry } from "../core/plan-mutation";
import type {
	DumdictMutationOptions,
	EnsureReadingEntryRequest,
	MutationResult,
} from "../public";
import { applyPlan } from "./apply-plan";
import { assertLanguageMatches } from "./language-guard";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export async function ensureReadingEntry<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: EnsureReadingEntryRequest<L>,
	mutationOptions?: DumdictMutationOptions<L>,
): Promise<MutationResult<L>> {
	assertLanguageMatches(
		options.language,
		request.entry.reading.lemma.language,
	);
	if (request.entry.knowledge?.semanticRelations !== undefined) {
		return {
			status: "rejected",
			code: "invalidRequest",
			message:
				"ensureReadingEntry does not accept Semantic Relations; use a relation-aware Dumdict workflow.",
		};
	}

	const slice = await options.storage.loadNewNoteContext({
		draft: {
			reading: request.entry.reading,
			note: {
				attestedTranslations: request.entry.attestedTranslations,
				attestations: request.entry.attestations,
				notes: request.entry.notes,
			},
		},
	});
	const plan = planEnsureReadingEntry(slice, request);
	if (plan.status === "rejected") return plan;
	return applyPlan(options, plan, mutationOptions);
}

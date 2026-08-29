import type { Infer } from "convex/values";

import type { MutationCtx } from "./_generated/server";
import {
	hasDumdictLemma,
	loadDumdictReadingEntryByKey,
	loadDumdictRevision,
} from "./dumdictStorage/storage";
import { applyDumdictPlanInTransaction } from "./dumdictStorage/transaction";
import type { dictionaryPlanValidator } from "./model/validators";

export type DumdictTransactionPlan = Infer<typeof dictionaryPlanValidator>;

export type DumdictTransactionCommit =
	| { readonly status: "committed"; readonly nextRevision: string }
	| {
			readonly status: "conflict";
			readonly code: "revisionConflict" | "semanticPreconditionFailed";
			readonly latestRevision?: string;
			readonly message?: string;
	  };

export type DumdictTransaction = {
	/** Apply an ordinary Dumdict plan inside the caller's Convex transaction. */
	readonly commit: (
		plan: DumdictTransactionPlan,
	) => Promise<DumdictTransactionCommit>;
	readonly readRevision: () => Promise<string>;
	readonly containsLemma: (lemma: unknown) => Promise<boolean>;
	readonly loadReadingEntry: (readingKey: string) => Promise<unknown | null>;
};

/**
 * Transaction-local Shared Demo Dictionary persistence seam.
 *
 * The returned module never opens a nested Convex transaction. Dictionary
 * writes therefore commit or roll back with the host occurrence, generated
 * Knowledge, or fixed-member write that requested them.
 */
export function createDumdictTransaction(ctx: MutationCtx): DumdictTransaction {
	return {
		commit: (plan) => applyDumdictPlanInTransaction(ctx, plan),
		readRevision: () => loadDumdictRevision(ctx),
		containsLemma: (lemma) => hasDumdictLemma(ctx, lemma),
		loadReadingEntry: (readingKey) =>
			loadDumdictReadingEntryByKey(ctx, readingKey),
	};
}

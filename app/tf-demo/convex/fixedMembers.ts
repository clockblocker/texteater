"use node";

import { type FunctionReference, makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import type { DumdictPlan, ReadingEntry } from "dumdict";
import { createDumdictService } from "dumdict/runtime";
import { readingFingerprint } from "dumling/reading";
import type { Lemma } from "dumling/types";
import type { GrammaticalRelationClaim } from "dumrel/types";
import { assembleFixedInventory } from "../server/fixedMemberAssembly";
import { action } from "./_generated/server";
import { createConvexDumdictStorage } from "./orchestration";

const MAX_COMMIT_ATTEMPTS = 3;

type CommitFixedMemberResult =
	| { status: "loaded" }
	| { status: "unchanged" }
	| { status: "conflict" };

const commitFixedLemma = makeFunctionReference<
	"mutation",
	{ lemma: Lemma<"de"> },
	{ status: "loaded" | "unchanged" }
>("fixedMemberPersistence:commitFixedLemma") as unknown as FunctionReference<
	"mutation",
	"internal",
	{ lemma: Lemma<"de"> },
	{ status: "loaded" | "unchanged" }
>;

const commitFixedMember = makeFunctionReference<
	"mutation",
	{
		plan: DumdictPlan<"de">;
		readingKey: string;
		expectedEntry: ReadingEntry<"de">;
	},
	CommitFixedMemberResult
>("fixedMemberPersistence:commitFixedMember") as unknown as FunctionReference<
	"mutation",
	"internal",
	{
		plan: DumdictPlan<"de">;
		readingKey: string;
		expectedEntry: ReadingEntry<"de">;
	},
	CommitFixedMemberResult
>;

const commitFixedGrammaticalRelation = makeFunctionReference<
	"mutation",
	{ claim: GrammaticalRelationClaim },
	{ status: "loaded" | "unchanged" }
>(
	"fixedMemberPersistence:commitFixedGrammaticalRelation",
) as unknown as FunctionReference<
	"mutation",
	"internal",
	{ claim: GrammaticalRelationClaim },
	{ status: "loaded" | "unchanged" }
>;

export const load = action({
	args: {},
	returns: v.object({
		loaded: v.number(),
		unchanged: v.number(),
		total: v.number(),
	}),
	handler: async (ctx) => {
		const {
			lemmas,
			readingEntries: entries,
			grammaticalRelations,
		} = assembleFixedInventory();
		let loaded = 0;
		let unchanged = 0;
		for (const lemma of lemmas) {
			const committed = await ctx.runMutation(commitFixedLemma, {
				lemma,
			});
			if (committed.status === "loaded") loaded += 1;
			else unchanged += 1;
		}
		for (const entry of entries) {
			let settled = false;
			for (let attempt = 0; attempt < MAX_COMMIT_ATTEMPTS; attempt += 1) {
				let capturedPlan: DumdictPlan<"de"> | undefined;
				const planned = await createDumdictService({
					language: "de",
					storage: createConvexDumdictStorage(ctx),
				}).ensureReadingEntry(
					{ entry },
					{
						applyPlan: async (plan) => {
							capturedPlan = plan;
							return {
								status: "committed",
								nextRevision: plan.baseRevision,
							};
						},
					},
				);
				if (planned.status === "rejected") {
					throw new Error(
						`Fixed member was rejected: ${planned.code}.`,
					);
				}
				if (!capturedPlan) {
					throw new Error(
						"Dumdict did not produce a fixed-member plan.",
					);
				}
				const committed = await ctx.runMutation(commitFixedMember, {
					plan: capturedPlan,
					readingKey: readingFingerprint(entry.reading),
					expectedEntry: entry,
				});
				if (committed.status === "conflict") continue;
				if (committed.status === "loaded") loaded += 1;
				else unchanged += 1;
				settled = true;
				break;
			}
			if (!settled) {
				throw new Error(
					"Fixed-member loading exceeded its retry budget.",
				);
			}
		}
		for (const claim of grammaticalRelations) {
			const committed = await ctx.runMutation(
				commitFixedGrammaticalRelation,
				{ claim },
			);
			if (committed.status === "loaded") loaded += 1;
			else unchanged += 1;
		}
		return {
			loaded,
			unchanged,
			total: lemmas.length + entries.length + grammaticalRelations.length,
		};
	},
});

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

const MAX_BATCHES = 1_000;
const DESCRIPTOR_PAGE_SIZE = 20;

type ReadingCleanupCursor = {
	itemIndex: number;
	phase:
		| "PendingRelations"
		| "KnowledgeChanges"
		| "StructuralReferences"
		| "AccumulatedKnowledge"
		| "GenerationAttempts"
		| "GeneratedRelationRuns"
		| "GeneratedRelationProposals"
		| "PersonalAnnotations"
		| "OutgoingSemanticEdges"
		| "IncomingSemanticEdges"
		| "Reading";
};

type LemmaCleanupCursor = {
	itemIndex: number;
	phase: "Surfaces" | "IncomingSemanticEdges" | "Lemma";
};

export type StripTextAnalysisResult = {
	removed: number;
	deletedReadings: number;
	deletedLemmas: number;
};

/**
 * Removes one Text's derived graph while preserving the Text and Sentences.
 * Shared Readings, Lemmas, and Surfaces survive when another occurrence still
 * uses them; source-owned Knowledge and relation data are pruned with orphans.
 * Protected Readings are never pruned even when they lose their last source,
 * so a Reading whose own Definition Text is being replaced keeps its Knowledge.
 */
export async function stripTextAnalysisGraph(
	ctx: ActionCtx,
	textId: Id<"texts">,
	options: {
		readonly protectedReadingKeys?: readonly string[];
		/**
		 * A pruned Reading takes its own Definition Text with it. The nested
		 * removal runs without this cascade so the work stays bounded.
		 */
		readonly removeDefinitionTexts?: boolean;
	} = {},
): Promise<StripTextAnalysisResult> {
	const candidates = await ctx.runQuery(
		internal.demoReset.getTextAnalysisCandidates,
		{ textId },
	);
	if (!candidates) {
		return { removed: 0, deletedReadings: 0, deletedLemmas: 0 };
	}
	let removed = 0;
	let fromPosition = 0;
	for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
		const result = await ctx.runMutation(
			internal.demoReset.stripTextAnalysisGraphBatch,
			{ textId, fromPosition },
		);
		removed += result.deleted;
		fromPosition = result.nextPosition;
		if (!result.hasMore) break;
		if (batch === MAX_BATCHES - 1) {
			throw new Error(
				"Analysis stripping exceeded its graph batch limit.",
			);
		}
	}

	const descriptorPages = Array.from(
		{
			length: Math.ceil(
				candidates.readingIds.length / DESCRIPTOR_PAGE_SIZE,
			),
		},
		(_value, pageIndex) =>
			candidates.readingIds.slice(
				pageIndex * DESCRIPTOR_PAGE_SIZE,
				(pageIndex + 1) * DESCRIPTOR_PAGE_SIZE,
			),
	);
	const descriptors = (
		await Promise.all(
			descriptorPages.map((readingIds) =>
				ctx.runQuery(
					internal.demoReset.describeReadingCleanupCandidates,
					{ readingIds },
				),
			),
		)
	).flat();
	const protectedKeys = new Set(options.protectedReadingKeys ?? []);
	const doomed = descriptors.filter(
		({ hasRemainingSource, readingKey }) =>
			!hasRemainingSource && !protectedKeys.has(readingKey),
	);
	const doomedReadingKeys = doomed.map(({ readingKey }) => readingKey);
	if (options.removeDefinitionTexts ?? true) {
		for (const readingKey of doomedReadingKeys) {
			await removeDefinitionText(ctx, readingKey);
		}
	}
	let deletedReadings = 0;
	let readingCursor: ReadingCleanupCursor = {
		itemIndex: 0,
		phase: "GenerationAttempts",
	};
	for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
		const result = await ctx.runMutation(
			internal.demoReset.clearReadingDataBatch,
			{ readingKeys: doomedReadingKeys, cursor: readingCursor },
		);
		removed += result.deleted;
		deletedReadings += result.deletedReadings;
		if (!result.nextCursor) break;
		readingCursor = result.nextCursor;
		if (batch === MAX_BATCHES - 1) {
			throw new Error(
				"Analysis stripping exceeded its Reading cleanup batch limit.",
			);
		}
	}

	const lemmaIds = [...new Set(doomed.map(({ lemmaId }) => lemmaId))];
	let deletedLemmas = 0;
	let lemmaCursor: LemmaCleanupCursor = {
		itemIndex: 0,
		phase: "Surfaces",
	};
	for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
		const result = await ctx.runMutation(
			internal.demoReset.clearLemmaDataBatch,
			{ lemmaIds, cursor: lemmaCursor },
		);
		removed += result.deleted;
		deletedLemmas += result.deletedLemmas;
		if (!result.nextCursor) break;
		lemmaCursor = result.nextCursor;
		if (batch === MAX_BATCHES - 1) {
			throw new Error(
				"Analysis stripping exceeded its Lemma cleanup batch limit.",
			);
		}
	}
	return { removed, deletedReadings, deletedLemmas };
}

/**
 * Strips and deletes one Reading's Definition Text together with its state
 * row. Readings that lose their last source inside that definition are
 * pruned, but their own Definition Texts are left for a later pass.
 */
export async function removeDefinitionText(
	ctx: ActionCtx,
	ownerReadingKey: string,
): Promise<void> {
	const sync = await ctx.runQuery(internal.definitionTexts.loadSync, {
		ownerReadingKey,
	});
	if (!sync) return;
	if (sync.textId) {
		await stripTextAnalysisGraph(ctx, sync.textId, {
			protectedReadingKeys: [ownerReadingKey],
			removeDefinitionTexts: false,
		});
	}
	await ctx.runMutation(internal.definitionTexts.deleteRows, {
		ownerReadingKey,
	});
}

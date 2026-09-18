import { Migrations } from "@convex-dev/migrations";

import { components, internal } from "./_generated/api";
import { completeAuthoredComponentKnowledge } from "./dumdictStorage/transaction";
import {
	findDefinitionText,
	syncDefinitionText,
} from "./model/definitionTexts";
import {
	migrateCompositionAttestation,
	migrateCompositionOwnership,
	migrateNounArticle,
} from "./model/nounArticleMigration";
import { readingValue } from "./model/occurrenceAttestations";
import schema from "./schema";

export const migrations = new Migrations(components.migrations, { schema });

export const backfillVisitorEncounterLocations = migrations.define({
	table: "visitorClicks",
	migrateOne: async (ctx, encounter) => {
		if (encounter.textId && encounter.sentenceId) return;
		const segment = await ctx.db.get(encounter.segmentId);
		if (!segment) {
			throw new Error(
				`Visitor Encounter ${encounter._id} refers to a missing Segment.`,
			);
		}
		const sentence = await ctx.db.get(segment.sentenceId);
		if (!sentence) {
			throw new Error(
				`Visitor Encounter ${encounter._id} refers to a Segment with no Sentence.`,
			);
		}
		return { textId: sentence.textId, sentenceId: sentence._id };
	},
});

/** Give every already-generated definition its Definition Text. */
export const materializeDefinitionTexts = migrations.define({
	table: "accumulatedKnowledge",
	migrateOne: async (ctx, accumulated) => {
		if (await findDefinitionText(ctx, accumulated.ownerReadingKey)) return;
		await syncDefinitionText(
			ctx,
			accumulated.ownerReadingKey,
			accumulated.knowledge,
		);
	},
});

export const run = migrations.runner();

export const correctNounArticleOwners = migrations.define({
	table: "surfaces",
	migrateOne: migrateNounArticle,
});

export const backfillAuthoredArticleKnowledge = migrations.define({
	table: "readings",
	migrateOne: async (ctx, reading) => {
		const lemma = await ctx.db.get(reading.lemmaId);
		if (
			!lemma ||
			!(await completeAuthoredComponentKnowledge(
				ctx,
				readingValue(reading, lemma),
			))
		)
			return;
		const state = await ctx.db
			.query("dictionaryState")
			.withIndex("by_key", (q) => q.eq("key", "global"))
			.unique();
		if (state)
			await ctx.db.patch(state._id, { revision: state.revision + 1 });
		else
			await ctx.db.insert("dictionaryState", {
				key: "global",
				revision: 1,
			});
	},
});

export const deriveSurfaceComponents = migrations.define({
	table: "surfaces",
	migrateOne: migrateNounArticle,
});
export const reconcileCompositionOwnership = migrations.define({
	table: "ownedSurfaces",
	migrateOne: migrateCompositionOwnership,
});
export const reconcileCompositionAttestations = migrations.define({
	table: "attestations",
	migrateOne: migrateCompositionAttestation,
});

/** Run in order: re-key values, merge dictionary ownership, then redirect occurrences. */
export const runCompositionCutover = migrations.runner([
	internal.migrations.deriveSurfaceComponents,
	internal.migrations.reconcileCompositionOwnership,
	internal.migrations.reconcileCompositionAttestations,
]);

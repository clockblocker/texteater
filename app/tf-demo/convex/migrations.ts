import { Migrations } from "@convex-dev/migrations";

import { components } from "./_generated/api";
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

export const run = migrations.runner();

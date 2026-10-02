import { Migrations } from "@convex-dev/migrations";

import { components } from "./_generated/api";
import {
	findDefinitionText,
	syncDefinitionText,
} from "./model/definitionTexts";
import schema from "./schema";

export const migrations = new Migrations(components.migrations, { schema });

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

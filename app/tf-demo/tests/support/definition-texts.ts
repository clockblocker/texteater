import { internal } from "../../convex/_generated/api";
import { unresolvedUnits } from "../../server/storedSegments";
import { proseSegments } from "../../tooling/playground-example-collection";
import type { TestConvexDb } from "./convex";

/** A definition as the materializer hands it on: one Sentence, its Segments and units. */
export function segmentedDefinition(definition: string) {
	const segments = proseSegments(definition);
	return {
		stitchedText: definition,
		segments,
		units: unresolvedUnits(segments),
	};
}

/** Claims the Scheduled row's next run, as the materializer does first. */
export async function claimRun(t: TestConvexDb, ownerReadingKey: string) {
	const runNumber = await t.mutation(internal.definitionTexts.markRunning, {
		ownerReadingKey,
	});
	if (runNumber === null) throw new Error("Expected a run to claim.");
	return runNumber;
}

/** Every row of a table the Definition Texts write. */
export async function tableRows<Table extends "definitionTexts" | "scrolls">(
	t: TestConvexDb,
	table: Table,
) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

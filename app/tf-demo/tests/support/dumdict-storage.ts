import { getFunctionName } from "convex/server";
import type { DumdictStoragePort } from "dumdict";

import { createConvexDumdictStorage } from "../../convex/dumdictActionStorage";
import {
	commitDumdictChanges,
	findDumdictStoredReadings,
	getDumdictRelationsCleanupInfo,
	loadDumdictCleanupRelationsContext,
	loadDumdictReadingEntryContext,
	loadDumdictReadingForPatch,
} from "../../convex/dumdictStorage";

type ExecuteConvexFunction = (
	implementation: unknown,
	args: unknown,
) => Promise<unknown>;

type TestConvexDumdictTransport = {
	readonly runQuery: ExecuteConvexFunction;
	readonly runMutation: ExecuteConvexFunction;
};

const queryImplementations = new Map<string, unknown>([
	["dumdictStorage:findDumdictStoredReadings", findDumdictStoredReadings],
	[
		"dumdictStorage:loadDumdictReadingEntryContext",
		loadDumdictReadingEntryContext,
	],
	["dumdictStorage:loadDumdictReadingForPatch", loadDumdictReadingForPatch],
	[
		"dumdictStorage:getDumdictRelationsCleanupInfo",
		getDumdictRelationsCleanupInfo,
	],
	[
		"dumdictStorage:loadDumdictCleanupRelationsContext",
		loadDumdictCleanupRelationsContext,
	],
]);

/** Exercise the production action adapter against a local Convex test store. */
export function createTestConvexDumdictStorage({
	runQuery,
	runMutation,
}: TestConvexDumdictTransport): DumdictStoragePort<"de"> {
	return createConvexDumdictStorage({
		async runQuery(reference: unknown, args: unknown) {
			const name = getFunctionName(reference as never);
			const implementation = queryImplementations.get(name);
			if (!implementation) {
				throw new Error(`Unexpected Convex query: ${name}`);
			}
			return runQuery(implementation, args);
		},
		async runMutation(reference: unknown, args: unknown) {
			const name = getFunctionName(reference as never);
			if (name !== "dumdictStorage:commitDumdictChanges") {
				throw new Error(`Unexpected Convex mutation: ${name}`);
			}
			return runMutation(commitDumdictChanges, args);
		},
	} as never);
}

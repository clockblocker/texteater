import { sttsRowsAdjaToPds } from "./crosswalk-rows-1.js";
import { sttsRowsPdatToPtkant } from "./crosswalk-rows-2.js";
import { sttsRowsPtkaToPunctuation } from "./crosswalk-rows-3.js";
import type { SttsRow } from "./types.js";

/**
 * The STTS crosswalk for German: each of the 54 STTS tags, the Dumling
 * representation of each of its uses, and the records showing each. A
 * ruling on #734 or #735 updates the rows it touches. The #679
 * coverage table is regenerated from it with `bun run stts-table`.
 */
export const germanSttsCrosswalk: readonly SttsRow[] = [
	...sttsRowsAdjaToPds,
	...sttsRowsPdatToPtkant,
	...sttsRowsPtkaToPunctuation,
];

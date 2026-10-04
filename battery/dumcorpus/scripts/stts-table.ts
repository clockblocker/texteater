/**
 * Prints the German STTS coverage table (#742) from the crosswalk, as
 * Markdown, with any gold status the records support beyond the row's.
 *
 *   bun run stts-table
 */

import { unitRoutes } from "../src/generated/routes.js";
import { loadSpecRecords, loadSpecSegmentations, rules } from "../src/index.js";
import { sttsGold } from "../src/stts/check-crosswalk.js";
import { germanSttsCrosswalk } from "../src/stts/crosswalk.js";
import { renderSttsTable } from "../src/stts/table.js";
import { readRepositoryAdrIds } from "../tests/adr-ids.js";

const context = {
	segmentations: loadSpecSegmentations(),
	records: loadSpecRecords(),
	rules,
	adrs: readRepositoryAdrIds(),
	routes: unitRoutes.de ?? [],
};
console.log(
	renderSttsTable(germanSttsCrosswalk, (row) => sttsGold(row, context)),
);

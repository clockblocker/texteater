import { defineSchema } from "convex/server";
import { dictionaryTables } from "./model/tables/dictionary";
import { inspectionTables } from "./model/tables/inspection";
import { knowledgeTables } from "./model/tables/knowledge";
import { relationPublicationTables } from "./model/tables/relationPublication";
import { resolutionTables } from "./model/tables/resolution";
import { scrollTables } from "./model/tables/scrolls";
import { visitorTables } from "./model/tables/visitors";

/** Each domain's tables live in `model/tables/`; this composes them. */
export default defineSchema({
	...inspectionTables,
	...scrollTables,
	...dictionaryTables,
	...knowledgeTables,
	...relationPublicationTables,
	...visitorTables,
	...resolutionTables,
});

// Generated from canonical Zod unit schemas. Run bun run generate.
import { inflectionalFeatures as deInflectionalFeatures } from "./languages/de/inflectional-features.js";
import { inflectionalFeatures as enInflectionalFeatures } from "./languages/en/inflectional-features.js";
import { inflectionalFeatures as heInflectionalFeatures } from "./languages/he/inflectional-features.js";
/**
 * Each inflecting route's inflectional bag as plain data: every feature it
 * may mark and every value it may mark it with, over all of the bag's
 * branches. A route whose Surfaces don't inflect is absent.
 */
export const inflectionalFeatures: Readonly<
	Record<string, Readonly<Record<string, readonly string[]>>>
> = {
	...deInflectionalFeatures,
	...enInflectionalFeatures,
	...heInflectionalFeatures,
};

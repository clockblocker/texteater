/**
 * `dumcorpus/inflection`: each language's Inflection Pack (system ADR 0049),
 * the only part of an inflection table that knows its language. A host looks
 * a pack up in `inflectionPacks` and hands it to `dumdict/inflection`'s
 * `projectLemmaTables`, then draws the view with the pack's `display` and
 * `labels`.
 *
 * Like `dumcorpus/inventories`, this entry reads no files and loads no Zod.
 */
import { germanInflectionPack } from "./inflection/de/pack.js";

export { germanAuthoredParadigm } from "./inflection/de/authored-paradigm.js";
export type {
	GermanDisplayRun,
	GermanForm,
	GermanVerbForm,
	GermanWordForm,
} from "./inflection/de/forms.js";
export type { GermanInflectionPack } from "./inflection/de/pack.js";
export { germanSelectionIssues } from "./inflection/de/selection-checks.js";
export { germanInflectionPack };

/** The Inflection Packs by language. A language with no pack has no tables. */
export const inflectionPacks = { de: germanInflectionPack } as const;

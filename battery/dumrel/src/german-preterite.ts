import { ParsingError } from "common-utils/validation";
import type * as Dumling from "dumling/types";
import type { Preterite } from "./generated/types.js";
import { knowledgePolicyApplies } from "./knowledge-policies.js";

type Path = (number | string)[];

const issue = (path: Path, message: string) =>
	new ParsingError([{ code: "custom", path, message }]);

/** The separable particle a German VERB Lemma names in Core, or null. */
function separablePrefixOf(lemma: Dumling.Lemma): string | undefined {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	return typeof core.hasSepPrefix === "string"
		? core.hasSepPrefix
		: undefined;
}

/**
 * A Präteritum belongs to a Reading whose route the Knowledge Policy gives
 * it, a German VERB, and lists each form once (ADR 0038). A form is spelled
 * as a dictionary cites it: one word (`wog`, `erinnerte` for `sich
 * erinnern`), or for a separable verb its finite word and its particle split
 * off (`stand auf`), never with `sich`.
 */
export function parsePreterite<R extends Dumling.Reading>(
	source: R,
	value: Preterite,
	path: Path,
): Preterite | ParsingError {
	if (!knowledgePolicyApplies(source.lemma, "preterite"))
		return issue(path, "Only a German VERB Reading has a Präteritum");
	const folded = value.map((form) => form.toLocaleLowerCase("de"));
	if (new Set(folded).size !== value.length)
		return issue(path, "A Präteritum lists each form once");
	const particle = separablePrefixOf(source.lemma)?.toLocaleLowerCase("de");
	for (const [index, form] of folded.entries()) {
		const words = form.split(" ");
		const fits =
			words.every((word) => /^\S+$/u.test(word) && word !== "sich") &&
			(particle === undefined
				? words.length === 1
				: words.length === 2 && words[1] === particle);
		if (!fits)
			return issue(
				[...path, index],
				particle === undefined
					? "A Präteritum form is one word, without sich"
					: `A separable verb's Präteritum form is its finite word and its particle split off, without sich: «… ${particle}»`,
			);
	}
	return value;
}

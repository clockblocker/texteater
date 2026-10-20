import { ParsingError } from "common-utils/validation";
import type * as Dumling from "dumling/types";
import type {
	ConjugationClasses,
	ReadingKnowledge,
} from "./generated/types.js";
import { germanConjugationClass } from "./german-conjugation-class.js";
import { knowledgePolicyApplies } from "./knowledge-policies.js";
import { conjugationClassValues } from "./vocabulary.js";

type Path = (number | string)[];
type Preterite = NonNullable<ReadingKnowledge["preterite"]>;

const issue = (path: Path, message: string) =>
	new ParsingError([{ code: "custom", path, message }]);

/** The separable particle a German VERB Lemma names in Core, or null. */
function separablePrefixOf(lemma: Dumling.Lemma): string | null {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	return typeof core.hasSepPrefix === "string" ? core.hasSepPrefix : null;
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
	if (new Set(value).size !== value.length)
		return issue(path, "A Präteritum lists each form once");
	const particle = separablePrefixOf(source.lemma);
	for (const [index, form] of value.entries()) {
		const words = form.split(" ");
		const fits =
			particle === null
				? words.length === 1
				: words.length === 2 &&
					words[1]?.toLocaleLowerCase("de") ===
						particle.toLocaleLowerCase("de");
		if (!fits)
			return issue(
				[...path, index],
				particle === null
					? "A Präteritum form is one word, without sich"
					: `A separable verb's Präteritum form is its finite word and its particle split off, without sich: «… ${particle}»`,
			);
	}
	return value;
}

/**
 * The form is the one source of truth (ADR 0038): a Reading that stores
 * both its Präteritum and its conjugation classes stores every class its
 * forms attest, so `wog` agrees with Strong and contradicts Weak alone. A
 * class may outlive the forms that attest it, as a Reading with `sandte`
 * and `sendete` keeps Weak once a later write keeps only `sandte`.
 */
export function preteriteAgreementIssue<R extends Dumling.Reading>(
	source: R,
	knowledge: {
		readonly preterite?: Preterite;
		readonly conjugationClass?: ConjugationClasses;
	},
): ParsingError | undefined {
	const { preterite, conjugationClass } = knowledge;
	if (!preterite || !conjugationClass) return undefined;
	const stored = new Set(conjugationClass);
	const missing = conjugationClassValues.filter((value) =>
		preterite.some(
			(form) =>
				germanConjugationClass(source.lemma.canonicalForm, form) ===
					value && !stored.has(value),
		),
	);
	return missing.length === 0
		? undefined
		: issue(
				["knowledge", "conjugationClass"],
				`The conjugation classes lack ${missing.join(", ")}, which the Präteritum attests`,
			);
}

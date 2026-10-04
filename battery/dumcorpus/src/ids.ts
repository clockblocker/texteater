/**
 * The id syntax of Spec Records, Breakdown Records and Rules: a language,
 * then kebab-case ASCII path segments. Each pattern captures the language.
 */
const language = "(de|en|he)";
const segment = "[a-z0-9]+(?:-[a-z0-9]+)*";

/** A Spec Record's path, `de/ich-bin-im-wald`, nested folders included. */
export const specRecordIdPattern = new RegExp(
	`^${language}(?:/${segment})+$`,
	"u",
);
/** A Breakdown Record's path, `breakdown/de/auf-jeden-fall`. */
export const breakdownRecordIdPattern = new RegExp(
	`^breakdown/${language}/${segment}$`,
	"u",
);
/** A Rule's id, `de/noun-owns-its-article`. */
export const ruleIdPattern = new RegExp(`^${language}/${segment}$`, "u");

/** Whether `id` is a Spec Record's id, as `checkRecord` accepts it. */
export function isSpecRecordId(id: string): boolean {
	return specRecordIdPattern.test(id);
}

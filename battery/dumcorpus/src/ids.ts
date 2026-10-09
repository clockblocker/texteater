import type * as Dumling from "dumling/types";

const languages: Readonly<Record<Dumling.Language, true>> = {
	de: true,
	en: true,
	he: true,
};

/**
 * The id syntax of Spec Records, Breakdown Records and Rules: a language,
 * then kebab-case ASCII path segments. Each pattern captures the language.
 */
const language = `(${Object.keys(languages).join("|")})`;
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

/** The language `pattern` captures from `id`, or undefined where it does not match. */
export function idLanguage(
	pattern: RegExp,
	id: string,
): Dumling.Language | undefined {
	const captured = pattern.exec(id)?.[1];
	return captured !== undefined && isLanguage(captured)
		? captured
		: undefined;
}

/** Whether `value` names a Dumling Language. */
export function isLanguage(value: string): value is Dumling.Language {
	return Object.hasOwn(languages, value);
}

/** Whether `id` is a Spec Record's id, as `checkRecord` accepts it. */
export function isSpecRecordId(id: string): boolean {
	return specRecordIdPattern.test(id);
}

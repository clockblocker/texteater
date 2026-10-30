import type * as Dumrel from "dumrel/types";

/**
 * A language's Translations as a spot-checker reads them, `; `-separated,
 * each Preposition and Slot in backticks: have to do `with` `something`
 * (ADR 0055).
 */
export const translationsTextOf = (value: unknown): string | undefined =>
	Array.isArray(value)
		? value
				.map((translation: Dumrel.Translation) =>
					translation
						.map(({ kind, text }) =>
							kind === "Text" ? text : `\`${text}\``,
						)
						.join(" "),
				)
				.join("; ")
		: undefined;

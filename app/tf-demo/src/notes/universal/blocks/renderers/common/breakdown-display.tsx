import { createContext, useContext } from "react";

/**
 * How a Breakdown is set (ADR 0050, ADR 0051). The defaults are what Notes
 * show; the Breakdowns prototype in the dev Playground provides the others so
 * the conventions can be compared on one Note.
 */
export type BreakdownDisplay = {
	/**
	 * `DictionaryForms` names each part by its Canonical Form, as DWDS's
	 * Wortzerlegung and en.wiktionary's etymology line do (`Gast + -e- +
	 * Haus`). `ShownLetters` cuts the word itself, the Interfix glued to the
	 * part before it (`Gäste|haus`).
	 */
	readonly constituents: "DictionaryForms" | "ShownLetters";
	/**
	 * `Marks` writes the word whole under the school marks (разбор по
	 * составу); `Dots` also spaces its morphemes (`ent · spann · ung · ∅`).
	 */
	readonly morphemes: "Marks" | "Dots";
};

export const DEFAULT_BREAKDOWN_DISPLAY: BreakdownDisplay = {
	constituents: "DictionaryForms",
	morphemes: "Marks",
};

const BreakdownDisplayContext = createContext(DEFAULT_BREAKDOWN_DISPLAY);

export const BreakdownDisplayProvider = BreakdownDisplayContext.Provider;

export function useBreakdownDisplay(): BreakdownDisplay {
	return useContext(BreakdownDisplayContext);
}

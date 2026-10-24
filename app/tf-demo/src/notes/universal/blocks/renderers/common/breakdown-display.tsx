import { createContext, useContext } from "react";

import type { NoteDataFor } from "../../../note/data";

type Formations = NoteDataFor<"Lemma">["formations"];

/**
 * How a Breakdown and Formations are set (ADR 0050, ADR 0051). The defaults
 * are what Notes show; the Breakdowns prototype in the dev Playground
 * provides the others so they can be judged on one Note (#1241).
 */
export type BreakdownDisplay = {
	/**
	 * `Marks` draws every school mark at once (разбор по составу). `Reveal`
	 * writes the word plain and shows one morpheme's mark under the pointer
	 * or focus.
	 */
	readonly morphemes: "Marks" | "Reveal";
	/** What a revealed morpheme's neighbours show: nothing, or a faint boundary. */
	readonly neighbours: "Nothing" | "Boundary";
	/** A click opens the morpheme's Note, or also pins its reveal. */
	readonly click: "Open" | "PinAndOpen";
	/** A tap opens at once, or reveals first and opens on a second tap. */
	readonly touch: "TapOpens" | "TapRevealsThenOpens";
	/** The zero ending gets a hover target after the last letter, or none. */
	readonly zeroEnding: "TargetAfterWord" | "Hidden";
	/** A part not split yet reveals as coloured letters, or also underlined. */
	readonly chunk: "Unlabeled" | "Underlined";
	/** How a reveal moves: the mark draws in, fades in, or appears. */
	readonly motion: "Draw" | "Fade" | "Instant";
	/** Stretches every reveal duration five times, to judge the motion. */
	readonly slowMotion: boolean;
	/** Formations on the Lemma Note only, or also on each Reading Note. */
	readonly formations: "LemmaOnly" | "AlsoReadings";
	/** Whether Formations list the words whose Source is the base (`Lauf`). */
	readonly sources: "Hidden" | "Listed";
	/** A Lemma's Formations, for a Reading Note to show them. */
	readonly formationsOfLemma?: (lemmaId: string) => Formations | undefined;
};

export const DEFAULT_BREAKDOWN_DISPLAY: BreakdownDisplay = {
	morphemes: "Marks",
	neighbours: "Nothing",
	click: "Open",
	touch: "TapRevealsThenOpens",
	zeroEnding: "TargetAfterWord",
	chunk: "Unlabeled",
	motion: "Draw",
	slowMotion: false,
	formations: "LemmaOnly",
	sources: "Hidden",
};

const BreakdownDisplayContext = createContext(DEFAULT_BREAKDOWN_DISPLAY);

export const BreakdownDisplayProvider = BreakdownDisplayContext.Provider;

export function useBreakdownDisplay(): BreakdownDisplay {
	return useContext(BreakdownDisplayContext);
}

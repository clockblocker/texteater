import { useDemoParam } from "@/shell";
import type { GlossKnobs } from "./alignment";
import { cases, type QuietAttestation } from "./cases";
import type { GlossStyle } from "./focus";
import type { GlossCase } from "./model";

const styles: readonly GlossStyle[] = ["leipzig", "spelled", "plain"];

export type KnobName = keyof GlossKnobs | "note" | "quiet";

/**
 * The case, the clicked word and the knobs, kept in the URL so a view can
 * be shared and reloaded. Each knob's default leaves its param out.
 */
export function useKnobs() {
	const [caseParam, setCaseParam] = useDemoParam("case");
	const [wordId, setWordId] = useDemoParam("word");
	const [gloss, setGloss] = useDemoParam("gloss");
	const [morph, setMorph] = useDemoParam("morph");
	const [lines, setLines] = useDemoParam("lines");
	const [note, setNote] = useDemoParam("note");
	const [quiet, setQuiet] = useDemoParam("attestation");
	const quietAttestation: QuietAttestation =
		quiet === "static" ? "static" : "skip";
	const glossCase = cases.find((each) => each.id === caseParam) ?? cases[0];
	if (!glossCase) throw new Error("interlinear-gloss: no cases");
	const knobs: GlossKnobs = {
		style: styles.find((each) => each === gloss) ?? "leipzig",
		morphRow: morph !== "off",
		lines: lines !== "off",
	};
	const setKnob = (name: KnobName, value: string | boolean) => {
		if (name === "style")
			setGloss(value === "leipzig" ? null : String(value));
		if (name === "quiet") setQuiet(value === "skip" ? null : String(value));
		const toggle = value ? null : "off";
		if (name === "morphRow") setMorph(toggle);
		if (name === "lines") setLines(toggle);
		if (name === "note") setNote(toggle);
	};
	return {
		glossCase,
		setCase: (next: GlossCase) => {
			setCaseParam(next.id === cases[0]?.id ? null : next.id);
			setWordId(null);
		},
		wordId,
		setWordId,
		knobs,
		note: note !== "off",
		quiet: quietAttestation,
		setKnob,
	};
}

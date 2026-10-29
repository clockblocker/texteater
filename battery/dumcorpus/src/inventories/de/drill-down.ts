import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type { AuthoredMember } from "../member.js";
import { member as reflexivity } from "./members/lexeme/pronoun/reflexive/sich-reflexivity.js";

/** The German unit that explains reflexivity; no spelling realizes it. */
export const reflexivityUnit: AuthoredMember = reflexivity;

/**
 * The emoji that starts the Emoji Description of a Reading whose frame has a
 * Required Reflexive Slot (ADR 0052): the reflexivity unit's own Reading, as
 * a reciprocal starts with the Reading of `einander`. `fürchten` has 😨 and
 * 🪞😨.
 */
export const reflexiveMarker: string = reflexivity.reading.emojiDescription;

/**
 * The forms German's reflexivity unit shows in a word or wording, each
 * linking to its Lemma `sich` (ADR 0054): `dich` in `Trimm-dich-Pfad`. They
 * are the reflexive forms the unit's definition lists for each person.
 */
export const germanReflexiveForms: {
	readonly canonicalForm: string;
	readonly forms: ReadonlySet<string>;
} = {
	canonicalForm: reflexivity.lemma.canonicalForm,
	forms: new Set(["mich", "mir", "dich", "dir", "uns", "euch", "sich"]),
};

/**
 * The authored unit a Reading's lexical reflexive drills down to (system ADR
 * 0041): one per language, never a case cell, though the Reading's
 * Reflexive Slot names the reflexive's case (Acc in er schämt sich, Dat in
 * er bildet sich etwas ein) (ADR 0052). German is the only language with one
 * so far.
 */
export function reflexiveDrillDown(
	reading: Pick<Dumling.Reading, "lemma">,
	knowledge: Pick<Dumrel.ReadingKnowledge, "valency"> | undefined,
): AuthoredMember | undefined {
	const reflexive = (knowledge?.valency ?? []).some(({ complements }) =>
		complements.some(({ kind }) => kind === "Reflexive"),
	);
	return reading.lemma.language === "de" && reflexive
		? reflexivityUnit
		: undefined;
}

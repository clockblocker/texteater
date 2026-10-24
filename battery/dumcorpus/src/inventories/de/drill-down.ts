import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../member.js";
import { member as reflexivity } from "./members/lexeme/pronoun/reflexive/sich-reflexivity.js";

/** The German unit that explains reflexivity; no spelling realizes it. */
export const reflexivityUnit: AuthoredMember = reflexivity;

/**
 * The forms German's reflexivity unit shows in a word or wording, each
 * linking to its Lemma `sich` (ADR 0050): `dich` in `Trimm-dich-Pfad`. They
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
 * The authored unit a lexically reflexive Lemma's reflexive drills down to
 * (system ADR 0041): one per language, never a case cell, though the verb's
 * lexicallyReflexive names the reflexive's case (Acc in er schämt sich, Dat
 * in er bildet sich etwas ein). German is the only language with one so far.
 */
export function reflexiveDrillDown(
	lemma: Dumling.Lemma,
): AuthoredMember | undefined {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	return lemma.language === "de" && (core.lexicallyReflexive ?? null) !== null
		? reflexivityUnit
		: undefined;
}

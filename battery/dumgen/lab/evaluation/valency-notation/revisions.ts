/**
 * The system prompts a valency round can ask under, by name, so a run's
 * records name the prompt they were asked under and rescore with it.
 * `production` is the prompt `produceValency` sends. A round tries a
 * revision by adding one here, built from production's paragraphs
 * (`valencyPrompt`'s parts in `prompts.ts` and `valency-prompts.ts`);
 * everything else, the input, the strict pattern, the transport and the
 * check, stays production's.
 *
 * The prompt rounds of 2026-11-19 (r1 to r5) live in this directory's git
 * history: targeted rules (r1, r2) beat the prompt production had; worked
 * examples (r1, r5), a procedural rewrite (r1) and a sentence-free input
 * (r3) lost; with no referent, case letters (`letters@r4`) tied Duden's
 * pronouns and beat E-VALBU's codes and person forms, and became
 * production. The notation's own rounds (r1 to r3) chose the Duden-style
 * notation before it.
 *
 * Every run file under evidence/valency-notation/runs/ predates the case
 * letters: its answers are in the Duden-style notation (`jmd. (etw.)`),
 * which today's parser does not read, so `score` counts them unreadable.
 * Their scores stay under evidence/valency-notation/, and the code that
 * read them is this directory's git history.
 */

import { valencyPrompt } from "../../../src/knowledge/de/valency.js";

export const revisions: Readonly<Record<string, string>> = {
	production: valencyPrompt,
};

/** A revision's system prompt; an unknown name throws. */
export function revisionPrompt(name: string): string {
	const prompt = revisions[name];
	if (prompt === undefined)
		throw Error(
			`${name} is no revision (${Object.keys(revisions).join(", ")})`,
		);
	return prompt;
}

/**
 * The system prompts a valency round can ask under, by name, so a run's
 * records name the prompt they were asked under and rescore with it.
 * `production` is the prompt `produceValency` sends. A round tries a
 * revision by adding one here, built from production's paragraphs
 * (`valencyPrompt`'s parts in `prompts.ts` and `valency-prompts.ts`);
 * everything else, the input, the strict pattern, the transport and the
 * check, stays production's.
 *
 * The notation's own rounds (r1 to r3, 2026-11-19) chose production's
 * prompt; their runs, scores and spend stay under
 * evidence/valency-notation/, read by this directory's code as the third
 * round left it (its git history).
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

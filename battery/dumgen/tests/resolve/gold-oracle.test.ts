import { expect, test } from "bun:test";
import { canonicalJson } from "common-utils";
import { lemmaIdentityKey } from "dumling";
import * as Effect from "effect/Effect";
import { createDumgen } from "../../src/create-dumgen.js";
import { grammarCases } from "../../src/evaluation/resolve-grammar/cases.js";
import {
	goldAnswers,
	goldWritten,
} from "../../src/evaluation/resolve-grammar/oracle.js";

/**
 * A judge and a writer that always answer as gold does: what is left
 * wrong is code's. Today's misses are gold that no question reaches (a
 * shared article or auxiliary, a governed preposition outside the unit,
 * authored spellings dumspec lacks) and a few gold quirks.
 */
test("with gold's answers, resolve.grammar rebuilds nearly every gold Attestation", async () => {
	const { dev, heldout } = grammarCases();
	const cases = [...dev, ...heldout];
	let lemmas = 0;
	let exact = 0;
	const misses: string[] = [];
	for (const goldCase of cases) {
		const dumgen = createDumgen({
			jev: async (request) => ({
				model: request.model,
				answers: goldAnswers(goldCase, request.questions),
				usage: { input_tokens: 0, output_tokens: 0 },
			}),
			luna: async (request) => ({
				output: goldWritten(goldCase, request.input),
			}),
		});
		const result = await Effect.runPromise(
			dumgen.resolve.grammar({
				language: "de",
				sentence: goldCase.sentence,
				unit: goldCase.unit,
				neighbours: {},
				lemmaCandidates: [],
			}),
		).catch((error: unknown) => ({ _tag: "Error" as const, error }));
		if (result._tag !== "Resolved") {
			misses.push(`${goldCase.id}: ${result._tag}`);
			continue;
		}
		if (
			lemmaIdentityKey(result.attestation.surface.lemma) ===
			lemmaIdentityKey(goldCase.ideal.surface.lemma)
		)
			lemmas++;
		else misses.push(`${goldCase.id}: Lemma`);
		if (canonicalJson(result.attestation) === canonicalJson(goldCase.ideal))
			exact++;
	}
	expect(cases.length).toBeGreaterThan(2000);
	expect({
		lemma: lemmas / cases.length >= 0.985,
		exact: exact / cases.length >= 0.97,
		misses: misses.length <= 30 ? [] : misses,
	}).toEqual({ lemma: true, exact: true, misses: [] });
	// Over 2,000 resolutions take about a second alone, and several times
	// that while Turbo runs other packages' gates alongside.
}, 30_000);

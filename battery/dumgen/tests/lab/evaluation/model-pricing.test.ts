import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	jevChars,
	lunaChars,
} from "../../../lab/evaluation/resolve-grammar/model-pricing.js";
import { CachedModels } from "../../../lab/evaluation/resolve-grammar/models.js";
import {
	defaultLunaConfiguration,
	type LunaRequest,
} from "../../../src/luna.js";
import type { JevRequest } from "../../../src/segment/jev.js";

const oracle = { answers: () => ({}), written: () => "gold" };
const context = { stage: "draft", signal: new AbortController().signal };

const jevRequest = (text: string): JevRequest => ({
	model: "jev",
	state: { sentence: text },
	questions: {},
});
const lunaRequest = (text: string): LunaRequest => ({
	systemPrompt: "Write the word's base form.",
	input: { sentence: text },
	outputFormat: "text",
	configuration: defaultLunaConfiguration,
});

/** Asks every request of a project pass, answered by the oracle where the cache misses. */
async function project(
	directory: string,
	texts: readonly string[],
): Promise<CachedModels<undefined>> {
	const models = new CachedModels<undefined>(
		{ directory, mode: "project" },
		oracle,
	);
	for (const text of texts) {
		await models.jev(undefined, 0)(jevRequest(text), context);
		await models.luna(undefined, 0)(lunaRequest(text), context);
	}
	return models;
}

test("a request no cached answer prices is priced from its own characters, at its stage's measured rate or else the stored runs' bound", async () => {
	const directory = await mkdtemp(join(tmpdir(), "model-pricing-"));
	const long = "Der Hund läuft schnell über die Straße. ".repeat(40);

	// Nothing is cached: the bound, 240 tokens and 0.39 per character for
	// jev, 0.29 per character for Luna; a longer request costs more.
	const unmeasured = (await project(directory, [long])).price(1, 1);
	expect(unmeasured.jev).toMatchObject({ requests: 1, pricedFromBound: 1 });
	expect(unmeasured.jev.inputTokens).toBe(
		Math.ceil(240 + jevChars(jevRequest(long)) * 0.39),
	);
	expect(unmeasured.luna).toMatchObject({ requests: 1, pricedFromBound: 1 });
	expect(unmeasured.luna.inputTokens).toBe(
		Math.ceil(lunaChars(lunaRequest(long)) * 0.29),
	);

	// Three answered requests measure their stage: a fourth is priced at
	// their tokens per character with a fifth of headroom.
	const answered = ["Erstens.", "Zweitens kommt.", "Drittens kommt dann."];
	const live = new CachedModels<undefined>(
		{
			directory,
			mode: "live",
			jev: async (request) => ({
				model: "jev",
				answers: {},
				usage: {
					input_tokens: Math.round(jevChars(request) / 2),
					output_tokens: 0,
				},
			}),
			luna: async (request) => ({
				output: "gold",
				metadata: {
					usage: {
						input_tokens: Math.round(lunaChars(request) / 4),
						output_tokens: 10,
					},
				},
			}),
		},
		oracle,
	);
	for (const text of answered) {
		await live.jev(undefined, 0)(jevRequest(text), context);
		await live.luna(undefined, 0)(lunaRequest(text), context);
	}
	// The stage's rate as measured: tokens over characters of its hits.
	const rate = (chars: (text: string) => number, per: number) =>
		answered.reduce((sum, text) => sum + Math.round(chars(text) / per), 0) /
		answered.reduce((sum, text) => sum + chars(text), 0);
	const jevRate = rate((text) => jevChars(jevRequest(text)), 2);
	const lunaRate = rate((text) => lunaChars(lunaRequest(text)), 4);
	const measured = (await project(directory, [...answered, long])).price(
		1,
		1,
	);
	expect(measured.jev).toMatchObject({ requests: 1, pricedFromStage: 1 });
	expect(measured.jev.inputTokens).toBe(
		Math.ceil(jevChars(jevRequest(long)) * jevRate * 1.2),
	);
	expect(measured.luna).toMatchObject({ requests: 1, pricedFromStage: 1 });
	expect(measured.luna.inputTokens).toBe(
		Math.ceil(lunaChars(lunaRequest(long)) * lunaRate * 1.2),
	);
	expect(measured.luna.outputTokens).toBe(12);
});

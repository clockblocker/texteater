import { expect, test } from "bun:test";
import { defaultLunaConfiguration, type LunaRequest } from "../src/luna.js";
import { createOpenAILunaBatch } from "../src/luna-batch.js";
import { lunaResponseOf } from "../src/openai-luna.js";
import {
	completedResponse,
	fakeOpenAI,
	userInputOf,
} from "./lab/evaluation/fake-openai.js";

// A host that cannot wait on a batch looks at it once per scheduled run and
// reads a final batch's lines raw (#1351).

const request = (word: string): LunaRequest => ({
	systemPrompt: "Write the headword.",
	input: { word },
	outputSchema: {
		type: "object",
		properties: { canonicalForm: { type: "string" } },
		required: ["canonicalForm"],
	},
	configuration: defaultLunaConfiguration,
});

const openAI = (options: Parameters<typeof fakeOpenAI>[1] = {}) =>
	fakeOpenAI((body) => {
		const input = userInputOf(body);
		const word =
			typeof input === "object" && input && "word" in input
				? String(input.word)
				: "";
		return {
			status: 200,
			body: completedResponse(
				{ canonicalForm: word.toLowerCase() },
				{ input_tokens: 1500, output_tokens: 7 },
			),
		};
	}, options);

test("a batch is looked at once per check, and a final one's lines read as live answers", async () => {
	const fake = openAI({ pollsBeforeEnd: 2, failing: (id) => id === "b" });
	const batch = createOpenAILunaBatch({
		apiKey: "sk-test",
		fetch: fake.batchFetch,
		promptCaching: true,
	});
	const signal = new AbortController().signal;
	const requests = [
		{ customId: "a", request: request("Bank") },
		{ customId: "b", request: request("Haus") },
	];
	const { id } = await batch.submit(requests, signal);
	const first = await batch.check(id, signal);
	expect(first).toMatchObject({ id, final: false });
	expect(fake.counts.polls).toBe(1);
	await batch.check(id, signal);
	const final = await batch.check(id, signal);
	expect(final).toMatchObject({ status: "completed", final: true });
	const lines = await batch.lines(final, signal);
	expect(lines.map(({ customId, ok }) => [customId, ok])).toEqual([
		["a", true],
		["b", false],
	]);
	const [answered] = lines;
	if (!answered?.ok) throw Error("Expected an answered line");
	expect(lunaResponseOf(answered.body, request("Bank")).output).toEqual({
		canonicalForm: "bank",
	});
	// Each line went with prompt caching, without the fast tier.
	const [body] = fake.bodies;
	expect(body).toHaveProperty("prompt_cache_options", { mode: "explicit" });
	expect(body).not.toHaveProperty("service_tier");
});

test("an expired batch is final, with no lines for the requests it never ran", async () => {
	const fake = openAI({ dropped: () => true });
	const batch = createOpenAILunaBatch({
		apiKey: "sk-test",
		fetch: fake.batchFetch,
	});
	const signal = new AbortController().signal;
	const { id } = await batch.submit(
		[{ customId: "a", request: request("Bank") }],
		signal,
	);
	await batch.check(id, signal);
	const final = await batch.check(id, signal);
	expect(final).toMatchObject({ status: "expired", final: true });
	expect(await batch.lines(final, signal)).toEqual([]);
});

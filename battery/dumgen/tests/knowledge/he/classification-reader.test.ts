import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { defaultLunaConfiguration } from "../../../src/luna.js";
import { lunaResponseOf } from "../../../src/openai-luna.js";
import { fakeDumgen } from "../../service-test-adapter.js";

const lemma = {
	unitKind: "Lemma",
	language: "he",
	family: "Saying",
	kind: "Saying",
	canonicalForm: "אין עשן בלי אש",
	coreFeatures: {},
} as const satisfies Dumling.Lemma<"he">;
const reading = {
	unitKind: "Reading",
	lemma,
	emojiDescription: "💬",
} as const satisfies Dumling.Reading<"he">;
const attestation = {
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "he",
		lemma,
		normalizedSurface: lemma.canonicalForm,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
	},
	members: [{ attested: lemma.canonicalForm, orthography: "Standard" }],
	realizationCoverage: "Full",
} as const satisfies Dumling.Attestation<"he">;

async function produce(output: unknown) {
	for (const unit of [reading, attestation])
		expect(parseUnit(unit).success).toBe(true);
	let calls = 0;
	const dumgen = fakeDumgen({
		jev: async () => {
			throw Error("Saying classification must not call jev");
		},
		luna: async (request) => {
			calls++;
			return lunaResponseOf(
				JSON.stringify({
					status: "completed",
					output: [
						{
							content: [
								{
									type: "output_text",
									text: JSON.stringify(output),
								},
							],
						},
					],
				}),
				request,
			);
		},
		lunaConfiguration: defaultLunaConfiguration,
		requestBudget: 1,
	});
	const result = await Effect.runPromise(
		dumgen.knowledge.produce({
			language: "he",
			reading,
			attestation,
			sentence: {
				segments: [{ text: lemma.canonicalForm }],
				target: [0],
			},
			origin: "New",
			request: { sayingType: null },
		}),
	);
	expect(calls).toBe(1);
	return result;
}

test("Hebrew Saying classification preserves a bare native object through the actual response reader", async () => {
	const result = await produce({ type: "Proverb" });
	expect(result.failures).toEqual([]);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "sayingType",
			value: { type: "Proverb" },
		},
	]);
});

test("Hebrew Saying classification still rejects malformed native objects", async () => {
	for (const output of [
		{ type: "Unknown" },
		{ type: "Proverb", unknown: true },
	]) {
		const result = await produce(output);
		expect(result.changes).toEqual([]);
		expect(result.failures).toMatchObject([
			{ aspect: "sayingType", code: "InvalidModelOutput" },
		]);
	}
});

test("Hebrew Saying classification retains wrapped objects and nullable abstention", async () => {
	const wrapped = await produce({ value: { type: "Proverb" } });
	expect(wrapped.failures).toEqual([]);
	expect(wrapped.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "sayingType",
			value: { type: "Proverb" },
		},
	]);
	const abstained = await produce({ value: null });
	expect(abstained.changes).toEqual([]);
	expect(abstained.failures).toMatchObject([
		{ aspect: "sayingType", code: "Unresolved" },
	]);
});

test("Hebrew Saying response recognition does not weaken native classification validation", async () => {
	for (const output of [
		{ type: "Unknown" },
		{ type: "Proverb", unexpected: true },
	]) {
		const result = await produce(output);
		expect(result.changes).toEqual([]);
		expect(result.failures).toMatchObject([
			{ aspect: "sayingType", code: "InvalidModelOutput" },
		]);
	}
});

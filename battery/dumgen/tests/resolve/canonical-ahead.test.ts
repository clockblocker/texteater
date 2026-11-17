import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { defaultLunaConfiguration, type LunaAsk } from "../../src/luna.js";
import { canonicalRequestAhead } from "../../src/resolve/canonical-ahead.js";
import { canonicalOutputLimit } from "../../src/resolve/de/canonical-form.js";
import type { ResolveGrammarInput } from "../../src/resolve/types.js";
import {
	lunaRequestKey,
	type StoredLunaAnswer,
	storedLunaAsk,
} from "../../src/stored-luna.js";
import { completedResponse } from "../lab/evaluation/fake-openai.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
} from "./support.js";

// The canonical request a click sends before jev answers, asked ahead
// through a batch and answered from it (#1351).

const merkwürdige = {
	language: "de",
	neighbours: {},
	lemmaCandidates: [],
	sentence: sentenceOf("Eine merkwürdige Geschichte."),
	unit: unitOf([2], "Lexeme/ADJ"),
} satisfies ResolveGrammarInput;

const ahead = (input: ResolveGrammarInput) =>
	Effect.runSync(canonicalRequestAhead(input));

/** Stored answers by request key, as a host keeps a batch's. */
async function storedFor(
	entries: readonly {
		readonly input: ResolveGrammarInput;
		readonly body: unknown;
	}[],
) {
	const stored = new Map<string, StoredLunaAnswer>();
	for (const { input, body } of entries) {
		const asked = ahead(input);
		if (!asked) throw Error("Expected a request ahead");
		stored.set(await lunaRequestKey(asked.request), {
			body: typeof body === "string" ? body : JSON.stringify(body),
			source: "batch_1",
		});
	}
	const looked: string[] = [];
	return {
		looked,
		find: async (key: string) => {
			looked.push(key);
			return stored.get(key);
		},
	};
}

const written = (canonicalForm: string) =>
	completedResponse(
		{ canonicalForm, members: ["merkwürdige"] },
		{ input_tokens: 1500, output_tokens: 20 },
	);

const clickOver = (luna: LunaAsk, input: ResolveGrammarInput = merkwürdige) =>
	resolveOnce({ jev: fakeJev().ask, luna }, input);

test("the request asked ahead is the one the click sends before jev answers, with Luna's configuration", async () => {
	const luna = fakeLuna();
	await clickOver(luna.ask);
	const asked = ahead(merkwürdige);
	const [sent] = luna.sent;
	if (!sent) throw Error("Expected the click to ask Luna");
	expect(sent.configuration).toEqual(defaultLunaConfiguration);
	expect(asked).toEqual({
		request: sent,
		maxOutputTokens: canonicalOutputLimit,
	});
	expect(asked?.request.input).not.toHaveProperty("judged");
});

test("an Unresolved unit, a closed DET and a PRON have no request ahead", () => {
	const dieses = sentenceOf("Dieses Haus ist alt.");
	expect(
		ahead({ ...merkwürdige, unit: { segments: [2], route: "Unresolved" } }),
	).toBeUndefined();
	expect(
		ahead({
			...merkwürdige,
			sentence: dieses,
			unit: unitOf([0], "Lexeme/DET", {
				kind: "DET",
				canonicalForm: "dieser",
				pronType: "Dem",
			}),
		}),
	).toBeUndefined();
	expect(
		ahead({
			...merkwürdige,
			sentence: dieses,
			unit: unitOf([0], "Lexeme/PRON"),
		}),
	).toBeUndefined();
	expect(
		ahead({ ...merkwürdige, sentence: { ...dieses, failed: true } }),
	).toBeUndefined();
});

test("a click whose request has a stored answer asks Luna nothing, and its trace names the answer's source", async () => {
	const luna = fakeLuna();
	const stored = await storedFor([
		{ input: merkwürdige, body: written("merkwürdig") },
	]);
	const { result, trace } = await clickOver(
		storedLunaAsk(luna.ask, {
			stages: new Set(["canonical"]),
			find: stored.find,
		}),
	);
	expect(attested(result).surface.lemma.canonicalForm).toBe("merkwürdig");
	expect(luna.sent).toEqual([]);
	const canonical = trace?.calls.filter(({ stage }) => stage === "canonical");
	expect(canonical).toHaveLength(1);
	expect(canonical?.[0]).toMatchObject({
		storedAnswer: "batch_1",
		inputTokens: 0,
		outputTokens: 0,
	});
	expect(canonical?.[0]?.failure).toBeUndefined();
});

test("a click with no stored answer for its request asks Luna, as a changed hint makes it", async () => {
	const verb = (canonicalForm: string): Dumling.Lemma<"de"> => ({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm,
		coreFeatures: { hasSepPrefix: null },
	});
	const schwimmen = {
		...merkwürdige,
		sentence: sentenceOf("Sie wird schwimmen."),
		unit: unitOf([2, 4], "Lexeme/VERB"),
		lemmaCandidates: [
			{ lemma: verb("schwimmen"), foundUnder: ["schwimmen"] },
			{ lemma: verb("schwimmern"), foundUnder: ["schwimmen"] },
		],
	} satisfies ResolveGrammarInput;
	const later = {
		...schwimmen,
		lemmaCandidates: [
			...schwimmen.lemmaCandidates,
			{ lemma: verb("schwimmeln"), foundUnder: ["schwimmen"] },
		],
	};
	expect(ahead(later)).toBeDefined();
	const stored = await storedFor([
		{
			input: schwimmen,
			body: completedResponse(
				{ canonicalForm: "schwimmen", members: ["wird", "schwimmen"] },
				{ input_tokens: 1, output_tokens: 1 },
			),
		},
	]);
	const luna = fakeLuna();
	const { trace } = await resolveOnce(
		{
			jev: fakeJev({ aux_m0: "u0" }).ask,
			luna: storedLunaAsk(luna.ask, {
				stages: new Set(["canonical"]),
				find: stored.find,
			}),
		},
		later,
	);
	expect(stored.looked.length).toBeGreaterThan(0);
	expect(luna.sent.length).toBeGreaterThan(0);
	expect(trace?.calls.some(({ storedAnswer }) => storedAnswer)).toBe(false);
});

test("a stored answer its check refuses, or one that cannot be read, is dropped and Luna is asked", async () => {
	for (const body of [written("merk\nwürdig"), "not a Responses body"]) {
		const luna = fakeLuna();
		const stored = await storedFor([{ input: merkwürdige, body }]);
		const { result, trace } = await clickOver(
			storedLunaAsk(luna.ask, {
				stages: new Set(["canonical"]),
				find: stored.find,
			}),
		);
		expect(attested(result).surface.lemma.canonicalForm).toBe(
			"merkwürdige",
		);
		expect(luna.sent).toHaveLength(1);
		const canonical = trace?.calls.filter(
			({ stage }) => stage === "canonical",
		);
		expect(
			canonical?.map(({ storedAnswer, failure }) => [
				storedAnswer,
				failure?.tag,
			]),
		).toEqual([
			["batch_1", "InvalidModelOutput"],
			[undefined, undefined],
		]);
	}
});

test("a lookup that fails, or a stage that is not stored, asks Luna", async () => {
	const luna = fakeLuna();
	const looked: string[] = [];
	const ask = storedLunaAsk(luna.ask, {
		stages: new Set(["canonical"]),
		find: async (key) => {
			looked.push(key);
			throw Error("the store is down");
		},
	});
	const { result } = await clickOver(ask);
	expect(attested(result).surface.lemma.canonicalForm).toBe("merkwürdige");
	expect(looked).toHaveLength(1);
	expect(luna.sent).toHaveLength(1);
	const other = storedLunaAsk(luna.ask, {
		stages: new Set(["emojiDescription"]),
		find: async () => {
			throw Error("not looked up");
		},
	});
	await clickOver(other);
	expect(luna.sent).toHaveLength(2);
});

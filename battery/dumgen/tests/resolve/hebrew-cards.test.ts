import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import * as Effect from "effect/Effect";
import { requestBudget, runOperation } from "../../src/call.js";
import { defaultLunaConfiguration, type LunaAsk } from "../../src/luna.js";
import { resolveHebrewGrammar } from "../../src/resolve/he/grammar.js";
import { resolveHebrewReading } from "../../src/resolve/he/reading.js";
import { segmentHebrewUnits } from "../../src/segment/he/units.js";
import type { JevAsk } from "../../src/segment/jev.js";
import type {
	SegmentedSentence,
	Unit,
} from "../../src/segment/segmented-sentence.js";

const picked = (choice: string) => ({
	type: "choice" as const,
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 },
});
const unit: Unit<"he"> = {
	segments: [0, 1],
	route: { language: "he", family: "Lexeme", kind: "NOUN" },
};
const sentence: SegmentedSentence<"he"> = {
	text: "הַסֵּפֶר",
	segments: [
		{ kind: "ResolvableText", text: "הַ" },
		{ kind: "ResolvableText", text: "סֵּפֶר" },
	],
	units: [unit],
};
const surface = {
	unitKind: "Surface",
	language: "he",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "ספר",
		coreFeatures: { abbr: null, gender: "Masc" },
	},
	normalizedSurface: "ספר",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: { definite: "Def", number: "Sing" },
};
const options = { budget: requestBudget(2), payloads: true };
const neverJev: JevAsk = async () => {
	throw Error("unexpected judge");
};
const models = (output: unknown, jev: JevAsk = neverJev) => ({
	jev: { ask: jev, model: "jev-test" },
	luna: {
		ask: (async () => ({ output })) satisfies LunaAsk,
		configuration: defaultLunaConfiguration,
	},
});
const grammar = (output: unknown) =>
	Effect.runPromise(
		runOperation("resolve.grammar", options, (scope) =>
			resolveHebrewGrammar(scope, models(output), {
				language: "he",
				sentence,
				unit,
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);

test("Hebrew canonical resolution keeps exact pointed source and owned article on noun Head", async () => {
	const result = await grammar({ emojiDescription: "📚", surface });
	expect(result._tag).toBe("Resolved");
	if (result._tag !== "Resolved") throw Error("unresolved");
	expect(result.attestation.surface.lemma.canonicalForm).toBe("ספר");
	expect(result.attestation.members.map((member) => member.attested)).toEqual(
		["הַ", "סֵּפֶר"],
	);
	expect(
		"articleEvidence" in result.attestation
			? result.attestation.articleEvidence
			: undefined,
	).toEqual({ kind: "Owned", member: 0 });
	expect(
		result.attestation.members.every(
			(member) => member.orthography === "Fused",
		),
	).toBe(true);
	expect(parseUnit(result.attestation).success).toBe(true);
	expect(result.drafted).toBe("📚");
});

test("Hebrew refuses invalid or off-route model identities, never fabricates a German lemma", async () => {
	await expect(
		grammar({
			emojiDescription: "📚",
			surface: {
				...surface,
				lemma: { ...surface.lemma, language: "de" },
			},
		}),
	).rejects.toThrow();
	await expect(
		grammar({
			emojiDescription: "📚",
			surface: {
				...surface,
				inflectionalFeatures: { definite: "Imaginary", number: "Sing" },
			},
		}),
	).rejects.toThrow();
});

test("Hebrew Reading judge reuses stored sense instead of forcing the canonical draft", async () => {
	const resolved = await grammar({ emojiDescription: "✂", surface });
	if (resolved._tag !== "Resolved") throw Error("unresolved");
	let judgeCalls = 0;
	const jev: JevAsk = async (request) => {
		judgeCalls++;
		expect(JSON.stringify(request)).not.toContain("✂");
		return {
			model: request.model,
			answers: { reading: picked("c0") },
			usage: { input_tokens: 1, output_tokens: 1 },
		};
	};
	const result = await Effect.runPromise(
		runOperation("resolve.reading", options, (scope) =>
			resolveHebrewReading(scope, models("bad", jev), {
				attestation: resolved.attestation,
				sentence,
				unit,
				candidates: ["📚"],
				drafted: "✂",
			}),
		),
	);
	expect(result).toEqual({ _tag: "Reuse", emojiDescription: "📚" });
	expect(judgeCalls).toBe(1);
});

test("Hebrew Reading NoMatch uses validated draft, normalizes collisions and supports stale written retry", async () => {
	const resolved = await grammar({ emojiDescription: "📚", surface });
	if (resolved._tag !== "Resolved") throw Error("unresolved");
	const jev: JevAsk = async (request) => ({
		model: request.model,
		answers: { reading: picked("NoMatch") },
		usage: { input_tokens: 1, output_tokens: 1 },
	});
	const reading = (
		candidates: string[],
		extra: { drafted?: string; written?: string },
	) =>
		Effect.runPromise(
			runOperation("resolve.reading", options, (scope) =>
				resolveHebrewReading(scope, models("bad", jev), {
					attestation: resolved.attestation,
					sentence,
					unit,
					candidates,
					...extra,
				}),
			),
		);
	expect(await reading(["✂️"], { drafted: "✂" })).toEqual({
		_tag: "Reuse",
		emojiDescription: "✂️",
	});
	expect(await reading(["✂"], { drafted: "📚" })).toEqual({
		_tag: "New",
		emojiDescription: "📚",
	});
	expect(await reading(["✂"], { written: "📚" })).toEqual({
		_tag: "New",
		emojiDescription: "📚",
	});
	await expect(reading([], { drafted: "book" })).rejects.toThrow();
});

test("Hebrew units now route noun Head while keeping source article membership", async () => {
	const units = await Effect.runPromise(
		segmentHebrewUnits(
			{
				text: sentence.text,
				segments: sentence.segments,
				unresolved: [],
			},
			({ questions, stage }) =>
				Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((id) => [
							id,
							picked(stage === "route" ? "Lexeme_NOUN" : "Join"),
						]),
					),
				),
		),
	);
	expect(units).toEqual([unit]);
});

test("Hebrew Reading refuses an Attestation from a different source occurrence", async () => {
	const resolved = await grammar({ emojiDescription: "📚", surface });
	if (resolved._tag !== "Resolved") throw Error("unresolved");
	const members: [{ attested: string; orthography: "Standard" }] = [
		{ attested: "בית", orthography: "Standard" },
	];
	const different = { ...resolved.attestation, members };
	await expect(
		Effect.runPromise(
			runOperation("resolve.reading", options, (scope) =>
				resolveHebrewReading(scope, models("📚"), {
					attestation: different,
					sentence,
					unit,
					candidates: [],
					drafted: "📚",
				}),
			),
		),
	).rejects.toThrow("source");
});

test("Hebrew route question gives UD-backed accusative את ADP, not PART", async () => {
	let instructions = "";
	await Effect.runPromise(
		segmentHebrewUnits(
			{
				text: "את",
				segments: [{ kind: "ResolvableText", text: "את" }],
				unresolved: [],
			},
			({ questions, stage }) => {
				if (stage === "route")
					instructions = String(questions.route_0?.instructions);
				return Effect.succeed(
					Object.fromEntries(
						Object.keys(questions).map((id) => [
							id,
							picked("Lexeme_ADP"),
						]),
					),
				);
			},
		),
	);
	expect(instructions).toContain("definite-object marker את is ADP");
});

test("unresolved Hebrew grammar asks nothing", async () => {
	const unresolved = { ...unit, route: "Unresolved" as const };
	const result = await Effect.runPromise(
		runOperation("resolve.grammar", options, (scope) =>
			resolveHebrewGrammar(scope, models(undefined), {
				language: "he",
				sentence: { ...sentence, units: [unresolved] },
				unit: unresolved,
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);
	expect(result).toEqual({ _tag: "Unresolved" });
});

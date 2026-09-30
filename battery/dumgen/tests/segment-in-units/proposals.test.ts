import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EvaluationExecutor } from "promptsmith/evaluation";
import type {
	Questions,
	SystemOneRequest,
	TypeSafeExecutor,
} from "promptsmith/typesafe";
import type { SegmentInUnitsInput } from "../../src/evaluation/spec-corpus/segment-in-units.js";
import { arms } from "../../src/segment-in-units/de/arms/index.js";
import {
	admitProposals,
	proposalLimits,
	runProposals,
} from "../../src/segment-in-units/de/arms/proposals.js";
import {
	type Answer,
	type CallRecord,
	Jev,
} from "../../src/segment-in-units/lab/jev.js";
import {
	Luna,
	lunaConfiguration,
} from "../../src/segment-in-units/lab/luna.js";
import { segmentsOf } from "../spec-corpus/fixtures.js";

const directory = await mkdtemp(join(tmpdir(), "proposals-arm-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

type Judgments = {
	readonly support?: Readonly<Record<string, number>>;
	readonly routes?: Readonly<Record<string, string>>;
	readonly identity?: Readonly<Record<number, string>>;
};

async function run(
	input: SegmentInUnitsInput,
	response: unknown,
	judgments: Judgments = {},
	unresolved: readonly number[] = [],
	failing = false,
) {
	const textRequests: Parameters<EvaluationExecutor>[0][] = [];
	const jevRequests: SystemOneRequest<Questions>[] = [];
	const executor: EvaluationExecutor = async (request) => {
		textRequests.push(request);
		if (failing) throw Error("OpenAI HTTP 503: test failure");
		return {
			output: response,
			metadata: { usage: { input_tokens: 50, output_tokens: 20 } },
		};
	};
	const jevExecutor: TypeSafeExecutor = async (request) => {
		jevRequests.push(request);
		const answers: Record<string, Answer> = {};
		for (const [id, question] of Object.entries(request.questions)) {
			if (question.type === "noul") {
				answers[id] = {
					type: "noul",
					noul: judgments.support?.[id.slice(8)] ?? 1,
				};
				continue;
			}
			if (question.type !== "choice") throw Error("Unexpected Score");
			const keys = Object.keys(question.criteria);
			const wanted = id.startsWith("r_")
				? (judgments.routes?.[id.slice(2)] ?? "Lexeme/ADV")
				: (judgments.identity?.[Number(id.slice(2))] ?? "Other");
			if (!keys.includes(wanted))
				throw Error(`No option ${wanted} in ${id}`);
			answers[id] = {
				type: "choice",
				choice: wanted,
				confidence: 1,
				probabilities: Object.fromEntries(
					keys.map((key) => [key, key === wanted ? 1 : 0]),
				),
			};
		}
		return {
			model: request.model,
			answers,
			usage: { input_tokens: 100, output_tokens: 0 },
		} as never;
	};
	const cacheDirectory = await mkdtemp(join(directory, "case-"));
	const calls: CallRecord[] = [];
	const result = await runProposals(
		input,
		{
			luna: new Luna({ cacheDirectory, executor }),
			jev: new Jev({
				cacheDirectory,
				executor: jevExecutor,
				maxRetries: 0,
			}),
			options: { singletonRoutes: "all" },
			repetition: 0,
			calls,
		},
		unresolved,
	);
	const expected = input.segments.flatMap((segment, index) =>
		segment.kind === "ResolvableText" ? [index] : [],
	);
	for (const output of Object.values(result.outputs)) {
		const actual = output.units
			.flatMap((unit) => unit.segments)
			.sort((a, b) => a - b);
		expect(actual).toEqual(expected);
		expect(new Set(actual).size).toBe(expected.length);
	}
	return { result, textRequests, jevRequests, calls };
}

test("strict proposal admission rejects omissions, overlap, unknown ids and uncertain-source joins", () => {
	const cases = [
		{ groups: [[1], [2]], reason: "missing-piece" },
		{
			groups: [
				[1, 2],
				[2, 3],
			],
			reason: "duplicate-piece",
		},
		{ groups: [[1, 1], [2], [3]], reason: "duplicate-piece" },
		{ groups: [[1, 2, 4]], reason: "unknown-piece" },
		{ groups: [[1, 2], [3]], reason: "uncertain-source-group" },
		{ groups: [[], [1, 2, 3]], reason: "invalid-partition" },
	] as const;
	for (const item of cases) {
		const admitted = admitProposals(
			{ proposals: [{ groups: item.groups }] },
			3,
			new Set(item.reason === "uncertain-source-group" ? [2] : []),
		);
		expect(admitted.proposals).toEqual([]);
		expect(admitted.admission).toEqual([
			{ index: 0, admitted: false, reason: item.reason },
		]);
	}
	expect(
		admitProposals(
			{ proposals: Array.from({ length: 4 }, () => ({ groups: [[1]] })) },
			1,
		).admission[0]?.reason,
	).toBe("invalid-response");
	expect(
		admitProposals(
			{ proposals: [{ groups: Array.from({ length: 81 }, () => [1]) }] },
			1,
		).admission[0]?.reason,
	).toBe("invalid-partition");
});

test("admission normalizes ordering only and exposes duplicate complete partitions", () => {
	const result = admitProposals(
		{
			proposals: [
				{ groups: [[3, 1], [2]] },
				{ groups: [[2], [1, 3]] },
				{ groups: [[1], [2], [3]] },
			],
		},
		3,
	);
	expect(result.proposals).toEqual([
		{ index: 0, groups: [[1, 3], [2]] },
		{ index: 2, groups: [[1], [2], [3]] },
	]);
	expect(result.admission[1]).toEqual({
		index: 1,
		admitted: false,
		reason: "duplicate-partition",
	});
});

test("alternative complete partitions share one exact-group judging stage without trimming", async () => {
	const { result, textRequests, jevRequests, calls } = await run(
		{ language: "de", segments: segmentsOf("Er fängt heute an.") },
		{
			proposals: [
				{ groups: [[1], [2], [3], [4]] },
				{ groups: [[1], [2, 4], [3]] },
			],
		},
		{
			support: { "2": 0.1, "4": 0.1, "2_4": 0.9 },
			routes: { "1": "Lexeme/PRON", "2_4": "Lexeme/VERB" },
		},
	);
	expect(arms.proposals?.usesLuna).toBe(true);
	expect(textRequests).toHaveLength(1);
	expect(jevRequests).toHaveLength(1);
	expect(calls.map((call) => call.stage)).toEqual([
		"proposals",
		"proposals-final",
	]);
	expect(result.chosenPartition).toBe(1);
	expect(result.outputs[result.primary]?.units).toEqual([
		{
			segments: [0],
			route: { language: "de", family: "Lexeme", kind: "PRON" },
		},
		{
			segments: [2, 6],
			route: { language: "de", family: "Lexeme", kind: "VERB" },
		},
		{
			segments: [4],
			route: { language: "de", family: "Lexeme", kind: "ADV" },
		},
	]);
	expect(
		result.outputs["first/raw"]?.units.map((unit) => unit.segments),
	).toEqual([[0], [2], [4], [6]]);
	expect(result.candidateCoverage.candidateGroups).toHaveLength(5);
	expect(
		Object.keys(jevRequests[0]?.questions ?? {}).filter(
			(id) => id === "r_1",
		),
	).toHaveLength(1);
	expect(jevRequests[0]?.state).toMatchObject({
		groups: { g2_4: "Er ⟦fängt⟧ heute ⟦an⟧." },
	});
});

test("no structurally admitted proposal falls back to singleton Unresolved without a judge call", async () => {
	const { result, textRequests, jevRequests } = await run(
		{ language: "de", segments: segmentsOf("A B C") },
		{ proposals: [{ groups: [[1, 2]] }, { groups: [[1], [2, 3], [3]] }] },
	);
	expect(textRequests).toHaveLength(1);
	expect(jevRequests).toHaveLength(0);
	expect(result.fallbackReason).toBe("no-admitted-partition");
	expect(result.outputs.fallback?.units.map((unit) => unit.route)).toEqual([
		"Unresolved",
		"Unresolved",
		"Unresolved",
	]);
	expect(result.candidateCoverage).toMatchObject({
		admittedPartitions: 0,
		droppedPartitions: 2,
		candidatePieces: 0,
	});
});

test("source uncertainty cannot be joined, and preserved singleton uncertainty is never routed", async () => {
	const { result, jevRequests } = await run(
		{ language: "de", segments: segmentsOf("A B C") },
		{ proposals: [{ groups: [[1, 2], [3]] }, { groups: [[1], [2], [3]] }] },
		{},
		[2],
	);
	expect(result.admission[0]?.reason).toBe("uncertain-source-group");
	for (const output of Object.values(result.outputs))
		expect(output.units[1]).toEqual({ segments: [2], route: "Unresolved" });
	expect(jevRequests[0]?.questions).not.toHaveProperty("r_2");
});

test("unsupported groups keep the admitted membership and abstain without composing fragments", async () => {
	const { result } = await run(
		{ language: "de", segments: segmentsOf("A B C") },
		{ proposals: [{ groups: [[1, 3], [2]] }] },
		{ support: { "1_3": 0.2 }, routes: { "1_3": "Locution/ADV" } },
	);
	expect(result.outputs[result.primary]?.units[0]).toEqual({
		segments: [0, 4],
		route: "Unresolved",
	});
	expect(result.outputs["best-support/raw"]?.units[0]?.route).toMatchObject({
		family: "Locution",
	});
	expect(result.chosenPartition).toBe(0);
});

test("Fusion pieces and recovered identity retain original Segment coordinates", async () => {
	const { result, textRequests } = await run(
		{
			language: "de",
			segments: [
				{ kind: "ResolvableText", text: "i", surface: "in" },
				{ kind: "ResolvableText", text: "m", surface: "dem" },
				...segmentsOf(" Wald "),
				{ kind: "ResolvableText", text: "’s", surface: "es" },
			],
		},
		{ proposals: [{ groups: [[1], [2, 3], [4]] }] },
		{
			routes: {
				"1": "Lexeme/ADP",
				"2_3": "Lexeme/NOUN",
				"4": "Lexeme/PRON",
			},
			identity: { 4: "c0" },
		},
	);
	expect(
		result.outputs[result.primary]?.units.map((unit) => unit.segments),
	).toEqual([[0], [1, 3], [5]]);
	expect(result.identityHints).toMatchObject([
		{ sourceSegment: 5, candidateGroup: "PRON:es:Prs" },
	]);
	expect(textRequests[0]?.input).toMatchObject({
		pieces: expect.arrayContaining([
			{
				id: 1,
				sourceSegment: 0,
				piece: 'i, stands for "in", part of the written word "im"',
				sourceUnresolved: false,
			},
		]),
	});
});

test("oversize text, piece count, expansion payload and opaque-only source reach no model", async () => {
	for (const input of [
		{
			language: "de" as const,
			segments: segmentsOf(
				Array.from({ length: 81 }, () => "A").join(" "),
			),
		},
		{ language: "de" as const, segments: segmentsOf("A".repeat(4097)) },
		{
			language: "de" as const,
			segments: [
				{
					kind: "ResolvableText" as const,
					text: "A",
					surface: "x".repeat(proposalLimits.inputBytes),
				},
			],
		},
		{
			language: "de" as const,
			segments: [{ kind: "Punctuation" as const, text: "." }],
		},
	]) {
		const { textRequests, jevRequests, result } = await run(input, {});
		expect(textRequests).toHaveLength(0);
		expect(jevRequests).toHaveLength(0);
		expect(result.chosenPartition).toBeNull();
	}
});

test("one text call is pinned, output bounded, signal limited and zero-retry on transient failure", async () => {
	const { textRequests } = await run(
		{ language: "de", segments: segmentsOf("A") },
		{ proposals: [{ groups: [[1]] }] },
	);
	expect(textRequests[0]?.configuration).toEqual({
		model: lunaConfiguration.model,
		settings: {
			...lunaConfiguration.settings,
			max_output_tokens: proposalLimits.outputTokens,
		},
	});
	expect(textRequests[0]?.signal).toBeInstanceOf(AbortSignal);
	expect(
		new TextEncoder().encode(JSON.stringify(textRequests[0]?.input))
			.byteLength,
	).toBeLessThanOrEqual(proposalLimits.inputBytes);
	let attempts = 0;
	const calls: CallRecord[] = [];
	const luna = new Luna({
		cacheDirectory: await mkdtemp(join(directory, "failure-")),
		executor: async () => {
			attempts++;
			throw Error("OpenAI HTTP 503: no retry");
		},
	});
	await expect(
		luna.generate({
			stage: "proposals",
			systemPrompt: "test",
			input: {},
			outputSchema: {},
			repetition: 0,
			calls,
			maxRetries: 0,
			maxOutputTokens: 100,
			timeoutMs: 1000,
		}),
	).rejects.toThrow("no retry");
	expect(attempts).toBe(1);
	expect(calls).toHaveLength(1);
	expect(calls[0]?.error).toContain("no retry");
});

test("invalid source and unresolved coordinates fail before any model call", async () => {
	const cacheDirectory = await mkdtemp(join(directory, "invalid-"));
	let attempts = 0;
	const context = {
		luna: new Luna({
			cacheDirectory,
			executor: async () => {
				attempts++;
				return { output: {} };
			},
		}),
		jev: new Jev({ cacheDirectory, maxRetries: 0, offline: true }),
		repetition: 0,
		calls: [],
		options: {},
	};
	await expect(
		runProposals({ language: "de", segments: [] }, context),
	).rejects.toThrow("Invalid proposal source");
	await expect(
		runProposals(
			{ language: "de", segments: segmentsOf("A") },
			context,
			[1],
		),
	).rejects.toThrow("Invalid unresolved source");
	expect(attempts).toBe(0);
});

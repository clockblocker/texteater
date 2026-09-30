import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
	Questions,
	SystemOneRequest,
	TypeSafeExecutor,
} from "promptsmith/typesafe";
import type { SegmentInUnitsInput } from "../../src/evaluation/spec-corpus/segment-in-units.js";
import { arms } from "../../src/segment-in-units/de/arms/index.js";
import { runOwnership } from "../../src/segment-in-units/de/arms/ownership.js";
import {
	type Answer,
	type CallRecord,
	Jev,
} from "../../src/segment-in-units/lab/jev.js";
import { segmentsOf } from "../spec-corpus/fixtures.js";

const directory = await mkdtemp(join(tmpdir(), "ownership-arm-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

type Judgments = {
	readonly owners?: Readonly<Record<number, string>>;
	readonly routes?: Readonly<Record<string, string>>;
	readonly support?: Readonly<Record<string, number>>;
	readonly confidence?: Readonly<Record<string, number>>;
	readonly closed?: Readonly<Record<number, string>>;
	readonly identity?: Readonly<Record<number, string>>;
};

async function run(
	input: SegmentInUnitsInput,
	judgments: Judgments = {},
	sourceUnresolved: readonly number[] = [],
	options: Readonly<Record<string, string>> = {},
) {
	const requests: SystemOneRequest<Questions>[] = [];
	const executor: TypeSafeExecutor = async (request) => {
		requests.push(request);
		const answers: Record<string, Answer> = {};
		for (const [id, question] of Object.entries(request.questions)) {
			if (question.type === "noul") {
				answers[id] = {
					type: "noul",
					noul: judgments.support?.[id.slice("support_".length)] ?? 1,
				};
				continue;
			}
			if (question.type !== "choice") throw Error("Unexpected Score");
			const keys = Object.keys(question.criteria);
			const wanted = id.startsWith("owner_")
				? (judgments.owners?.[Number(id.slice(6))] ?? `p${id.slice(6)}`)
				: id.startsWith("r_")
					? (judgments.routes?.[id.slice(2)] ?? "Lexeme/ADV")
					: id.startsWith("ownership_cc_")
						? (judgments.closed?.[Number(id.slice(13))] ?? keys[0])
						: (judgments.identity?.[Number(id.slice(2))] ??
							"Other");
			if (!wanted || !keys.includes(wanted))
				throw Error(`No option ${wanted} in ${id}`);
			answers[id] = {
				type: "choice",
				choice: wanted,
				confidence: judgments.confidence?.[id] ?? 1,
				probabilities: Object.fromEntries(
					keys.map((key) => [key, key === wanted ? 1 : 0]),
				),
			};
		}
		// The executor's generic mapped response cannot infer dynamic test IDs.
		return {
			model: "fake",
			answers,
			usage: { input_tokens: 100, output_tokens: 0 },
		} as never;
	};
	const cacheDirectory = await mkdtemp(join(directory, "case-"));
	const calls: CallRecord[] = [];
	const result = await runOwnership(
		input,
		{
			jev: new Jev({ cacheDirectory, executor }),
			calls,
			options,
			repetition: 0,
		},
		sourceUnresolved,
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
	return { result, requests, calls };
}

// Er0 _1 hat2 _3 den4 _5 Faden6 _7 gestern8 _9 verloren10 _11 i12 m13 _14 Wald15 .16
const fusedInput: SegmentInUnitsInput = {
	language: "de",
	segments: [
		...segmentsOf("Er hat den Faden gestern verloren "),
		{ kind: "ResolvableText", text: "i", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		...segmentsOf(" Wald."),
	],
};

const fusedJudgments: Judgments = {
	owners: { 3: "p2", 4: "p2", 6: "p2", 9: "p8" },
	routes: {
		"1": "Lexeme/PRON",
		"2_3_4_6": "Locution/VERB",
		"5": "Lexeme/ADV",
		"7": "Lexeme/ADP",
		"8_9": "Lexeme/NOUN",
	},
};

test("canonical owners preserve discontinuous membership and separate fused components", async () => {
	const { result, requests, calls } = await run(fusedInput, fusedJudgments);
	expect(arms.ownership?.id).toBe("ownership");
	expect(result.outputs[result.primary]?.units).toEqual([
		{
			segments: [0],
			route: { language: "de", family: "Lexeme", kind: "PRON" },
		},
		{
			segments: [2, 4, 6, 10],
			route: { language: "de", family: "Locution", kind: "VERB" },
		},
		{
			segments: [8],
			route: { language: "de", family: "Lexeme", kind: "ADV" },
		},
		{
			segments: [12],
			route: { language: "de", family: "Lexeme", kind: "ADP" },
		},
		{
			segments: [13, 15],
			route: { language: "de", family: "Lexeme", kind: "NOUN" },
		},
	]);
	expect(calls.map((call) => call.stage)).toEqual([
		"ownership",
		"ownership-final",
	]);
	expect(requests[0]?.questions.owner_6?.instructions).toContain(
		'("verloren")',
	);
	expect(requests[0]?.questions.owner_8).toMatchObject({
		criteria: {
			p8: 'm, stands for "dem", part of the written word "im" (p8)',
		},
	});
	expect(requests[1]?.state).toMatchObject({
		groups: { g2_3_4_6: "Er ⟦hat den Faden⟧ gestern ⟦verloren⟧ im Wald." },
	});
	expect(requests[1]?.questions).toHaveProperty("support_2_3_4_6");
	expect(requests[1]?.questions).toHaveProperty("r_2_3_4_6");
	expect(requests[1]?.questions).toHaveProperty("i_1");
	expect(Object.keys(requests[0]?.questions ?? {})).not.toContain("owner_10");
});

test("ownership chains are not transitively joined and absent representatives cannot route", async () => {
	const { result } = await run(
		{ language: "de", segments: segmentsOf("A B C.") },
		{ owners: { 2: "p1", 3: "p2" } },
	);
	expect(result.outputs.raw?.units.map((unit) => unit.segments)).toEqual([
		[0, 2],
		[4],
	]);
	expect(result.outputs[result.primary]?.units[1]?.route).toBe("Unresolved");
	expect(result.owners[2]).toMatchObject({ piece: 3, owner: 2 });
});

test("an incomplete singleton is retained for hover but rejected before routing", async () => {
	const { result } = await run(
		{ language: "de", segments: segmentsOf("Er fängt heute an.") },
		{
			routes: { "2": "Lexeme/VERB", "4": "Lexeme/ADP" },
			support: { "2": 0.1, "4": 0.2 },
		},
	);
	expect(result.outputs.raw?.units[1]?.route).toMatchObject({ kind: "VERB" });
	expect(result.outputs[result.primary]?.units[1]).toEqual({
		segments: [2],
		route: "Unresolved",
	});
	expect(result.outputs[result.primary]?.units[3]).toEqual({
		segments: [6],
		route: "Unresolved",
	});
});

test("support and route-confidence policies reuse one set of judgments", async () => {
	const { result, calls } = await run(
		{ language: "de", segments: segmentsOf("Heute morgen.") },
		{ support: { "1": 0.65 }, confidence: { r_2: 0.3 } },
	);
	expect(calls).toHaveLength(2);
	expect(result.outputs["support@0.5"]?.units[0]?.route).toMatchObject({
		kind: "ADV",
	});
	expect(result.outputs["support@0.7"]?.units[0]?.route).toBe("Unresolved");
	expect(result.outputs["support@0.7"]?.units[1]?.route).toMatchObject({
		kind: "ADV",
	});
	expect(result.outputs["support@0.7+route@0.5"]?.units[1]?.route).toBe(
		"Unresolved",
	);
});

test("uncertain source splits stay singleton Unresolved and cannot become another piece's owner", async () => {
	const { result, requests } = await run(fusedInput, fusedJudgments, [12]);
	for (const output of Object.values(result.outputs))
		expect(output.units.find((unit) => unit.segments.includes(12))).toEqual(
			{ segments: [12], route: "Unresolved" },
		);
	expect(requests[0]?.questions).not.toHaveProperty("owner_7");
	const eighth = requests[0]?.questions.owner_8;
	expect(eighth?.type).toBe("choice");
	if (eighth?.type === "choice")
		expect(eighth.criteria).not.toHaveProperty("p7");
	expect(requests[1]?.questions).not.toHaveProperty("r_7");
});

test("Choices over the option limit abstain without truncating source coverage", async () => {
	const { result, requests } = await run({
		language: "de",
		segments: segmentsOf(
			Array.from({ length: 256 }, () => "Wort").join(" "),
		),
	});
	for (const request of requests)
		for (const question of Object.values(request.questions))
			if (question.type === "choice")
				expect(
					Object.keys(question.criteria).length,
				).toBeLessThanOrEqual(255);
	expect(requests[0]?.questions).toHaveProperty("owner_254");
	expect(requests[0]?.questions).not.toHaveProperty("owner_255");
	expect(
		result.outputs[result.primary]?.units
			.slice(-2)
			.map((unit) => unit.route),
	).toEqual(["Unresolved", "Unresolved"]);
});

test("optional closed-class uses are batched and gated by their own confidence", async () => {
	const { result, requests, calls } = await run(
		{ language: "de", segments: segmentsOf("Doch.") },
		{ closed: { 1: "answer" }, confidence: { ownership_cc_1: 0.2 } },
		[],
		{ closed: "1" },
	);
	expect(calls).toHaveLength(2);
	expect(requests[1]?.questions).toHaveProperty("ownership_cc_1");
	expect(result.outputs.raw?.units[0]?.route).toMatchObject({ kind: "ADV" });
	expect(result.outputs["raw+closed"]?.units[0]?.route).toMatchObject({
		kind: "INTJ",
	});
	expect(
		result.outputs["support@0.7+route@0.5+closed"]?.units[0]?.route,
	).toBe("Unresolved");
});

test("selected authored identity groups survive with their source Segment coordinate", async () => {
	const { result } = await run(
		{ language: "de", segments: segmentsOf(" Er.") },
		{
			identity: { 1: "c0" },
			routes: { "1": "Lexeme/PRON" },
			confidence: { i_1: 0.8 },
		},
	);
	expect(result.identityHints).toEqual([
		{
			sourceSegment: 1,
			candidateGroup: "PRON:er:Prs",
			share: 1,
			confidence: 0.8,
		},
	]);
	expect(result.outputs[result.primary]?.units[0]?.route).toMatchObject({
		kind: "PRON",
	});
});

test("a default singleton can route to a Partial Locution without a special option", async () => {
	const { result, requests } = await run(
		{
			language: "de",
			segments: segmentsOf(
				"Ich habe Angst vor Hunden, mein Bruder vor Katzen.",
			),
		},
		{
			owners: { 3: "p2", 4: "p2" },
			routes: { "2_3_4": "Locution/VERB", "8": "Locution/VERB" },
		},
		[],
		{},
	);
	expect(
		result.outputs[result.primary]?.units.find((unit) =>
			unit.segments.includes(15),
		),
	).toEqual({
		segments: [15],
		route: { language: "de", family: "Locution", kind: "VERB" },
	});
	expect(requests[1]?.questions.r_8).toMatchObject({
		type: "choice",
		criteria: { "Saying/Saying": expect.any(String) },
	});
});

test("restricted singleton routes require an explicit legacy diagnostic option", async () => {
	const { requests } = await run(
		{ language: "de", segments: segmentsOf("vor") },
		{},
		[],
		{ singletonRoutes: "restricted" },
	);
	const question = requests[1]?.questions.r_1;
	expect(question?.type).toBe("choice");
	if (question?.type === "choice") {
		expect(question.criteria).not.toHaveProperty("Locution/VERB");
		expect(question.criteria).not.toHaveProperty("Saying/Saying");
		expect(question.criteria).toHaveProperty("Unresolved");
	}
});

test("a speculative singleton Locution route cannot bypass failed complete-membership support", async () => {
	const { result } = await run(
		{ language: "de", segments: segmentsOf("vor") },
		{ routes: { "1": "Locution/VERB" }, support: { "1": 0.1 } },
		[],
		{ singletonRoutes: "all" },
	);
	expect(result.outputs.raw?.units[0]?.route).toMatchObject({
		family: "Locution",
		kind: "VERB",
	});
	expect(result.outputs[result.primary]?.units[0]?.route).toBe("Unresolved");
});

test("exact membership does not force a route when no lexical analysis is defensible", async () => {
	const variants: readonly Readonly<Record<string, string>>[] = [
		{},
		{ singletonRoutes: "all" },
	];
	for (const options of variants) {
		const { result, requests } = await run(
			{ language: "de", segments: segmentsOf("xqzt") },
			{ routes: { "1": "Unresolved" } },
			[],
			options,
		);
		expect(result.support).toEqual([{ group: [1], probability: 1 }]);
		expect(result.outputs[result.primary]?.units).toEqual([
			{ segments: [0], route: "Unresolved" },
		]);
		expect(requests[1]?.questions.r_1).toMatchObject({
			criteria: { Unresolved: expect.any(String) },
		});
	}
});

test("a recovered pronoun selects authored identity by surface while preserving its source letters", async () => {
	const { result, requests } = await run(
		{
			language: "de",
			segments: [{ kind: "ResolvableText", text: "’s", surface: "es" }],
		},
		{ identity: { 1: "c0" }, routes: { "1": "Lexeme/PRON" } },
	);
	expect(result.identityHints).toEqual([
		{
			sourceSegment: 0,
			candidateGroup: "PRON:es:Prs",
			share: 1,
			confidence: 1,
		},
	]);
	expect(requests[1]?.questions.i_1?.instructions).toContain('("’s")');
	expect(result.outputs[result.primary]?.units[0]?.route).toMatchObject({
		kind: "PRON",
	});
});

test("authored pronoun identity preserves Partial Locution, Saying, Foreign and Unresolved interpretations", async () => {
	for (const route of [
		"Locution/VERB",
		"Saying/Saying",
		"Foreign/Foreign",
		"Unresolved",
		"Lexeme/ADV",
	]) {
		const { result } = await run(
			{ language: "de", segments: segmentsOf("es") },
			{ identity: { 1: "c0" }, routes: { "1": route } },
			[],
			{ singletonRoutes: "all" },
		);
		expect(result.routes?.[0]?.choice).toBe(route);
		expect(result.inventoryDecisions).toEqual([
			{
				group: [1],
				source: "identity",
				openRoute: route,
				proposedRoute: "Lexeme/PRON",
				applied: false,
			},
		]);
	}
});

test("authored identity may refine Kind within an independently selected DET or PRON Lexeme", async () => {
	const { result } = await run(
		{ language: "de", segments: segmentsOf("es") },
		{ identity: { 1: "c0" }, routes: { "1": "Lexeme/DET" } },
	);
	expect(result.routes?.[0]?.choice).toBe("Lexeme/PRON");
	expect(result.inventoryDecisions[0]).toMatchObject({ applied: true });
});

test("optional function-word uses preserve non-Lexeme interpretations and expose disagreement", async () => {
	for (const route of [
		"Locution/VERB",
		"Saying/Saying",
		"Foreign/Foreign",
		"Unresolved",
	]) {
		const { result } = await run(
			{ language: "de", segments: segmentsOf("doch") },
			{ closed: { 1: "answer" }, routes: { "1": route } },
			[],
			{ singletonRoutes: "all", closed: "1" },
		);
		expect(result.outputs["raw+closed"]?.units).toEqual(
			result.outputs.raw?.units,
		);
		expect(result.inventoryDecisions).toEqual([
			{
				group: [1],
				source: "closed",
				openRoute: route,
				proposedRoute: "Lexeme/INTJ",
				applied: false,
			},
		]);
	}
});

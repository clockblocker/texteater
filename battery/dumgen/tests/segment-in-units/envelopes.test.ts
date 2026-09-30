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
import { runEnvelopes } from "../../src/segment-in-units/de/arms/envelopes.js";
import {
	type Answer,
	type CallRecord,
	Jev,
} from "../../src/segment-in-units/lab/jev.js";
import { segmentsOf } from "../spec-corpus/fixtures.js";

const directory = await mkdtemp(join(tmpdir(), "envelopes-arm-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

type Judgments = {
	readonly starts?: Readonly<Record<number, number>>;
	readonly ends?: Readonly<Record<number, number | "Unresolved">>;
	readonly members?: Readonly<Record<number, string>>;
	readonly routes?: Readonly<Record<string, string>>;
	readonly support?: Readonly<Record<string, number>>;
	readonly identity?: Readonly<Record<number, string>>;
};

async function run(
	input: SegmentInUnitsInput,
	judgments: Judgments = {},
	unresolved: readonly number[] = [],
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
					noul: id.startsWith("envelope_first_")
						? (judgments.starts?.[Number(id.slice(15))] ?? 1)
						: (judgments.support?.[id.slice(8)] ?? 1),
				};
				continue;
			}
			if (question.type !== "choice") throw Error("Unexpected Score");
			const keys = Object.keys(question.criteria);
			const piece = Number(id.slice(id.lastIndexOf("_") + 1));
			const end = judgments.ends?.[piece] ?? piece;
			const wanted = id.startsWith("envelope_last_")
				? end === "Unresolved"
					? end
					: `p${end}`
				: id.startsWith("envelope_member_")
					? (judgments.members?.[piece] ?? `s_${piece}`)
					: id.startsWith("r_")
						? (judgments.routes?.[id.slice(2)] ?? "Lexeme/ADV")
						: id.startsWith("i_")
							? (judgments.identity?.[piece] ?? "Other")
							: keys[0];
			if (!wanted || !keys.includes(wanted))
				throw Error(`Missing option ${wanted} in ${id}`);
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
			model: "fake",
			answers,
			usage: { input_tokens: 100, output_tokens: 0 },
		} as never;
	};
	const calls: CallRecord[] = [];
	const result = await runEnvelopes(
		input,
		{
			jev: new Jev({
				executor,
				cacheDirectory: await mkdtemp(join(directory, "case-")),
			}),
			repetition: 0,
			calls,
			options,
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
	return { result, requests, calls };
}

test("envelopes preserve crossing discontinuous memberships with free interior words", async () => {
	// The idiom [hat ... den Faden ... verloren] crosses the correlator
	// [nicht nur ... sondern auch]. The adverb and shared-auxiliary verb
	// stay separate, even though their source positions are inside envelopes.
	const { result, requests, calls } = await run(
		{
			language: "de",
			segments: segmentsOf(
				"Er hat nicht nur den Faden gestern verloren, sondern auch geschwiegen.",
			),
		},
		{
			starts: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
			ends: { 2: 8, 3: 10 },
			members: {
				2: "e_2_8",
				5: "e_2_8",
				6: "e_2_8",
				8: "e_2_8",
				3: "e_3_10",
				4: "e_3_10",
				9: "e_3_10",
				10: "e_3_10",
			},
			routes: {
				"2_5_6_8": "Locution/VERB",
				"3_4_9_10": "Locution/CCONJ",
				"1": "Lexeme/PRON",
				"11": "Lexeme/VERB",
			},
		},
	);
	expect(
		result.outputs[result.primary]?.units.map((unit) => unit.segments),
	).toEqual([[0], [2, 8, 10, 14], [4, 6, 17, 19], [12], [21]]);
	expect(calls.map((call) => call.stage)).toEqual([
		"envelopes-boundaries",
		"envelopes-members",
		"envelopes-final",
	]);
	expect(
		result.masks
			.filter((mask) => mask.group.length > 1)
			.map((mask) => mask.marked),
	).toEqual([
		"Er ⟦hat⟧ nicht nur ⟦den Faden⟧ gestern ⟦verloren⟧, sondern auch geschwiegen.",
		"Er hat ⟦nicht nur⟧ den Faden gestern verloren, ⟦sondern auch⟧ geschwiegen.",
	]);
	const membership = requests[1]?.questions.envelope_member_6;
	expect(membership).toMatchObject({
		criteria: {
			e_2_8: expect.stringContaining(
				"⟦hat nicht nur den Faden gestern verloren⟧",
			),
			e_3_10: expect.stringContaining(
				"⟦nicht nur den Faden gestern verloren, sondern auch⟧",
			),
			s_6: expect.stringContaining("⟦Faden⟧"),
		},
	});
	expect(requests[0]?.state).toMatchObject({
		membership_rules: {
			"de/fixed-members-only": expect.stringContaining(
				"ordinary compositional phrase",
			),
			"de/attributive-adjective-stands-alone": expect.any(String),
		},
	});
});

test("a verbal envelope accepts several governed prepositions while excluding their objects", async () => {
	const { result } = await run(
		{
			language: "de",
			segments: segmentsOf("Er hat mit ihr über uns gesprochen."),
		},
		{
			starts: { 3: 0, 5: 0, 7: 0 },
			ends: { 2: 7 },
			members: { 2: "e_2_7", 3: "e_2_7", 5: "e_2_7", 7: "e_2_7" },
			routes: {
				"2_3_5_7": "Lexeme/VERB",
				"1": "Lexeme/PRON",
				"4": "Lexeme/PRON",
				"6": "Lexeme/PRON",
			},
		},
	);
	expect(
		result.outputs[result.primary]?.units.map((unit) => unit.segments),
	).toEqual([[0], [2, 4, 8, 12], [6], [10]]);
});

test("free adjective and numeral in an article+noun envelope retain their own units", async () => {
	const { result, requests } = await run(
		{
			language: "de",
			segments: segmentsOf("mit den passenden drei Werkzeugen."),
		},
		{
			starts: { 5: 0 },
			ends: { 2: 5 },
			members: { 2: "e_2_5", 5: "e_2_5" },
			routes: {
				"1": "Lexeme/ADP",
				"2_5": "Lexeme/NOUN",
				"3": "Lexeme/ADJ",
				"4": "Lexeme/NUM",
			},
		},
	);
	expect(result.outputs[result.primary]?.units).toEqual([
		{
			segments: [0],
			route: { language: "de", family: "Lexeme", kind: "ADP" },
		},
		{
			segments: [2, 8],
			route: { language: "de", family: "Lexeme", kind: "NOUN" },
		},
		{
			segments: [4],
			route: { language: "de", family: "Lexeme", kind: "ADJ" },
		},
		{
			segments: [6],
			route: { language: "de", family: "Lexeme", kind: "NUM" },
		},
	]);
	expect(requests[2]?.state).toMatchObject({
		groups: { g2_5: "mit ⟦den⟧ passenden drei ⟦Werkzeugen⟧." },
	});
});

test("an envelope whose proposed endpoint does not join is rejected without repair", async () => {
	const { result } = await run(
		{ language: "de", segments: segmentsOf("Er hat den Faden verloren.") },
		{
			ends: { 2: 5 },
			starts: { 3: 0, 4: 0, 5: 0 },
			members: { 2: "e_2_5", 3: "e_2_5", 4: "e_2_5" },
			routes: { "2_3_4": "Locution/VERB", "5": "Lexeme/VERB" },
		},
	);
	expect(
		result.masks.find((mask) => mask.owner === "e_2_5")?.endpointsPresent,
	).toBe(false);
	expect(result.outputs.raw?.units[1]?.route).toMatchObject({
		family: "Locution",
	});
	expect(result.outputs[result.primary]?.units[1]).toEqual({
		segments: [2, 4, 6],
		route: "Unresolved",
	});
});

test("exact membership support rejects a complete envelope containing a free argument", async () => {
	const { result, calls } = await run(
		{ language: "de", segments: segmentsOf("wir warten.") },
		{
			ends: { 1: 2 },
			starts: { 2: 0 },
			members: { 1: "e_1_2", 2: "e_1_2" },
			routes: { "1_2": "Lexeme/VERB" },
			support: { "1_2": 0.1 },
		},
	);
	expect(result.outputs[result.primary]?.units).toEqual([
		{ segments: [0, 2], route: "Unresolved" },
	]);
	expect(calls).toHaveLength(3);
});

test("source uncertainty and membership abstention keep exact singleton coverage", async () => {
	const { result, requests } = await run(
		{ language: "de", segments: segmentsOf("A B C.") },
		{ members: { 3: "Unresolved" } },
		[2],
	);
	expect(result.outputs[result.primary]?.units.slice(1)).toEqual([
		{ segments: [2], route: "Unresolved" },
		{ segments: [4], route: "Unresolved" },
	]);
	expect(requests[0]?.questions).not.toHaveProperty("envelope_first_2");
	expect(requests[1]?.questions).not.toHaveProperty("envelope_member_2");
	expect(requests[2]?.questions).not.toHaveProperty("r_2");
	expect(requests[2]?.questions).not.toHaveProperty("r_3");
});

test("singleton Partial and explicit Unresolved routes survive catalog overlays", async () => {
	const { result, requests } = await run(
		{ language: "de", segments: segmentsOf("oder dieser und.") },
		{
			routes: {
				"1": "Locution/CCONJ",
				"2": "Locution/DET",
				"3": "Unresolved",
			},
			identity: { 2: "c0" },
		},
		[],
		{ closed: "1" },
	);
	expect(
		result.outputs[result.primary]?.units.map((unit) => unit.route),
	).toEqual([
		{ language: "de", family: "Locution", kind: "CCONJ" },
		{ language: "de", family: "Locution", kind: "DET" },
		"Unresolved",
	]);
	expect(requests[2]?.questions.r_1).toMatchObject({
		criteria: {
			"Saying/Saying": expect.any(String),
			Unresolved: expect.any(String),
		},
	});
});

test("no lexical pieces require no Jev requests", async () => {
	const { result, requests } = await run({
		language: "de",
		segments: [
			{ kind: "Whitespace", text: "\t\n" },
			{ kind: "Punctuation", text: "…" },
		],
	});
	expect(result.outputs[result.primary]?.units).toEqual([]);
	expect(requests).toEqual([]);
});

test("candidate limits preserve coverage and expose unsupported boundaries without truncation", async () => {
	const { result } = await run({
		language: "de",
		segments: segmentsOf(Array.from({ length: 255 }, () => "A").join(" ")),
	});
	expect(result.diagnostics.preflightFailures).toEqual([
		{ stage: "envelopes-boundaries", piece: 1, options: 256 },
	]);
	expect(result.boundaries[0]).toMatchObject({ piece: 1, bounded: false });
	expect(result.envelopes).toEqual([]);
	expect(result.diagnostics.stages[0]?.serializedBytes).toBeGreaterThan(
		result.diagnostics.stages[0]?.stateBytes ?? 0,
	);
	expect(result.diagnostics.stages[0]?.options).toBeGreaterThan(0);
});

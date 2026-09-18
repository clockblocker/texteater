import { expect, test } from "bun:test";
import { required } from "common-utils";
import { Effect } from "effect";
import type {
	Questions,
	SystemOneResult,
	TypeSafeExecutor,
} from "promptsmith/typesafe";
import review from "../src/evaluation/redesign/review-cases.json";
import type { OperationTrace, SegmentedSentence } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { indexedContext } from "../src/universal/validation.js";

function answers(
	request: { questions: Questions },
	select: (id: string) => string,
) {
	return {
		model: "injected",
		usage: { input_tokens: 1, output_tokens: 1 },
		answers: Object.fromEntries(
			Object.entries(request.questions).map(([id, question]) => {
				if (question.type !== "choice") throw Error("Expected Choice");
				const selected = select(id);
				return [
					id,
					{
						type: "choice",
						choice: selected,
						confidence: 0.01,
						probabilities: Object.fromEntries(
							Object.keys(question.criteria).map((key) => [
								key,
								key === selected ? 1 : 0,
							]),
						),
					},
				];
			}),
		),
	};
}
function controlled(
	members: readonly number[],
	route: string,
	options: { singletonRoute?: string; unresolvedMember?: number } = {},
) {
	const traces: OperationTrace[] = [];
	const judge: TypeSafeExecutor = async (request) =>
		answers(request, (id) =>
			id === "route"
				? route
				: id === "singletonRoute"
					? (options.singletonRoute ??
						(members.length === 1 ? route : "Unresolved"))
					: Number(id.slice(7)) === options.unresolvedMember
						? "Unresolved"
						: members.includes(Number(id.slice(7)))
							? "Include"
							: "Exclude",
		) as SystemOneResult<typeof request.questions>;
	return {
		traces,
		dumgen: createDumgen({
			judge,
			execute: async () => {
				throw Error("Classification must not generate text");
			},
			onOperation: (trace) => traces.push(trace),
		}),
	};
}
test("every member click of all 16 accepted constructions assembles the exact scoped target", async () => {
	for (const example of review.constructions) {
		const sentence: SegmentedSentence<"de"> = {
			id: example.id,
			language: "de",
			segments: example.sourceSentence
				.match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu)!
				.map((text) => ({
					text,
					kind: /^\s+$/u.test(text)
						? "Whitespace"
						: /^[\p{L}\p{N}]+$/u.test(text)
							? "ResolvableText"
							: "Punctuation",
				})),
		};
		for (const target of example.targets) {
			let cursor = -1;
			const members = target.members.map((text) => {
				const index = sentence.segments.findIndex(
					(segment, index) => index > cursor && segment.text === text,
				);
				expect(index).toBeGreaterThan(cursor);
				cursor = index;
				return index;
			});
			for (const clickedSegmentIndex of members) {
				const run = controlled(members, `Lexeme/${target.kind}`);
				const output = await Effect.runPromise(
					run.dumgen.classifyTarget({
						sentence,
						clickedSegmentIndex,
					}),
				);
				expect<unknown>(output).toEqual({
					family: "Lexeme",
					kind: target.kind,
					memberSegmentIndices: members,
				});
				const trace = run.traces[0]!;
				const skipsWholeTarget = members.length === 1;
				expect(trace.calls.map((call) => call.executor)).toEqual(
					skipsWholeTarget ? ["TypeSafe"] : ["TypeSafe", "TypeSafe"],
				);
				if (!skipsWholeTarget)
					expect(trace.calls[1]!.dependsOn).toEqual([
						trace.calls[0]!.id,
					]);
				const request = trace.calls[0]!.request;
				if (!("questions" in request)) throw Error("Expected judgment");
				expect(Object.keys(request.questions)).toEqual([
					...sentence.segments.flatMap((segment, index) =>
						segment.kind === "ResolvableText" &&
						index !== clickedSegmentIndex
							? [`member_${index}`]
							: [],
					),
					"singletonRoute",
				]);
			}
		}
	}
});
test("repeated spelling stays positional; invalid whole groups stop without repair", async () => {
	const sentence: SegmentedSentence<"de"> = {
		id: "repeated",
		language: "de",
		segments: ["Er", "stellt", "sich", "vor", "dem", "Publikum", "vor"].map(
			(text) => ({ text, kind: "ResolvableText" }),
		),
	};
	const run = controlled([1, 2, 6], "Lexeme/VERB");
	for (const clickedSegmentIndex of [1, 2, 6])
		expect(
			(
				await Effect.runPromise(
					run.dumgen.classifyTarget({
						sentence,
						clickedSegmentIndex,
					}),
				)
			).memberSegmentIndices,
		).toEqual([1, 2, 6]);
	const invalid = controlled([1, 3, 6], "Unresolved");
	const result = await Effect.runPromise(
		Effect.either(
			invalid.dumgen.classifyTarget({ sentence, clickedSegmentIndex: 1 }),
		),
	);
	expect(result._tag).toBe("Left");
	expect(invalid.traces[0]!.calls).toHaveLength(2);
	expect(invalid.traces[0]!.failure?.tag).toBe("Unresolved");
});
test("a lone resolvable occurrence skips the empty membership batch but still judges its route", async () => {
	const run = controlled([0], "Lexeme/INTJ");
	expect(
		await Effect.runPromise(
			run.dumgen.classifyTarget({
				sentence: {
					id: "one",
					language: "de",
					segments: [{ kind: "ResolvableText", text: "Hallo" }],
				},
				clickedSegmentIndex: 0,
			}),
		),
	).toEqual({ family: "Lexeme", kind: "INTJ", memberSegmentIndices: [0] });
	expect(run.traces[0]!.calls).toHaveLength(1);
});

test("canonical classification evaluation calls the production operation and preserves complete v2 evidence", async () => {
	const { targetOperationExperiment } = await import(
		"../src/concrete-lang/de/target-classification/experiment.js"
	);
	const { runOperationExperiment } = await import("promptsmith/evaluation");
	const data = (
		await import(
			"../src/concrete-lang/de/target-classification/source-data.json"
		)
	).default;
	const judge: TypeSafeExecutor = async (request) => {
		const state = request.state as {
			sentence: string;
			clickedSegmentIndex: number;
		};
		const golden = Object.values(data.cases).find(
			(value) =>
				value.input.clickedSegmentIndex === state.clickedSegmentIndex &&
				indexedContext({
					id: "fixture",
					language: "de",
					segments: value.input
						.segments as SegmentedSentence["segments"],
				}) === state.sentence,
		);
		if (!golden) throw Error("Missing canonical fixture");
		const target = golden.idealOutput as {
			decision?: string;
			family?: string;
			kind?: string;
			memberSegmentIndices?: number[];
		};
		return answers(request, (id) =>
			id === "singletonRoute" && target.memberSegmentIndices?.length !== 1
				? "Unresolved"
				: id === "route" || id === "singletonRoute"
					? target.decision === "Unresolved"
						? "Unresolved"
						: `${target.family}/${target.kind}`
					: target.memberSegmentIndices?.includes(Number(id.slice(7)))
						? "Include"
						: "Exclude",
		) as SystemOneResult<typeof request.questions>;
	};
	const run = await runOperationExperiment({
		experiment: targetOperationExperiment({
			judge,
			execute: async () => {
				throw Error("Must not generate classification");
			},
		}),
		experimentId: "target",
		operationVersion: "2",
		evaluatorVersion: "2",
		sourceRevision: "injected",
		configurations: {
			generation: { model: "unused", settings: {} },
			judgment: { model: "injected", settings: {} },
		},
	});
	expect(run.manifest.version).toBe(2);
	expect(
		run.cases
			.filter(
				(record) =>
					record.status !== "Unresolved" &&
					!(
						record.status === "Success" &&
						(record.evaluation as { contractPass: boolean })
							.contractPass
					),
			)
			.map((record) => ({
				id: record.caseId,
				error: record.error,
				output: record.output,
				expected: record.idealOutput,
			})),
	).toEqual([]);
	expect(
		run.cases.every(
			(record) =>
				record.traces.length === 1 &&
				record.calls > 0 &&
				record.calls < 3,
		),
	).toBe(true);
});

test("compact classification state preserves positions, source spacing, punctuation and opaque text", async () => {
	const sentence: SegmentedSentence<"de"> = {
		id: "compact",
		language: "de",
		segments: [
			{ kind: "ResolvableText", text: "vor" },
			{ kind: "Whitespace", text: "\t " },
			{ kind: "OpaqueText", text: "<s0> &" },
			{ kind: "Punctuation", text: "," },
			{ kind: "Whitespace", text: "\n" },
			{ kind: "ResolvableText", text: "vor" },
			{ kind: "Punctuation", text: "." },
		],
	};
	const run = controlled([5], "Lexeme/ADP");
	const output = await Effect.runPromise(
		run.dumgen.classifyTarget({ sentence, clickedSegmentIndex: 5 }),
	);
	expect(output.memberSegmentIndices).toEqual([5]);
	const [membership] = run.traces[0]?.calls ?? [];
	expect(run.traces[0]?.calls).toHaveLength(1);
	expect(membership?.request.input).toMatchObject({
		sentence: "<s0>vor</s0>\t &lt;s0&gt; &amp;,\n<s5>vor</s5>.",
		clickedSegmentIndex: 5,
	});
	// Speculation belongs to its question; every membership judgment keeps the original state.
	expect(Object.keys(membership?.request.input as object)).toEqual([
		"sentence",
		"clickedSegmentIndex",
		"criteria",
	]);
	if (!membership || !("questions" in membership.request))
		throw Error("Expected membership batch");
	expect(Object.keys(membership.request.questions)).toEqual([
		"member_0",
		"singletonRoute",
	]);
	expect(membership.request.questions.singletonRoute?.instructions).toContain(
		"only occurrence <s5>",
	);
	expect(membership.dependsOn).toEqual([]);
});

for (const scenario of [
	{
		name: "accepts a complete singleton in one call",
		members: [3],
		route: "Lexeme/ADJ",
		singletonRoute: "Lexeme/ADJ",
		calls: 1,
	},
	{
		name: "does not retry an unresolved singleton decision",
		members: [3],
		route: "Lexeme/ADJ",
		singletonRoute: "Unresolved",
		calls: 1,
	},
	{
		name: "keeps the original determiner decision without review",
		members: [3],
		route: "Lexeme/PRON",
		singletonRoute: "Lexeme/DET",
		calls: 1,
	},
	{
		name: "keeps the original pronoun decision without review",
		members: [3],
		route: "Lexeme/DET",
		singletonRoute: "Lexeme/PRON",
		calls: 1,
	},
	{
		name: "preserves singleton uncertainty without another call",
		members: [3],
		route: "Unresolved",
		singletonRoute: "Unresolved",
		calls: 1,
	},
	{
		name: "ignores an accepted singleton route for a multi-member target",
		members: [0, 1],
		route: "Lexeme/NOUN",
		singletonRoute: "Lexeme/DET",
		calls: 2,
	},
	{
		name: "ignores singleton uncertainty for a multi-member target",
		members: [0, 1],
		route: "Lexeme/NOUN",
		singletonRoute: "Unresolved",
		calls: 2,
	},
	{
		name: "does not bypass invalid whole-group membership with a singleton route",
		members: [0, 1],
		route: "Unresolved",
		singletonRoute: "Lexeme/DET",
		calls: 2,
	},
	{
		name: "does not let singleton acceptance override unresolved membership",
		members: [3],
		route: "Lexeme/ADJ",
		singletonRoute: "Lexeme/ADJ",
		unresolvedMember: 0,
		calls: 1,
	},
]) {
	test(scenario.name, async () => {
		const sentence: SegmentedSentence<"de"> = {
			id: "speculative",
			language: "de",
			segments: ["Der", "Aufstieg", "war", "anstrengend"].map((text) => ({
				kind: "ResolvableText",
				text,
			})),
		};
		const run = controlled(scenario.members, scenario.route, scenario);
		const result = await Effect.runPromise(
			Effect.either(
				run.dumgen.classifyTarget({
					sentence,
					clickedSegmentIndex: required(scenario.members[0]),
				}),
			),
		);
		const selectedRoute =
			scenario.members.length === 1
				? scenario.singletonRoute
				: scenario.route;
		const unresolved =
			selectedRoute === "Unresolved" ||
			scenario.unresolvedMember !== undefined;
		if (unresolved) {
			expect(result._tag).toBe("Left");
			expect(run.traces[0]?.failure?.tag).toBe("Unresolved");
		} else {
			const [family, kind] = selectedRoute.split("/");
			expect(result).toMatchObject({
				_tag: "Right",
				right: { family, kind, memberSegmentIndices: scenario.members },
			});
		}
		const trace = required(run.traces[0]);
		expect(trace.calls).toHaveLength(scenario.calls);
		if (scenario.calls === 2) {
			expect(trace.calls[1]?.request.input).toMatchObject({
				memberSegmentIndices: scenario.members,
			});
			expect(trace.calls[1]?.dependsOn).toEqual([
				required(trace.calls[0]).id,
			]);
		}
		if (scenario.members.length > 1)
			expect(trace.events).toContainEqual({
				kind: "JudgmentApplicability",
				data: {
					consumed: ["member_1", "member_2", "member_3"],
					ignored: ["singletonRoute"],
				},
			});
	});
}

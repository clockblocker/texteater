import { expect, test } from "bun:test";
import { required } from "common-utils";
import { Effect } from "effect";
import type {
	Questions,
	SystemOneResult,
	TypeSafeExecutor,
} from "promptsmith/typesafe";
import subjectCases from "../src/concrete-lang/de/target-classification/source-data.json";
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
	options: { unresolvedMember?: number } = {},
) {
	const traces: OperationTrace[] = [];
	const judge: TypeSafeExecutor = async (request) =>
		answers(request, (id) =>
			id === "route"
				? route
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
				// Membership and route are one round trip regardless of group size.
				expect(trace.calls.map((call) => call.executor)).toEqual([
					"TypeSafe",
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
					"route",
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
	expect(invalid.traces[0]!.calls).toHaveLength(1);
	expect(invalid.traces[0]!.failure?.tag).toBe("Unresolved");
});
test("a noun target absorbing stray articles stops in classification", async () => {
	const sentence: SegmentedSentence<"de"> = {
		id: "stray-articles",
		language: "de",
		segments: ["Der", "Weg", "ist", "das", "Ziel"].map((text) => ({
			text,
			kind: "ResolvableText",
		})),
	};
	const stray = controlled([0, 1, 3], "Lexeme/NOUN");
	const result = await Effect.runPromise(
		Effect.either(
			stray.dumgen.classifyTarget({ sentence, clickedSegmentIndex: 1 }),
		),
	);
	expect(result._tag).toBe("Left");
	expect(stray.traces[0]!.failure?.tag).toBe("Unresolved");
	expect(stray.traces[0]!.failure?.message).toContain("article");
	const own = controlled([0, 1], "Lexeme/NOUN");
	expect(
		(
			await Effect.runPromise(
				own.dumgen.classifyTarget({ sentence, clickedSegmentIndex: 1 }),
			)
		).memberSegmentIndices,
	).toEqual([0, 1]);
	// An article after the noun is never its own.
	const trailing = controlled([1, 3], "Lexeme/NOUN");
	expect(
		(
			await Effect.runPromise(
				Effect.either(
					trailing.dumgen.classifyTarget({
						sentence,
						clickedSegmentIndex: 1,
					}),
				),
			)
		)._tag,
	).toBe("Left");
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
		"route",
	]);
	expect(membership.request.questions.route?.instructions).toContain(
		"`clickedSegmentIndex`",
	);
	expect(membership.dependsOn).toEqual([]);
});

for (const scenario of [
	{
		name: "accepts a complete singleton in one call",
		members: [3],
		route: "Lexeme/ADJ",
	},
	{
		name: "preserves singleton uncertainty without another call",
		members: [3],
		route: "Unresolved",
	},
	{
		name: "accepts a multi-member target in one call",
		members: [0, 1],
		route: "Lexeme/NOUN",
	},
	{
		name: "stops on an undefensible multi-member unit without repair",
		members: [0, 1],
		route: "Unresolved",
	},
	{
		name: "does not let route acceptance override unresolved membership",
		members: [3],
		route: "Lexeme/ADJ",
		unresolvedMember: 0,
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
		const unresolved =
			scenario.route === "Unresolved" ||
			scenario.unresolvedMember !== undefined;
		if (unresolved) {
			expect(result._tag).toBe("Left");
			expect(run.traces[0]?.failure?.tag).toBe("Unresolved");
		} else {
			const [family, kind] = scenario.route.split("/");
			expect(result).toMatchObject({
				_tag: "Right",
				right: { family, kind, memberSegmentIndices: scenario.members },
			});
		}
		const trace = required(run.traces[0]);
		// One round trip: membership and the unit route are independent judgments.
		expect(trace.calls).toHaveLength(1);
		expect(required(trace.calls[0]).dependsOn).toEqual([]);
		if (scenario.unresolvedMember === undefined)
			expect(trace.events).toContainEqual({
				kind: "JudgmentApplicability",
				data: {
					consumed: [
						...[0, 1, 2, 3]
							.filter((index) => index !== scenario.members[0])
							.map((index) => `member_${index}`),
						"route",
					],
					ignored: [],
				},
			});
	});
}

for (const [id, scenario] of Object.entries(subjectCases.cases).filter(([id]) =>
	/target-de-(subject-|demo-exists|demo-weather|referential-es|positional-es|anticipatory-es|object-es)/u.test(
		id,
	),
)) {
	test(`${id}: preserves the reviewed occurrence boundary`, async () => {
		const target = scenario.idealOutput;
		if (!("kind" in target)) throw Error("Expected resolved target");
		const sentence = {
			id,
			language: "de",
			segments: scenario.input.segments,
		} as SegmentedSentence<"de">;
		const run = controlled(
			target.memberSegmentIndices,
			`${target.family}/${target.kind}`,
		);
		expect<unknown>(
			await Effect.runPromise(
				run.dumgen.classifyTarget({
					sentence,
					clickedSegmentIndex: scenario.input.clickedSegmentIndex,
				}),
			),
		).toEqual(target);
	});
}

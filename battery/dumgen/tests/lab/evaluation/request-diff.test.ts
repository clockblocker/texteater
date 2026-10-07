import { expect, test } from "bun:test";
import { experimentRequests } from "../../../lab/evaluation/experiments.js";
import {
	compareRequestRuns,
	type RecordedRequest,
	type RequestRun,
	sortedRequests,
} from "../../../lab/evaluation/request-diff.js";

const jev = (
	stage: string,
	repetition: number,
	questions: Record<string, unknown>,
	state: unknown = { sentence: "Er kam." },
): RecordedRequest => ({
	executor: "jev",
	stage,
	repetition,
	state,
	questions,
});

const outcome = (value: unknown, repetition = 0, path?: string) => ({
	repetition,
	...(path === undefined ? {} : { path }),
	outcome: value,
});

const runOf = (cases: RequestRun["cases"]): RequestRun => ({
	runId: "run",
	experimentId: "segment-in-units/de:dev",
	sourceRevision: "test",
	createdAt: "",
	answers: { source: "test" },
	cases,
});

test("a request diff pairs a moved request with its stage and repetition and names the paths that differ", () => {
	const a = jev("candidates", 0, { q1: { text: "a" }, q2: { text: "b" } });
	const b = jev("routes", 0, { r1: { text: "r" } });
	const left = runOf([
		{ id: "same", requests: [a, b], outcomes: [outcome({ units: [] })] },
		{
			id: "moved",
			requests: [a, a, b],
			outcomes: [outcome({ units: [1] })],
		},
		{ id: "gone", requests: [], outcomes: [] },
	]);
	const right = runOf([
		// Order doesn't matter; the multiset does.
		{ id: "same", requests: [b, a], outcomes: [outcome({ units: [] })] },
		{
			id: "moved",
			requests: [
				a,
				jev("candidates", 0, { q1: { text: "A" }, q3: { text: "c" } }),
				jev("routes", 1, { r1: { text: "r" } }),
			],
			outcomes: [outcome({ units: [2] })],
		},
		{ id: "new", requests: [], outcomes: [] },
	]);
	expect(compareRequestRuns(left, right)).toMatchObject({
		unchanged: 1,
		onlyLeft: ["gone"],
		onlyRight: ["new"],
		changed: [
			{
				caseId: "moved",
				requests: [
					{
						request: "jev candidates #0",
						differs: ["q1.text", "-q2", "+q3"],
					},
					{ request: "jev routes #0", only: "left" },
					{ request: "jev routes #1", only: "right" },
				],
				outcomes: [{ repetition: 0, differs: ["units.0"] }],
			},
		],
	});
});

test("answer paths pair apart: a request or outcome on one path is never matched with another path's", () => {
	const onPath = (path: string, text: string): RecordedRequest => ({
		...jev("routes", 0, { r1: { text } }),
		path,
	});
	const left = runOf([
		{
			id: "c",
			requests: [onPath("stand-in", "r"), onPath("contrary", "r")],
			outcomes: [
				outcome({ units: [1] }, 0, "stand-in"),
				outcome({ units: [1] }, 0, "contrary"),
			],
		},
	]);
	const right = runOf([
		{
			id: "c",
			requests: [onPath("stand-in", "r"), onPath("contrary", "R")],
			outcomes: [
				outcome({ units: [1] }, 0, "stand-in"),
				outcome({ units: [2] }, 0, "contrary"),
			],
		},
	]);
	expect(compareRequestRuns(left, right).changed).toEqual([
		{
			caseId: "c",
			requests: [
				{
					request: "jev routes #0 (contrary)",
					differs: ["r1.text"],
				},
			],
			outcomes: [
				{ repetition: 0, path: "contrary", differs: ["units.0"] },
			],
		},
	]);
});

test("question order is part of a request, so a reordered request differs", () => {
	const ordered = jev("candidates", 0, { q1: 1, q2: 2 });
	const reordered = jev("candidates", 0, { q2: 2, q1: 1 });
	expect(
		compareRequestRuns(
			runOf([{ id: "c", requests: [ordered], outcomes: [] }]),
			runOf([{ id: "c", requests: [reordered], outcomes: [] }]),
		).changed,
	).toEqual([
		{
			caseId: "c",
			requests: [
				{
					request: "jev candidates #0",
					differs: ["(key order)"],
				},
			],
		},
	]);
	expect(sortedRequests([reordered, ordered])).toEqual(
		sortedRequests([ordered, reordered]),
	);
});

test("resolve.grammar's request run sends jev and Luna requests at gold's answers, the same each time", async () => {
	const args = {
		experimentId: "resolve-grammar/de:heldout",
		sourceRevision: "test",
	};
	const first = await experimentRequests(args);
	expect(first.answers).toEqual({ source: "gold" });
	expect(first.cases.length).toBeGreaterThan(0);
	const executors = new Set(
		first.cases.flatMap(({ requests }) =>
			requests.map(({ executor }) => executor),
		),
	);
	expect([...executors].sort()).toEqual(["jev", "luna"]);
	expect(first.cases.every(({ outcomes }) => outcomes.length === 1)).toBe(
		true,
	);
	expect(await experimentRequests(args)).toEqual(first);
	await expect(
		experimentRequests({
			experimentId: "resolve-grammar/de:dev:e2e",
			sourceRevision: "test",
		}),
	).rejects.toThrow("has no request diff");
});

test("resolve.reading's and knowledge.produce's request runs send jev and Luna requests at gold's answers, the same each time", async () => {
	for (const experimentId of ["resolve-reading/de:dev", "knowledge/de:dev"]) {
		const args = { experimentId, sourceRevision: "test" };
		const first = await experimentRequests(args);
		expect(first.answers).toEqual({ source: "gold" });
		expect(first.cases.length).toBeGreaterThan(0);
		const executors = new Set(
			first.cases.flatMap(({ requests }) =>
				requests.map(({ executor }) => executor),
			),
		);
		expect([...executors].sort()).toEqual(["jev", "luna"]);
		expect(
			first.cases.every(
				({ outcomes }) =>
					outcomes.length === 1 &&
					!(
						typeof outcomes[0]?.outcome === "object" &&
						outcomes[0]?.outcome !== null &&
						"failure" in outcomes[0].outcome
					),
			),
		).toBe(true);
		expect(await experimentRequests(args)).toEqual(first);
	}
	// A reading case runs once per arm, under the run's own case id.
	const reading = await experimentRequests({
		experimentId: "resolve-reading/de:dev",
		sourceRevision: "test",
	});
	expect(
		reading.cases.every(({ id }) => /:(present|removed)$/u.test(id)),
	).toBe(true);
});

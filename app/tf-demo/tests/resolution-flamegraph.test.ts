import { expect, test } from "bun:test";
import { layoutFlamegraph } from "../src/devtools/resolution-flamegraph";

test("parents precede children; concurrent siblings have separate rows; sequential siblings reuse rows", () => {
	const spans = layoutFlamegraph([
		{ id: "child", parentId: "root", startedAt: 0, durationMs: 50 },
		{ id: "parallel", parentId: "root", startedAt: 10, durationMs: 20 },
		{ id: "later", parentId: "root", startedAt: 50, durationMs: 50 },
		{ id: "root", startedAt: 0, durationMs: 100 },
	]);
	const rows = Object.fromEntries(
		spans.map(({ step, row }) => [step.id, row]),
	);
	expect(rows).toEqual({ root: 0, child: 1, parallel: 2, later: 1 });
});

test("missing parents and cyclic traces do not prevent inspection", () => {
	expect(layoutFlamegraph([])).toEqual([]);
	const spans = layoutFlamegraph([
		{ id: "orphan", parentId: "missing", startedAt: 0, durationMs: 0 },
		{ id: "a", parentId: "b", startedAt: 1, durationMs: 10 },
		{ id: "b", parentId: "a", startedAt: 1, durationMs: 10 },
	]);
	expect(new Set(spans.map(({ step }) => step.id)).size).toBe(3);
	expect(spans.every(({ row }) => row >= 0)).toBe(true);
});

import { expect, test } from "bun:test";
import {
	compareWithBaseline,
	findingsOf,
	scopeOf,
	updatedBaseline,
} from "../lib/knip";

const workspaces = ["app/tf-demo", "battery/dumling"];

test("the run covers the repository at the root and one workspace inside it", () => {
	expect(scopeOf("/repo", "/repo", workspaces)).toBeUndefined();
	expect(scopeOf("/repo/app/tf-demo", "/repo", workspaces)).toBe(
		"app/tf-demo",
	);
	expect(scopeOf("/repo/battery/dumling/src", "/repo", workspaces)).toBe(
		"battery/dumling",
	);
	expect(() => scopeOf("/repo/tooling", "/repo", workspaces)).toThrow();
});

test("findings are grouped by the workspace that owns the file", () => {
	const findings = findingsOf(
		{
			issues: [
				{
					file: "battery/dumling/src/types.ts",
					exports: [{ name: "dead" }],
					types: [{ name: "Dead" }],
					owners: [{ name: "@someone" }],
				},
				{ file: "app/tf-demo/src/old.ts", files: [{ name: "old.ts" }] },
				{
					file: "package.json",
					devDependencies: [{ name: "left-pad" }],
				},
				{
					file: "app/tf-demo/src/twice.ts",
					duplicates: [[{ name: "a" }, { name: "default" }]],
				},
			],
		},
		workspaces,
	);

	expect(findings).toEqual({
		".": ["package.json: devDependencies left-pad"],
		"app/tf-demo": [
			"app/tf-demo/src/old.ts: file",
			"app/tf-demo/src/twice.ts: duplicates a = default",
		],
		"battery/dumling": [
			"battery/dumling/src/types.ts: exports dead",
			"battery/dumling/src/types.ts: types Dead",
		],
	});
});

test("only findings outside the baseline fail, within the run's scope", () => {
	const baseline = {
		"app/tf-demo": ["a.ts: exports gone", "a.ts: exports kept"],
		"battery/dumling": ["b.ts: exports kept"],
	};
	const found = {
		"app/tf-demo": ["a.ts: exports kept", "a.ts: exports new"],
		"battery/dumling": ["b.ts: exports kept", "b.ts: exports new"],
	};

	expect(compareWithBaseline(found, baseline, "app/tf-demo")).toEqual({
		added: { "app/tf-demo": ["a.ts: exports new"] },
		removed: { "app/tf-demo": ["a.ts: exports gone"] },
	});
	expect(compareWithBaseline(found, baseline, undefined)).toEqual({
		added: {
			"app/tf-demo": ["a.ts: exports new"],
			"battery/dumling": ["b.ts: exports new"],
		},
		removed: { "app/tf-demo": ["a.ts: exports gone"] },
	});
});

test("updating a workspace's baseline leaves the other workspaces alone", () => {
	const baseline = {
		"app/tf-demo": ["a.ts: exports gone"],
		"battery/dumling": ["b.ts: exports kept"],
	};

	expect(updatedBaseline({}, baseline, "app/tf-demo")).toEqual({
		"battery/dumling": ["b.ts: exports kept"],
	});
	expect(
		updatedBaseline({ ".": ["c.ts: file"] }, baseline, undefined),
	).toEqual({ ".": ["c.ts: file"] });
});

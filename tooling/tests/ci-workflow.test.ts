import { expect, test } from "bun:test";
import { join } from "node:path";
import { ciGates } from "../lib/ci-gates";
import { findRepositoryRoot } from "../lib/workspaces";

test("the CI workflow runs every CI gate once, in order", async () => {
	const root = await findRepositoryRoot(import.meta.dir);
	const workflow = await Bun.file(
		join(root, ".github/workflows/ci.yml"),
	).text();
	const steps = [...workflow.matchAll(/run: bun tooling\/ci\.ts (\S+)/g)].map(
		(match) => match[1],
	);

	expect(steps).toEqual(ciGates.map((gate) => gate.name));
});

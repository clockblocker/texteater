import { expect, test } from "bun:test";
import { evaluateExperiment, operationExperiment } from "../src/development.js";
import { listExperiments } from "../src/development.js";

const offline = {
	judge: async () => { throw Error("offline judgment"); },
	execute: async () => { throw Error("offline generation"); },
};
test("every in-scope catalog route resolves to its production operation", () => {
	for (const { id } of listExperiments()) {
		if (id.includes("lexical-breakdown") || id.includes("morphological-tree")) continue;
		const operation = operationExperiment(id, offline);
		expect(operation.corpus.route).toBe(id.split(":")[0] ?? id);
		expect(Object.keys(operation.corpus.cases).length).toBeGreaterThan(0);
	}
});
test("public evaluation dispatch retains intake failures as v2 operation evidence", async () => {
	const run = await evaluateExperiment({ ...offline, experimentId: "intake", sourceRevision: "routing-test" });
	expect(run.manifest.version).toBe(2);
	expect(run.cases.length).toBe(6);
});

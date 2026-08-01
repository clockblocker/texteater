import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	appendSessionEvent,
	describeErrors,
	type LaboratorySessionEvent,
} from "../src/session-log";

const temporaryRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })),
	);
});

function event(
	sessionId: string,
	operation: LaboratorySessionEvent["operation"],
) {
	return {
		timestamp: "2026-08-01T12:00:00.000Z",
		sessionId,
		operation,
		input: { text: "Der Hund" },
		promptNames: [`laboratory.${operation}`],
		model: "gpt-5-nano",
		trace: {
			stages: { intake: { output: { decision: "Accepted" } } },
			modelExchanges:
				operation === "click-resolution"
					? [
							{
								phase: "rejected" as const,
								promptPath:
									"laboratory.grammaticalResolution.de.Lexeme.NOUN",
								modelInput: {
									markedContext: "<TARGET>Hund</TARGET>",
								},
								modelOutput: { decision: "Resolved" },
								validationError: {
									name: "ZodError",
									message: "resolution payload missing",
								},
							},
						]
					: [],
		},
		applicationResult: { status: 200, body: { ok: true } },
		latencyMs: 12.3,
		errors: [],
	} satisfies LaboratorySessionEvent;
}

describe("laboratory session logging", () => {
	test("appends one JSON object per line in its session directory", async () => {
		const root = await mkdtemp(join(tmpdir(), "laboratory-session-log-"));
		temporaryRoots.push(root);
		const sessionId = crypto.randomUUID();
		const first = event(sessionId, "segmentation-chain");
		const second = event(sessionId, "click-resolution");

		await Promise.all([
			appendSessionEvent(first, root),
			appendSessionEvent(second, root),
		]);

		const contents = await readFile(
			join(root, sessionId, "events.jsonl"),
			"utf8",
		);
		expect(contents.endsWith("\n")).toBe(true);
		expect(contents.trimEnd().split("\n").map(JSON.parse)).toEqual([
			first,
			second,
		]);
	});

	test("captures an error cause chain", () => {
		const cause = new TypeError("invalid output");
		const error = new Error("generation failed", { cause });

		expect(describeErrors(error)).toEqual([
			{ name: "Error", message: "generation failed" },
			{ name: "TypeError", message: "invalid output" },
		]);
	});
});

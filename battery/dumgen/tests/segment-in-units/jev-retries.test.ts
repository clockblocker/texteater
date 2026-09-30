import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TypeSafeExecutor } from "promptsmith/typesafe";
import {
	type CallRecord,
	Jev,
	noul,
} from "../../src/segment-in-units/lab/jev.js";

const directory = await mkdtemp(join(tmpdir(), "segment-ownership-retries-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

test("a zero-retry pilot sends one transport request and disables SDK retries", async () => {
	let attempts = 0;
	const executor: TypeSafeExecutor = async (_request, options) => {
		attempts++;
		expect(options?.retry?.maxRetries).toBe(0);
		throw Object.assign(new Error("service unavailable"), { status: 503 });
	};
	const jev = new Jev({ cacheDirectory: directory, maxRetries: 0, executor });
	const calls: CallRecord[] = [];
	await expect(
		jev.ask({
			stage: "ownership",
			state: "A sentence",
			questions: { test: noul("Does the sentence exist?") },
			repetition: 0,
			calls,
		}),
	).rejects.toThrow("service unavailable");
	expect(attempts).toBe(1);
	expect(calls).toHaveLength(1);
	expect(calls[0]?.error).toBe("service unavailable");
});

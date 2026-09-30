import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TypeSafeExecutor } from "promptsmith/typesafe";
import { type CallRecord, noul } from "../../src/segment-in-units/lab/jev.js";
import { PilotJev } from "../../src/segment-in-units/lab/pilot-jev.js";

const directory = await mkdtemp(join(tmpdir(), "segment-ownership-packing-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

test("token-aware batches preserve every question without truncating options", async () => {
	const requestSizes: number[] = [];
	const executor: TypeSafeExecutor = async (request) => {
		requestSizes.push(Buffer.byteLength(JSON.stringify(request), "utf8"));
		return {
			model: request.model,
			answers: Object.fromEntries(
				Object.keys(request.questions).map((key) => [
					key,
					{ type: "noul", noul: 0.9 },
				]),
			),
			usage: { input_tokens: 100, output_tokens: 0 },
		} as never;
	};
	const jev = new PilotJev({
		cacheDirectory: directory,
		executor,
		maxRetries: 0,
	});
	const questions = Object.fromEntries(
		Array.from({ length: 8 }, (_, index) => [
			`q${index}`,
			noul(`${index} ${"x".repeat(12_000)}`),
		]),
	);
	const calls: CallRecord[] = [];
	const answers = await jev.ask({
		stage: "ownership",
		state: "short",
		questions,
		repetition: 0,
		calls,
	});
	expect(Object.keys(answers).sort()).toEqual(Object.keys(questions).sort());
	expect(calls.length).toBeGreaterThan(1);
	expect(requestSizes.every((bytes) => bytes + 4096 <= 65_536)).toBe(true);
	expect(new Set(calls.map(({ stage }) => stage)).size).toBe(calls.length);
});

test("an overlong indivisible question is rejected without a provider request", async () => {
	let attempts = 0;
	const executor: TypeSafeExecutor = async () => {
		attempts++;
		throw Error("must not dispatch");
	};
	const jev = new PilotJev({
		cacheDirectory: directory,
		executor,
		maxRetries: 0,
	});
	await expect(
		jev.ask({
			stage: "ownership",
			state: "short",
			questions: { huge: noul("x".repeat(33_000)) },
			repetition: 0,
			calls: [],
		}),
	).rejects.toThrow("32K bound");
	expect(attempts).toBe(0);
});

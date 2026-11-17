import { afterAll, afterEach, expect, spyOn, test } from "bun:test";
import { saveTrace } from "../server/traceWrite";

const warn = spyOn(console, "warn").mockImplementation(() => {});
afterEach(() => warn.mockClear());
afterAll(() => warn.mockRestore());

/** A write that fails with `errors` in turn, then succeeds. */
function writeFailing(...errors: Error[]) {
	const calls: number[] = [];
	return {
		calls,
		write: async () => {
			calls.push(calls.length);
			const error = errors[calls.length - 1];
			if (error) throw error;
		},
	};
}

const rateLimited = () =>
	new Error(
		'{"code":"TooManyWrites","message":"Too many writes per second."}',
	);

test("a trace write Convex refuses for its write rate is retried after a pause, and saved", async () => {
	const pauses: number[] = [];
	const { calls, write } = writeFailing(rateLimited(), rateLimited());
	await saveTrace("trace", write, async (ms) => {
		pauses.push(ms);
	});
	expect(calls).toHaveLength(3);
	expect(pauses).toEqual([1000, 2000]);
	expect(warn).not.toHaveBeenCalled();
});

test("a trace write still refused after its retries is logged and dropped, never thrown", async () => {
	const { calls, write } = writeFailing(
		rateLimited(),
		rateLimited(),
		rateLimited(),
	);
	await saveTrace("trace", write, async () => {});
	expect(calls).toHaveLength(3);
	expect(warn).toHaveBeenCalledTimes(1);
});

test("a trace write failing for another reason is logged at once, with no retry", async () => {
	const { calls, write } = writeFailing(new Error("Document too large"));
	await saveTrace("trace", write, async () => {
		throw new Error("no pause expected");
	});
	expect(calls).toHaveLength(1);
	expect(warn).toHaveBeenCalledTimes(1);
});

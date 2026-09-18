import { expect, test } from "bun:test";
import { transportBreakdown } from "../src/devtools/resolution-transport";

// Recorded milestones from inspection p971earf28hw3hgj6957cysqnd8ena6r.
const timing = {
	headersMs: 1521.389042,
	bodyMs: 51.64675,
	providerProcessingMs: 1118,
	detailed: {
		connection: { reused: false },
		milestonesMs: {
			connectStarted: 0.18675,
			connected: 81.950292,
			headersSent: 82.006167,
			requestBodySent: 82.209333,
			responseHeaders: 1520.947708,
			firstResponseBodyChunk: 1571.638792,
			responseBodyComplete: 1571.86575,
		},
		request: { serializationMs: 0.014333 },
		local: {
			bodyReadMs: 51.485,
			responseParseMs: 0.138583,
			outputParseMs: 0.003125,
		},
	},
};
const parse = (value: unknown) =>
	transportBreakdown(JSON.stringify({ metadata: { timing: value } }));

test("recorded LLM timings become five transport phases, with overlapping provider timing separate", () => {
	const breakdown = parse(timing);
	expect(breakdown?.phases.map((phase) => phase.name)).toEqual([
		"Open connection",
		"Upload request",
		"Wait for response headers",
		"Wait for first body byte",
		"Download response",
	]);
	expect(breakdown?.phases[0]?.durationMs).toBeCloseTo(81.763542);
	expect(breakdown?.phases[2]?.offsetMs).toBeCloseTo(82.209333);
	expect(breakdown?.phases[2]?.durationMs).toBeCloseTo(1438.738375);
	expect(breakdown?.measurements[0]).toEqual({
		name: "Provider processing (reported)",
		durationMs: 1118,
	});
	expect(breakdown?.reused).toBe(false);
});

test("reused connections do not get an invented connection phase", () => {
	const {
		connectStarted: _,
		connected: __,
		...milestonesMs
	} = timing.detailed.milestonesMs;
	const breakdown = parse({
		...timing,
		detailed: { milestonesMs, connection: { reused: true } },
	});
	expect(breakdown?.phases).toHaveLength(4);
	expect(breakdown?.phases[0]?.name).toBe("Upload request");
});

test("older traces use coarse fetch timings without pretending to expose provider internals", () => {
	expect(parse({ headersMs: 100, bodyMs: 20 })?.phases).toEqual([
		{ name: "Fetch response headers", offsetMs: 0, durationMs: 100 },
		{ name: "Read and parse response", offsetMs: 100, durationMs: 20 },
	]);
	expect(transportBreakdown("not JSON")).toBeUndefined();
	expect(transportBreakdown('{"input":{}}')).toBeUndefined();
	expect(parse({ headersMs: -1, bodyMs: "10" })?.phases).toEqual([]);
});

test("incomplete or reversed milestones never produce fabricated durations", () => {
	expect(
		parse({
			detailed: {
				milestonesMs: {
					headersSent: 20,
					requestBodySent: 10,
					responseHeaders: null,
				},
			},
		})?.phases,
	).toEqual([]);
});

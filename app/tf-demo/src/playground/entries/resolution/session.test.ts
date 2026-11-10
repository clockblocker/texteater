import { describe, expect, test } from "bun:test";
import { endsAt, PRESETS, past, sessionTimeline, stateAt } from "./session";

describe("a fake Resolution Session", () => {
	test("passes through the real Session's stages, each a latency after the one before", () => {
		expect(sessionTimeline(PRESETS.typical)).toEqual([
			{ at: 0, phase: "Clicked" },
			{ at: 120, phase: "Selected" },
			{ at: 180, phase: "Started" },
			{ at: 600, phase: "Grammar" },
			{ at: 1400, phase: "Knowledge" },
			{ at: 1500, phase: "Committed" },
		]);
	});

	test("a typical click commits around 1.5 s, most of it the wait for its Knowledge", () => {
		const { latencies } = PRESETS.typical;
		const total = endsAt(sessionTimeline(PRESETS.typical));
		expect(total).toBe(1500);
		expect(latencies.knowledge).toBeGreaterThan(total / 2);
	});

	test("a stored route answers with the selection and runs no Session", () => {
		expect(sessionTimeline(PRESETS.stored)).toEqual([
			{ at: 0, phase: "Clicked" },
			{ at: 60, phase: "Stored" },
		]);
	});

	test("a failure ends where the Knowledge would have landed", () => {
		const timeline = sessionTimeline(PRESETS.failure);
		expect(timeline.at(-1)).toEqual({ at: 1500, phase: "Failed" });
		expect(timeline.map(({ phase }) => phase)).not.toContain("Knowledge");
	});

	test("is in the last state it reached", () => {
		const timeline = sessionTimeline(PRESETS.typical);
		expect(stateAt(timeline, 0).phase).toBe("Clicked");
		expect(stateAt(timeline, 599).phase).toBe("Started");
		expect(stateAt(timeline, 600).phase).toBe("Grammar");
		expect(stateAt(timeline, 9_000).phase).toBe("Committed");
	});

	test("a failed Session knows its Grammar and never its Knowledge", () => {
		expect(past("Failed", "Grammar")).toBe(true);
		expect(past("Failed", "Knowledge")).toBe(false);
		expect(past("Stored", "Committed")).toBe(true);
		expect(past("Started", "Grammar")).toBe(false);
	});

	test("stages with no latency are reached together", () => {
		const timeline = sessionTimeline({
			outcome: "Complete",
			latencies: {
				selection: 0,
				firstResult: 0,
				grammar: 0,
				knowledge: 0,
				commit: 0,
			},
		});
		expect(stateAt(timeline, 0).phase).toBe("Committed");
	});
});

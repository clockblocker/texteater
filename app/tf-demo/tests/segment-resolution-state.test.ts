import { expect, test } from "bun:test";

import {
	beginSegmentResolution,
	finishSegmentResolution,
} from "../convex/model/segmentResolutionState";

function stateHarness(
	initial: Record<string, unknown> = {
		_id: "segment-1",
		kind: "ResolvableText",
	},
) {
	let segment = { ...initial };
	const ctx = {
		db: {
			async get(id: string) {
				return id === segment._id ? segment : null;
			},
			async patch(id: string, patch: Record<string, unknown>) {
				if (id !== segment._id) throw new Error("Unexpected Segment.");
				segment = { ...segment, ...patch };
			},
		},
	};
	return {
		ctx,
		segment: () => segment,
		commitMembership() {
			segment = {
				...segment,
				attestationMembership: {
					attestationId: "attestation-1",
					orthography: "Exact",
				},
			};
		},
	};
}

test("shared Segment Resolution State counts concurrent active sessions", async () => {
	const fixture = stateHarness();

	expect(
		await beginSegmentResolution(
			fixture.ctx as never,
			"segment-1" as never,
		),
	).toBe(true);
	expect(
		await beginSegmentResolution(
			fixture.ctx as never,
			"segment-1" as never,
		),
	).toBe(true);
	expect(fixture.segment().resolutionState).toEqual({
		kind: "Active",
		activeSessionCount: 2,
	});

	await finishSegmentResolution(
		fixture.ctx as never,
		"segment-1" as never,
		"Unresolved",
	);
	expect(fixture.segment().resolutionState).toEqual({
		kind: "Active",
		activeSessionCount: 1,
	});

	await finishSegmentResolution(
		fixture.ctx as never,
		"segment-1" as never,
		"PermanentFailure",
	);
	expect(fixture.segment().resolutionState).toEqual({
		kind: "PermanentFailure",
	});

	await beginSegmentResolution(fixture.ctx as never, "segment-1" as never);
	expect(fixture.segment().resolutionState).toEqual({
		kind: "Active",
		activeSessionCount: 1,
	});
});

test("committed Attestation membership heals every stale terminal write", async () => {
	const fixture = stateHarness({
		_id: "segment-1",
		kind: "ResolvableText",
		resolutionState: { kind: "Active", activeSessionCount: 2 },
	});
	fixture.commitMembership();

	await finishSegmentResolution(
		fixture.ctx as never,
		"segment-1" as never,
		"PermanentFailure",
	);
	expect(fixture.segment().resolutionState).toBeUndefined();
	expect(
		await beginSegmentResolution(
			fixture.ctx as never,
			"segment-1" as never,
		),
	).toBe(false);
	expect(fixture.segment().resolutionState).toBeUndefined();
});

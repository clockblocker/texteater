import { describe, expect, test } from "bun:test";
import type { DumdictPlan } from "../../../src";
import {
	englishRunDraft,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotes,
	getBootedUpDumdict,
} from "./helpers";

describe("host-composed Dumdict commits", () => {
	test("maps a host conflict without publishing dictionary or host changes", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const dictionaryBefore = storage.loadAll();
		const host = {
			claimedSegmentIndices: new Set([6]),
			attestations: [] as string[],
			clicks: [] as string[],
		};
		let receivedPlan: DumdictPlan<"en"> | undefined;

		const result = await dict.addNewNote(
			{ draft: englishRunDraft },
			{
				async applyPlan(plan) {
					receivedPlan = plan;
					const proposedMembers = [4, 6];
					if (
						proposedMembers.some((index) =>
							host.claimedSegmentIndices.has(index),
						)
					) {
						return {
							status: "conflict",
							code: "semanticPreconditionFailed",
							latestRevision: plan.baseRevision,
							message:
								"A proposed Segment already belongs to an Attestation.",
						};
					}

					throw new Error(
						"Expected a host-side membership conflict.",
					);
				},
			},
		);

		expect(receivedPlan).toBeDefined();
		expect(Object.isFrozen(receivedPlan)).toBe(true);
		expect(Object.isFrozen(receivedPlan?.changes)).toBe(true);
		expect(Object.isFrozen(receivedPlan?.changes[0])).toBe(true);
		expect(Object.isFrozen(receivedPlan?.changes[0]?.preconditions)).toBe(
			true,
		);
		expect(result).toEqual({
			status: "conflict",
			code: "semanticPreconditionFailed",
			baseRevision: "mem-1",
			latestRevision: "mem-1",
			message: "A proposed Segment already belongs to an Attestation.",
		});
		expect(storage.loadAll()).toEqual(dictionaryBefore);
		expect([...host.claimedSegmentIndices]).toEqual([6]);
		expect(host.attestations).toEqual([]);
		expect(host.clicks).toEqual([]);
	});
});

test("plans an unseen Surface for a reused Reading and treats an existing Surface as a host-composable no-op", async () => {
	const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
	const surface = {
		language: "en",
		lemma: englishWalkLemma,
		normalizedSurface: "walked",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		surfaceFeatures: null,
		inflectionalFeatures: {
			tense: "Past",
			verbForm: "Fin",
			voice: null,
			person: null,
			number: null,
			mood: null,
		},
	} as const;
	const ownedSurface = {
		surface,
		note: { attestedTranslations: [], attestations: [], notes: "" },
	};
	let createPlan: DumdictPlan<"en"> | undefined;

	const planned = await dict.ensureOwnedSurface(
		{ reading: englishWalkReading, ownedSurface },
		{
			async applyPlan(plan) {
				createPlan = plan;
				return { status: "committed", nextRevision: plan.baseRevision };
			},
		},
	);

	expect(planned.status).toBe("applied");
	expect(createPlan?.changes.map(({ type }) => type)).toEqual([
		"createOwnedSurface",
	]);
	expect(storage.loadAll()[0]?.ownedSurfaceEntries).toEqual([]);

	const committed = await dict.ensureOwnedSurface({
		reading: englishWalkReading,
		ownedSurface,
	});
	expect(committed.status).toBe("applied");
	const revisionAfterCreate = (
		await storage.findStoredReadings({ lemma: englishWalkLemma })
	).revision;

	let noOpPlan: DumdictPlan<"en"> | undefined;
	await dict.ensureOwnedSurface(
		{ reading: englishWalkReading, ownedSurface },
		{
			async applyPlan(plan) {
				noOpPlan = plan;
				return { status: "committed", nextRevision: plan.baseRevision };
			},
		},
	);
	expect(noOpPlan?.changes).toEqual([]);

	await dict.ensureOwnedSurface({
		reading: englishWalkReading,
		ownedSurface,
	});
	expect(
		(await storage.findStoredReadings({ lemma: englishWalkLemma }))
			.revision,
	).toBe(revisionAfterCreate);
});

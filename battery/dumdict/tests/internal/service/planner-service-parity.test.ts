import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type {
	CleanupRelationsRequest,
	DumdictPreparationFailure,
	PreparedMutation,
} from "../../../src";
import type { ReadingEntryContextLoad } from "../../../src/service/context-request";
import {
	createDumdictPlanner,
	type DumdictPlanOutcome,
} from "../../../src/service/planner";
import type { InMemoryTestStorage } from "../../../src/testing/in-memory-storage";
import {
	englishRunDraft,
	englishRunLemma,
	englishSwimCitationSurface,
	englishSwimDraft,
	englishWalkReading,
	englishWalkReadingEntry,
	enSerializedNotes,
	enSerializedNotesWithPendingSwimRelation,
	germanGehenLemma,
	getBootedUpDumdict,
} from "./helpers";

type Booted = ReturnType<typeof getBootedUpDumdict<"en">>;

/** What the Effect service decided, in the planner's outcome vocabulary. */
async function serviceOutcome(
	effect: Effect.Effect<PreparedMutation<"en">, DumdictPreparationFailure>,
): Promise<DumdictPlanOutcome<"en">> {
	const result = await Effect.runPromise(Effect.either(effect));
	if (result._tag === "Right") return { status: "planned", ...result.right };
	const failure = result.left;
	switch (failure._tag) {
		case "DumdictRejection":
			return {
				status: "rejected",
				code: failure.code,
				...(failure.message === undefined
					? {}
					: { message: failure.message }),
			};
		case "DumdictInvalidInput":
			return {
				status: "rejected",
				code: "invalidRequest",
				message: failure.message,
			};
		case "DumdictRevisionConflict":
			return {
				status: "conflict",
				code: "revisionConflict",
				...(failure.message === undefined
					? {}
					: { message: failure.message }),
			};
		case "DumdictSemanticPreconditionFailure":
			return {
				status: "conflict",
				code: "semanticPreconditionFailed",
				...(failure.message === undefined
					? {}
					: { message: failure.message }),
			};
		case "DumdictStorageFailure":
			throw new Error(`Unexpected storage failure: ${failure.operation}`);
	}
}

/** Loads the slice a planner host would read for the request, from the same store. */
function hostContext<Load extends ReadingEntryContextLoad<"en">>(
	storage: InMemoryTestStorage<"en">,
	load: Load,
) {
	const planner = createDumdictPlanner("en");
	return Effect.runSync(
		storage.loadReadingEntryContext(planner.contextRequest(load)),
	) as Extract<
		import("../../../src/storage").ReadingEntryContext<"en">,
		{ intent: Load["intent"] }
	>;
}

async function readingEntryParity<Load extends ReadingEntryContextLoad<"en">>(
	boot: () => Booted,
	load: Load,
) {
	const service = boot();
	const host = boot();
	const planner = createDumdictPlanner("en");
	const serviceResult = await serviceOutcome(
		(
			service.dict.prepare[load.intent] as (
				request: Load["request"],
			) => Effect.Effect<
				PreparedMutation<"en">,
				DumdictPreparationFailure
			>
		)(load.request),
	);
	const plannerResult = (
		planner[load.intent] as (
			context: unknown,
			request: Load["request"],
		) => DumdictPlanOutcome<"en">
	)(hostContext(host.storage, load), load.request);
	return { serviceResult, plannerResult };
}

async function cleanupParity(
	boot: () => Booted,
	request: (
		info: Awaited<ReturnType<typeof cleanupInfo>>,
	) => CleanupRelationsRequest<"en">,
) {
	const service = boot();
	const host = boot();
	const cleanup = request(await cleanupInfo(service));
	const serviceResult = await serviceOutcome(
		service.dict.prepare.cleanupRelations(cleanup),
	);
	const plannerResult = createDumdictPlanner("en").cleanupRelations(
		Effect.runSync(
			host.storage.loadCleanupRelationsContext({
				resolutions: cleanup.resolutions,
			}),
		),
		cleanup,
	);
	return { serviceResult, plannerResult };
}

function cleanupInfo({ dict }: Booted) {
	return Effect.runPromise(
		dict.getInfoForRelationsCleanup({ canonicalForm: "swim" }),
	);
}

function firstLocator(info: Awaited<ReturnType<typeof cleanupInfo>>) {
	const locator = info.pendingRelations[0]?.locator;
	if (!locator) throw new Error("Expected a pending relation.");
	return locator;
}

const empty = () => getBootedUpDumdict("en");
const withWalk = () => getBootedUpDumdict("en", enSerializedNotes);
const withPendingSwim = () =>
	getBootedUpDumdict("en", enSerializedNotesWithPendingSwimRelation);

describe("planner and service parity", () => {
	test("addNewNote plans the same changes", async () => {
		const { serviceResult, plannerResult } = await readingEntryParity(
			empty,
			{ intent: "addNewNote", request: { draft: englishRunDraft } },
		);
		expect(serviceResult.status).toBe("planned");
		expect(plannerResult).toEqual(serviceResult);
	});

	test("addNewNote refuses a draft in another language the same way", async () => {
		const { serviceResult, plannerResult } = await readingEntryParity(
			empty,
			{
				intent: "addNewNote",
				request: {
					draft: {
						...englishSwimDraft,
						reading: {
							...englishSwimDraft.reading,
							lemma: germanGehenLemma,
						},
					},
				} as never,
			},
		);
		expect(serviceResult).toMatchObject({
			status: "rejected",
			code: "invalidRequest",
		});
		expect(plannerResult).toEqual(serviceResult);
	});

	test("addNewNote refuses a Surface owned by another Lemma the same way", async () => {
		const { serviceResult, plannerResult } = await readingEntryParity(
			empty,
			{
				intent: "addNewNote",
				request: {
					draft: {
						...englishSwimDraft,
						ownedSurfaces: [
							{
								surface: {
									...englishSwimCitationSurface,
									lemma: englishRunLemma,
								},
								note: {
									attestedTranslations: [],
									attestations: [],
									notes: "",
								},
							},
						],
					},
				},
			},
		);
		expect(serviceResult.status).toBe("rejected");
		expect(plannerResult).toEqual(serviceResult);
	});

	test("applyGeneratedKnowledge plans the same changes", async () => {
		const { serviceResult, plannerResult } = await readingEntryParity(
			withWalk,
			{
				intent: "applyGeneratedKnowledge",
				request: {
					reading: englishWalkReading,
					changes: [],
					pendingRelations: [],
				},
			},
		);
		expect(serviceResult.status).toBe("planned");
		expect(plannerResult).toEqual(serviceResult);
	});

	test("ensureReadingEntry plans the same changes", async () => {
		const { serviceResult, plannerResult } = await readingEntryParity(
			empty,
			{
				intent: "ensureReadingEntry",
				request: { entry: englishWalkReadingEntry() },
			},
		);
		expect(serviceResult.status).toBe("planned");
		expect(plannerResult).toEqual(serviceResult);
	});

	test("ensureOwnedSurface rejects a Surface of another Lemma the same way", async () => {
		const { serviceResult, plannerResult } = await readingEntryParity(
			empty,
			{
				intent: "ensureOwnedSurface",
				request: {
					reading: englishSwimDraft.reading,
					ownedSurface: {
						surface: {
							...englishSwimCitationSurface,
							lemma: englishRunLemma,
						},
						note: {
							attestedTranslations: [],
							attestations: [],
							notes: "",
						},
					},
				},
			},
		);
		expect(serviceResult).toMatchObject({
			status: "rejected",
			code: "invalidDraft",
		});
		expect(plannerResult).toEqual(serviceResult);
	});

	test("cleanupRelations plans the same changes", async () => {
		const { serviceResult, plannerResult } = await cleanupParity(
			withPendingSwim,
			(info) => ({
				baseRevision: info.revision,
				resolutions: [{ locator: firstLocator(info) }],
			}),
		);
		expect(serviceResult.status).toBe("planned");
		expect(plannerResult).toEqual(serviceResult);
	});

	test("cleanupRelations reports a stale workset as a revision conflict in both", async () => {
		const { serviceResult, plannerResult } = await cleanupParity(
			withPendingSwim,
			(info) => ({
				baseRevision: "mem-0" as typeof info.revision,
				resolutions: [{ locator: firstLocator(info) }],
			}),
		);
		expect(serviceResult).toMatchObject({
			status: "conflict",
			code: "revisionConflict",
		});
		expect(plannerResult).toEqual(serviceResult);
	});

	test("cleanupRelations reports a vanished pending relation as a precondition conflict in both", async () => {
		const { serviceResult, plannerResult } = await cleanupParity(
			withPendingSwim,
			(info) => {
				const locator = firstLocator(info);
				return {
					baseRevision: info.revision,
					resolutions: [
						{
							locator: {
								...locator,
								relation:
									locator.relation === "antonym"
										? "synonym"
										: "antonym",
							},
						},
					],
				};
			},
		);
		expect(serviceResult).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
		expect(plannerResult).toEqual(serviceResult);
	});

	test("cleanupRelations rejects duplicated resolutions the same way", async () => {
		const { serviceResult, plannerResult } = await cleanupParity(
			withPendingSwim,
			(info) => {
				const locator = firstLocator(info);
				return {
					baseRevision: info.revision,
					resolutions: [{ locator }, { locator }],
				};
			},
		);
		expect(serviceResult).toMatchObject({
			status: "rejected",
			code: "invalidRequest",
		});
		expect(plannerResult).toEqual(serviceResult);
	});
});

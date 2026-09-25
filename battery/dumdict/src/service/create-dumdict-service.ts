import type * as Dumling from "dumling/types";

import * as Effect from "effect/Effect";
import type {
	DumdictCommitFailure,
	DumdictPreparationFailure,
	DumdictService,
	DumdictStorageFailure,
	MutationResult,
	PreparedMutation,
} from "../public";
import type {
	CreateDumdictServiceOptions,
	ReadingEntryContext,
} from "../storage";
import {
	type ReadingEntryContextLoad,
	storageRequestFor,
} from "./context-request";
import { commitPrepared } from "./effect-mutation";
import { findStoredReadings } from "./find-stored-readings";
import { getInfoForRelationsCleanup } from "./get-info-for-relations-cleanup";
import { createDumdictWorkflows, type DumdictWorkflow } from "./workflows";

type ContextFor<
	L extends Dumling.Language,
	Load extends ReadingEntryContextLoad<L>,
> = Extract<ReadingEntryContext<L>, { intent: Load["intent"] }>;

/** Checks the request, loads its slice through the port, and plans over it. */
function prepare<L extends Dumling.Language, Request, Slice>(
	workflow: DumdictWorkflow<L, Request, Slice>,
	request: Request,
	load: (request: Request) => Effect.Effect<Slice, DumdictStorageFailure>,
): Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure> {
	return Effect.suspend(() => {
		const checked = workflow.check(request);
		if (checked.status === "failed") return Effect.fail(checked.failure);
		return load(checked.value).pipe(
			Effect.flatMap((slice) => {
				const planned = workflow.plan(slice, checked.value);
				return planned.status === "failed"
					? Effect.fail(planned.failure)
					: Effect.succeed(planned.value);
			}),
		);
	});
}

export function createDumdictService<L extends Dumling.Language>(
	options: CreateDumdictServiceOptions<L>,
): DumdictService<L> {
	const workflows = createDumdictWorkflows(options.language);
	const readingEntryContext = <Load extends ReadingEntryContextLoad<L>>(
		load: Load,
	) =>
		options.storage
			.loadReadingEntryContext(storageRequestFor(load))
			.pipe(Effect.map((context) => context as ContextFor<L, Load>));
	const prepared = {
		addAttestation: (request) =>
			prepare(workflows.addAttestation, request, ({ reading }) =>
				options.storage.loadReadingForPatch({ reading }),
			),
		addNewNote: (request) =>
			prepare(workflows.addNewNote, request, (checked) =>
				readingEntryContext({ intent: "addNewNote", request: checked }),
			),
		applyGeneratedKnowledge: (request) =>
			prepare(workflows.applyGeneratedKnowledge, request, (checked) =>
				readingEntryContext({
					intent: "applyGeneratedKnowledge",
					request: checked,
				}),
			),
		ensureOwnedSurface: (request) =>
			prepare(workflows.ensureOwnedSurface, request, (checked) =>
				readingEntryContext({
					intent: "ensureOwnedSurface",
					request: checked,
				}),
			),
		ensureReadingEntry: (request) =>
			prepare(workflows.ensureReadingEntry, request, (checked) =>
				readingEntryContext({
					intent: "ensureReadingEntry",
					request: checked,
				}),
			),
		cleanupRelations: (request) =>
			prepare(workflows.cleanupRelations, request, ({ resolutions }) =>
				options.storage.loadCleanupRelationsContext({ resolutions }),
			),
	} satisfies DumdictService<L>["prepare"];
	const traced =
		<Request>(
			name: string,
			run: (
				request: Request,
			) => Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure>,
		) =>
		(request: Request) =>
			run(request).pipe(
				Effect.withSpan(`dumdict.${name}`, { attributes: { request } }),
			);
	const committed =
		<Request>(
			name: string,
			run: (
				request: Request,
			) => Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure>,
		) =>
		(
			request: Request,
		): Effect.Effect<
			MutationResult<L>,
			DumdictPreparationFailure | DumdictCommitFailure
		> =>
			run(request).pipe(
				Effect.flatMap((value) => commitPrepared(options, value)),
				Effect.withSpan(`dumdict.${name}`, { attributes: { request } }),
			);
	return {
		findStoredReadings: (request) =>
			Effect.suspend(() => findStoredReadings(options, request)).pipe(
				Effect.withSpan("dumdict.findStoredReadings", {
					attributes: { request },
				}),
			),
		getInfoForRelationsCleanup: (request) =>
			Effect.suspend(() =>
				getInfoForRelationsCleanup(options, request),
			).pipe(
				Effect.withSpan("dumdict.getInfoForRelationsCleanup", {
					attributes: { request },
				}),
			),
		prepare: {
			addAttestation: traced("addAttestation", prepared.addAttestation),
			addNewNote: traced("addNewNote", prepared.addNewNote),
			applyGeneratedKnowledge: traced(
				"applyGeneratedKnowledge",
				prepared.applyGeneratedKnowledge,
			),
			ensureOwnedSurface: traced(
				"ensureOwnedSurface",
				prepared.ensureOwnedSurface,
			),
			ensureReadingEntry: traced(
				"ensureReadingEntry",
				prepared.ensureReadingEntry,
			),
			cleanupRelations: traced(
				"cleanupRelations",
				prepared.cleanupRelations,
			),
		},
		addAttestation: committed("addAttestation", prepared.addAttestation),
		addNewNote: committed("addNewNote", prepared.addNewNote),
		applyGeneratedKnowledge: committed(
			"applyGeneratedKnowledge",
			prepared.applyGeneratedKnowledge,
		),
		ensureOwnedSurface: committed(
			"ensureOwnedSurface",
			prepared.ensureOwnedSurface,
		),
		ensureReadingEntry: committed(
			"ensureReadingEntry",
			prepared.ensureReadingEntry,
		),
		cleanupRelations: committed(
			"cleanupRelations",
			prepared.cleanupRelations,
		),
	};
}

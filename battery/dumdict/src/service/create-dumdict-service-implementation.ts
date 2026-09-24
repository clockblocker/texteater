import type * as Dumling from "dumling/types";

import * as Effect from "effect/Effect";
import type { DumdictService } from "../public";
import { addAttestation, prepareAddAttestation } from "./add-attestation";
import { addNewNote, prepareAddNewNote } from "./add-new-note";
import {
	applyGeneratedKnowledge,
	prepareApplyGeneratedKnowledge,
} from "./apply-generated-knowledge";
import { cleanupRelations, prepareCleanupRelations } from "./cleanup-relations";
import {
	ensureOwnedSurface,
	prepareEnsureOwnedSurface,
} from "./ensure-owned-surface";
import {
	ensureReadingEntry,
	prepareEnsureReadingEntry,
} from "./ensure-reading-entry";
import { findStoredReadings } from "./find-stored-readings";
import { getInfoForRelationsCleanup } from "./get-info-for-relations-cleanup";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";
export function createDumdictServiceImplementation<L extends Dumling.Language>(
	options: DumdictServiceRuntimeOptions<L>,
): DumdictService<L> {
	return {
		findStoredReadings: (request) =>
			Effect.suspend(() => findStoredReadings(options, request)).pipe(
				Effect.withSpan("dumdict.findStoredReadings", {
					attributes: { request },
				}),
			),
		prepare: {
			addAttestation: (request) =>
				Effect.suspend(() =>
					prepareAddAttestation(options, request),
				).pipe(
					Effect.withSpan("dumdict.addAttestation", {
						attributes: { request },
					}),
				),
			addNewNote: (request) =>
				Effect.suspend(() => prepareAddNewNote(options, request)).pipe(
					Effect.withSpan("dumdict.addNewNote", {
						attributes: { request },
					}),
				),
			applyGeneratedKnowledge: (request) =>
				Effect.suspend(() =>
					prepareApplyGeneratedKnowledge(options, request),
				).pipe(
					Effect.withSpan("dumdict.applyGeneratedKnowledge", {
						attributes: { request },
					}),
				),
			ensureOwnedSurface: (request) =>
				Effect.suspend(() =>
					prepareEnsureOwnedSurface(options, request),
				).pipe(
					Effect.withSpan("dumdict.ensureOwnedSurface", {
						attributes: { request },
					}),
				),
			ensureReadingEntry: (request) =>
				Effect.suspend(() =>
					prepareEnsureReadingEntry(options, request),
				).pipe(
					Effect.withSpan("dumdict.ensureReadingEntry", {
						attributes: { request },
					}),
				),
			cleanupRelations: (request) =>
				Effect.suspend(() =>
					prepareCleanupRelations(options, request),
				).pipe(
					Effect.withSpan("dumdict.cleanupRelations", {
						attributes: { request },
					}),
				),
		},
		addAttestation: (request) =>
			Effect.suspend(() => addAttestation(options, request)).pipe(
				Effect.withSpan("dumdict.addAttestation", {
					attributes: { request },
				}),
			),
		addNewNote: (request) =>
			Effect.suspend(() => addNewNote(options, request)).pipe(
				Effect.withSpan("dumdict.addNewNote", {
					attributes: { request },
				}),
			),
		applyGeneratedKnowledge: (request) =>
			Effect.suspend(() =>
				applyGeneratedKnowledge(options, request),
			).pipe(
				Effect.withSpan("dumdict.applyGeneratedKnowledge", {
					attributes: { request },
				}),
			),
		ensureOwnedSurface: (request) =>
			Effect.suspend(() => ensureOwnedSurface(options, request)).pipe(
				Effect.withSpan("dumdict.ensureOwnedSurface", {
					attributes: { request },
				}),
			),
		ensureReadingEntry: (request) =>
			Effect.suspend(() => ensureReadingEntry(options, request)).pipe(
				Effect.withSpan("dumdict.ensureReadingEntry", {
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
		cleanupRelations: (request) =>
			Effect.suspend(() => cleanupRelations(options, request)).pipe(
				Effect.withSpan("dumdict.cleanupRelations", {
					attributes: { request },
				}),
			),
	};
}

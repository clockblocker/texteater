import { traceStage } from "common-utils/workflow";
import type { SupportedLanguage } from "dumling/types";
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
export function createDumdictServiceImplementation<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
): DumdictService<L> {
	return {
		findStoredReadings: (request) =>
			traceStage(
				"dumdict.findStoredReadings",
				Effect.suspend(() => findStoredReadings(options, request)),
				request,
			),
		prepare: {
			addAttestation: (request) =>
				traceStage(
					"dumdict.addAttestation",
					Effect.suspend(() =>
						prepareAddAttestation(options, request),
					),
					request,
				),
			addNewNote: (request) =>
				traceStage(
					"dumdict.addNewNote",
					Effect.suspend(() => prepareAddNewNote(options, request)),
					request,
				),
			applyGeneratedKnowledge: (request) =>
				traceStage(
					"dumdict.applyGeneratedKnowledge",
					Effect.suspend(() =>
						prepareApplyGeneratedKnowledge(options, request),
					),
					request,
				),
			ensureOwnedSurface: (request) =>
				traceStage(
					"dumdict.ensureOwnedSurface",
					Effect.suspend(() =>
						prepareEnsureOwnedSurface(options, request),
					),
					request,
				),
			ensureReadingEntry: (request) =>
				traceStage(
					"dumdict.ensureReadingEntry",
					Effect.suspend(() =>
						prepareEnsureReadingEntry(options, request),
					),
					request,
				),
			cleanupRelations: (request) =>
				traceStage(
					"dumdict.cleanupRelations",
					Effect.suspend(() =>
						prepareCleanupRelations(options, request),
					),
					request,
				),
		},
		addAttestation: (request) =>
			traceStage(
				"dumdict.addAttestation",
				Effect.suspend(() => addAttestation(options, request)),
				request,
			),
		addNewNote: (request) =>
			traceStage(
				"dumdict.addNewNote",
				Effect.suspend(() => addNewNote(options, request)),
				request,
			),
		applyGeneratedKnowledge: (request) =>
			traceStage(
				"dumdict.applyGeneratedKnowledge",
				Effect.suspend(() => applyGeneratedKnowledge(options, request)),
				request,
			),
		ensureOwnedSurface: (request) =>
			traceStage(
				"dumdict.ensureOwnedSurface",
				Effect.suspend(() => ensureOwnedSurface(options, request)),
				request,
			),
		ensureReadingEntry: (request) =>
			traceStage(
				"dumdict.ensureReadingEntry",
				Effect.suspend(() => ensureReadingEntry(options, request)),
				request,
			),
		getInfoForRelationsCleanup: (request) =>
			traceStage(
				"dumdict.getInfoForRelationsCleanup",
				Effect.suspend(() =>
					getInfoForRelationsCleanup(options, request),
				),
				request,
			),
		cleanupRelations: (request) =>
			traceStage(
				"dumdict.cleanupRelations",
				Effect.suspend(() => cleanupRelations(options, request)),
				request,
			),
	};
}

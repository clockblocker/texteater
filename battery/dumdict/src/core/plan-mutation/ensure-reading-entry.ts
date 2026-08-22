import type { SupportedLanguage } from "dumling/types";
import type { ReadingEntry } from "../../dto";
import type { EnsureReadingEntryRequest } from "../../public";
import type { NewNoteSlice } from "../../storage";
import type { PlannedChangeOp } from "../planned-changes";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

function sameValue(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true;
	if (Array.isArray(left) || Array.isArray(right)) {
		return (
			Array.isArray(left) &&
			Array.isArray(right) &&
			left.length === right.length &&
			left.every((member, index) => sameValue(member, right[index]))
		);
	}
	if (
		left === null ||
		right === null ||
		typeof left !== "object" ||
		typeof right !== "object"
	) {
		return false;
	}
	const leftRecord = left as Record<string, unknown>;
	const rightRecord = right as Record<string, unknown>;
	const leftKeys = Object.keys(leftRecord).sort();
	const rightKeys = Object.keys(rightRecord).sort();
	return (
		leftKeys.length === rightKeys.length &&
		leftKeys.every(
			(key, index) =>
				key === rightKeys[index] &&
				sameValue(leftRecord[key], rightRecord[key]),
		)
	);
}

export function planEnsureReadingEntry<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: EnsureReadingEntryRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const { entry } = request;
	const { reading } = entry;
	const { lemma } = reading;
	if (slice.existingReading) {
		if (!sameValue(slice.existingReading, entry)) {
			return {
				status: "rejected",
				code: "readingEntryConflict",
				message:
					"The Reading identity already exists with different entry content.",
			};
		}
		return {
			status: "planned",
			baseRevision: slice.revision,
			changes: [],
			affected: {},
			summary: { message: "Reading Entry already exists unchanged." },
		};
	}

	const changes: PlannedChangeOp<L>[] = [];
	if (!slice.existingLemma) {
		changes.push({
			type: "createLemma",
			record: { lemma },
			preconditions: [
				{ kind: "revisionMatches", revision: slice.revision },
				{ kind: "lemmaMissing", lemma },
			],
		});
	}
	changes.push({
		type: "createReading",
		entry: entry as ReadingEntry<L>,
		preconditions: [
			{ kind: "revisionMatches", revision: slice.revision },
			{ kind: "lemmaExists", lemma },
			{ kind: "readingMissing", reading },
		],
	});

	return {
		status: "planned",
		baseRevision: slice.revision,
		changes,
		affected: { lemmas: [lemma], readings: [reading] },
		summary: { message: "Ensured Reading Entry." },
	};
}

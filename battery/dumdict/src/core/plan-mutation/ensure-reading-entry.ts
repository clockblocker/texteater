import { isRecord } from "common-utils";
import type * as Dumling from "dumling/types";
import type { PlannedChangeOp } from "../../domain-types";
import type { EnsureReadingEntryRequest } from "../../public";
import type { EnsureReadingEntryContext } from "../../storage";
import { readingLemma } from "../identity";
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
	if (!isRecord(left) || !isRecord(right)) return false;
	const leftKeys = Object.keys(left).sort();
	const rightKeys = Object.keys(right).sort();
	return (
		leftKeys.length === rightKeys.length &&
		leftKeys.every(
			(key, index) =>
				key === rightKeys[index] && sameValue(left[key], right[key]),
		)
	);
}

export function planEnsureReadingEntry<L extends Dumling.Language>(
	slice: EnsureReadingEntryContext<L>,
	request: EnsureReadingEntryRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const { entry } = request;
	const { reading } = entry;
	const lemma = readingLemma(reading);
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
		entry,
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

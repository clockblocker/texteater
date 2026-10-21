import { lemmaIdentityKey, readingIdentityKey, sameReading } from "dumling";
import type * as Dumling from "dumling/types";

import type {
	AttestationLink,
	PlannedChangeOp,
	ReadingEntry,
	StoreRevision,
	SurfaceEntry,
} from "../../domain-types";
import type { LemmaSlice } from "../../dto";
import type { SurfaceId } from "../../dumling-id";
import type { AffectedDictionaryEntities } from "../../public";
import type { OccurrenceSlice } from "../../storage";
import { paradigmChange, prunedParadigm } from "../occurrence/paradigm";
import { planRemovedTargetClaims } from "./removed-claim-changes";
import type { PlanMutationResult } from "./result";

/**
 * Whether a Surface Entry holds user text: notes, or translations the
 * learner wrote. Dumdict writes neither, so any is the learner's, and it is
 * never dropped (system ADR 0049).
 */
export function holdsUserText(entry: {
	readonly notes: string;
	readonly attestedTranslations: readonly string[];
}): boolean {
	return entry.notes.length > 0 || entry.attestedTranslations.length > 0;
}

const compare = (left: string, right: string) =>
	left < right ? -1 : left > right ? 1 : 0;

type Removal<L extends Dumling.Language> = {
	changes: PlannedChangeOp<L>[];
	lemmas: Dumling.Lemma<L>[];
	readings: Dumling.Reading<L>[];
	removedLemmas: Dumling.Lemma<L>[];
	removedReadings: Dumling.Reading<L>[];
	removedSurfaceIds: SurfaceId<L>[];
	removedLinks: AttestationLink<L>[];
	pendingIds: string[];
};

/**
 * Plans what removing some Attestation Links leaves behind in one Lemma
 * (system ADR 0043, ADR 0049):
 *
 * - a Reading left with no link is removed, with its Knowledge, its
 *   Pending Semantic Relation records and its Licences;
 * - a Surface that loses its last link is forgotten, unless it holds user
 *   text;
 * - a Lemma left with no Reading is removed, with its Paradigm and its
 *   Surfaces, unless one of them holds user text, which keeps it;
 * - a Lemma that stays drops every variant no remaining Reading licenses.
 *
 * `planLinkRemoval` then moves the claims other Readings hold on what goes.
 */
function planLemmaRemoval<L extends Dumling.Language>(
	revision: StoreRevision,
	slice: LemmaSlice<L>,
	dropped: (link: AttestationLink<L>) => boolean,
	removal: Removal<L>,
): void {
	const { lemma, paradigm } = slice.lemmaRecord;
	const guard = { kind: "revisionMatches", revision } as const;
	const remaining: ReadingEntry<L>[] = [];
	const lost = new Set<string>();
	const patches: PlannedChangeOp<L>[] = [];
	const deletions: PlannedChangeOp<L>[] = [];
	let touched = false;
	const readings = [...slice.readingEntries].sort((left, right) =>
		compare(
			readingIdentityKey(left.reading),
			readingIdentityKey(right.reading),
		),
	);
	for (const entry of readings) {
		const gone = entry.attestationLinks.filter(dropped);
		if (gone.length === 0) {
			remaining.push(entry);
			continue;
		}
		touched = true;
		for (const link of gone) if (link.surfaceId) lost.add(link.surfaceId);
		removal.removedLinks.push(...gone);
		removal.readings.push(entry.reading);
		if (gone.length < entry.attestationLinks.length) {
			remaining.push(entry);
			patches.push({
				type: "patchReading",
				reading: entry.reading,
				ops: gone.map((link) => ({
					kind: "removeAttestationLink",
					link,
				})),
				preconditions: [
					guard,
					{ kind: "readingExists", reading: entry.reading },
				],
			});
			continue;
		}
		removal.removedReadings.push(entry.reading);
		for (const record of slice.pendingRelations)
			if (sameReading(record.sourceReading, entry.reading)) {
				removal.pendingIds.push(record.locator.targetPendingId);
				deletions.push({
					type: "deletePendingSemanticRelation",
					record,
					preconditions: [
						guard,
						{ kind: "pendingRelationExists", record },
					],
				});
			}
		deletions.push({
			type: "deleteReading",
			reading: entry.reading,
			preconditions: [
				guard,
				{ kind: "readingExists", reading: entry.reading },
			],
		});
	}
	if (!touched) return;
	for (const entry of remaining)
		for (const link of entry.attestationLinks)
			if (!dropped(link) && link.surfaceId) lost.delete(link.surfaceId);
	const surfaces = [...slice.ownedSurfaceEntries].sort((left, right) =>
		compare(left.id, right.id),
	);
	const forgotten = (entry: SurfaceEntry<L>) =>
		lost.has(entry.id) && !holdsUserText(entry);
	const lemmaGoes =
		remaining.length === 0 &&
		!surfaces.some((entry) => !forgotten(entry) && holdsUserText(entry));
	const deleted = surfaces.filter((entry) => lemmaGoes || forgotten(entry));
	removal.lemmas.push(lemma);
	removal.changes.push(
		...patches,
		...deletions,
		...deleted.map(
			(entry): PlannedChangeOp<L> => ({
				type: "deleteOwnedSurface",
				surfaceId: entry.id,
				ownerLemma: lemma,
				preconditions: [
					guard,
					{ kind: "surfaceExists", surfaceId: entry.id },
				],
			}),
		),
	);
	removal.removedSurfaceIds.push(...deleted.map(({ id }) => id));
	if (lemmaGoes) {
		removal.removedLemmas.push(lemma);
		removal.changes.push({
			type: "deleteLemma",
			lemma,
			preconditions: [guard, { kind: "lemmaExists", lemma }],
		});
		return;
	}
	removal.changes.push(
		...paradigmChange(
			revision,
			lemma,
			paradigm,
			prunedParadigm(
				paradigm,
				remaining.map(({ reading }) => reading),
			),
		),
	);
}

function present<Value>(values: Value[]): Value[] | undefined {
	return values.length > 0 ? values : undefined;
}

/**
 * Plans removing every stored Attestation Link `dropped` selects, Lemma by
 * Lemma in identity-key order, and what that leaves behind.
 */
export function planLinkRemoval<L extends Dumling.Language>(
	slice: OccurrenceSlice<L>,
	dropped: (link: AttestationLink<L>) => boolean,
	message: string,
): PlanMutationResult<L> {
	const removal: Removal<L> = {
		changes: [],
		lemmas: [],
		readings: [],
		removedLemmas: [],
		removedReadings: [],
		removedSurfaceIds: [],
		removedLinks: [],
		pendingIds: [],
	};
	const lemmas = [...slice.lemmas].sort((left, right) =>
		compare(
			lemmaIdentityKey(left.lemmaRecord.lemma),
			lemmaIdentityKey(right.lemmaRecord.lemma),
		),
	);
	for (const lemma of lemmas)
		planLemmaRemoval(slice.revision, lemma, dropped, removal);
	const claims = planRemovedTargetClaims(slice.revision, {
		readings: [
			...lemmas.flatMap(({ readingEntries }) => readingEntries),
			...slice.claimingReadings,
		],
		records: [
			...lemmas.flatMap(({ pendingRelations }) => pendingRelations),
			...slice.pendingRelationsMatchingLemmas,
		],
		removedLemmas: removal.removedLemmas,
		removedReadings: removal.removedReadings,
	});
	// The claims go before what they name.
	removal.changes.unshift(...claims.changes);
	removal.readings.push(
		...claims.readings.filter(
			(reading) =>
				!removal.readings.some((other) => sameReading(other, reading)),
		),
	);
	removal.pendingIds.push(...claims.pendingIds);
	const removed: NonNullable<AffectedDictionaryEntities<L>["removed"]> = {
		lemmas: present(removal.removedLemmas),
		readings: present(removal.removedReadings),
		surfaceIds: present(removal.removedSurfaceIds),
		attestationLinks: present(removal.removedLinks),
	};
	return {
		status: "planned",
		baseRevision: slice.revision,
		changes: removal.changes,
		affected: {
			lemmas: present(removal.lemmas),
			readings: present(removal.readings),
			surfaceIds: present(removal.removedSurfaceIds),
			pendingIds: present(removal.pendingIds),
			...(removal.removedLinks.length > 0 ? { removed } : {}),
		},
		summary: {
			message:
				removal.removedLinks.length > 0
					? message
					: "No stored Attestation Link has the ref.",
		},
	};
}

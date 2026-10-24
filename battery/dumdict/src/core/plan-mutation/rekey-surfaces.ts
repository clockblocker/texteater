import { sameLemma } from "dumling";
import type * as Dumling from "dumling/types";

import type {
	AttestationLink,
	PlannedChangeOp,
	ReadingPatchOp,
} from "../../domain-types";
import { makeSurfaceId, type SurfaceId } from "../../dumling-id";
import type { RekeySurfacesRequest } from "../../public";
import type { RekeySurfacesSlice } from "../../storage";
import { lemmaLanguage } from "../identity";
import { holdsUserText } from "./remove-links";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

const compare = (left: string, right: string) =>
	left < right ? -1 : left > right ? 1 : 0;

/**
 * Plans re-keying Surface Entries after a Dumling Surface DTO change (system
 * ADR 0049), in one plan: each entry stored as `from` becomes `to`'s, with
 * its note, and every link naming `from` names `to`'s id. A `from` the store
 * no longer holds is already re-keyed and plans nothing. When `to`'s id is
 * already stored, the entry under `from` goes into it, unless it holds user
 * text the stored entry would lose.
 */
export function planRekeySurfaces<L extends Dumling.Language>(
	slice: RekeySurfacesSlice<L>,
	request: RekeySurfacesRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const guard = {
		kind: "revisionMatches",
		revision: slice.revision,
	} as const;
	const stored = new Map(slice.surfaces.map((entry) => [entry.id, entry]));
	const created: PlannedChangeOp<L>[] = [];
	const deleted: PlannedChangeOp<L>[] = [];
	const moved = new Map<string, SurfaceId<L>>();
	const rekeys = [...request.rekeys].sort((left, right) =>
		compare(left.from, right.from),
	);
	for (const { from, to } of rekeys) {
		const entry = stored.get(from);
		const owner: Dumling.Lemma<L> = to.lemma;
		const id = makeSurfaceId(lemmaLanguage(owner), to);
		if (entry === undefined || id === from) continue;
		if (!sameLemma(entry.ownerLemma, to.lemma))
			return {
				status: "rejected",
				code: "invalidRequest",
				message: "A re-keyed Surface stays with its Lemma.",
			};
		if (stored.has(id) || moved.has(id)) {
			if (holdsUserText(entry))
				return {
					status: "rejected",
					code: "ownedSurfaceAlreadyExists",
					message:
						"The re-keyed Surface's id is stored, and its user text would be lost.",
				};
		} else {
			const { id: _id, ...note } = entry;
			created.push({
				type: "createOwnedSurface",
				entry: { ...note, id, surface: to },
				preconditions: [
					guard,
					{ kind: "surfaceMissing", surfaceId: id },
				],
			});
		}
		moved.set(from, id);
		deleted.push({
			type: "deleteOwnedSurface",
			surfaceId: from,
			ownerLemma: entry.ownerLemma,
			preconditions: [guard, { kind: "surfaceExists", surfaceId: from }],
		});
	}
	const relinked = slice.readings.flatMap((entry) => {
		const old = entry.attestationLinks.filter((link) =>
			moved.has(link.surfaceId),
		);
		if (old.length === 0) return [];
		const fresh = old.map(
			(link): AttestationLink<L> => ({
				...link,
				surfaceId: moved.get(link.surfaceId) ?? link.surfaceId,
			}),
		);
		const patch = (ops: ReadingPatchOp<L>[]): PlannedChangeOp<L> => ({
			type: "patchReading",
			reading: entry.reading,
			ops,
			preconditions: [
				guard,
				{ kind: "readingExists", reading: entry.reading },
			],
		});
		return [
			patch(old.map((link) => ({ kind: "removeAttestationLink", link }))),
			patch(fresh.map((link) => ({ kind: "addAttestationLink", link }))),
		];
	});
	const ids = [...new Set(moved.values())];
	return {
		status: "planned",
		baseRevision: slice.revision,
		changes: [...created, ...relinked, ...deleted],
		affected: {
			...(ids.length > 0 ? { surfaceIds: ids } : {}),
			...(relinked.length > 0
				? {
						readings: slice.readings
							.filter((entry) =>
								entry.attestationLinks.some((link) =>
									moved.has(link.surfaceId),
								),
							)
							.map(({ reading }) => reading),
					}
				: {}),
			...(moved.size > 0
				? {
						removed: {
							surfaceIds: [...moved.keys()] as SurfaceId<L>[],
						},
					}
				: {}),
		},
		summary: {
			message:
				moved.size > 0
					? `Re-keyed ${moved.size} Surface${moved.size === 1 ? "" : "s"}.`
					: "No stored Surface needs re-keying.",
		},
	};
}

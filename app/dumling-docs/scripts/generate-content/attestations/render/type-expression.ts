import type { EntityValue } from "dumling/types";
import { isSelection, isSurface } from "../entity/guards";
import { lemmaForEntity } from "../entity/helpers";

export function typeExpressionForEntity(entity: EntityValue): string {
	const lemma = lemmaForEntity(entity);
	if (isSelection(entity)) {
		return `Selection<"${lemma.language}", "${entity.surface.surfaceKind}", "${lemma.family}", "${lemma.kind}">`;
	}
	if (isSurface(entity)) {
		return `Surface<"${entity.language}", "${entity.surfaceKind}", "${lemma.family}", "${lemma.kind}">`;
	}
	return `Lemma<"${entity.language}", "${lemma.family}", "${lemma.kind}">`;
}

import type { EntityValue } from "../../../../../src/types/public-types.ts";
import { isSelection, isSurface } from "../entity/guards";
import { lemmaForEntity } from "../entity/helpers";

export function typeExpressionForEntity(entity: EntityValue): string {
	const lemma = lemmaForEntity(entity);
	if (isSelection(entity)) {
		return `Selection<"${entity.language}", "${entity.surface.surfaceKind}", "${lemma.lemmaKind}", "${lemma.lemmaSubKind}">`;
	}
	if (isSurface(entity)) {
		return `Surface<"${entity.language}", "${entity.surfaceKind}", "${lemma.lemmaKind}", "${lemma.lemmaSubKind}">`;
	}
	return `Lemma<"${entity.language}", "${lemma.lemmaKind}", "${lemma.lemmaSubKind}">`;
}

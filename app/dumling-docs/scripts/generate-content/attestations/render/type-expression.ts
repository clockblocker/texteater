import type * as Dumling from "dumling/types";

import { isAttestation, isSurface } from "../entity/guards";
import { lemmaForEntity } from "../entity/helpers";

export function typeExpressionForEntity(
	entity: Dumling.Lemma | Dumling.Surface | Dumling.Attestation,
): string {
	const lemma = lemmaForEntity(entity);
	if (isAttestation(entity)) {
		return `Dumling.Attestation<"${lemma.language}", "${lemma.family}", "${lemma.kind}">`;
	}
	if (isSurface(entity)) {
		return `Dumling.Surface<"${entity.language}", "${lemma.family}", "${lemma.kind}">`;
	}
	return `Dumling.Lemma<"${entity.language}", "${lemma.family}", "${lemma.kind}">`;
}

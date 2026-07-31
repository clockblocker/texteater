import type { EntityValue } from "dumling/types";
import { isSelection, isSurface } from "../entity/guards";
import { lemmaForEntity } from "../entity/helpers";

export function classificationLinesForEntity(entity: EntityValue): string[] {
	const lemma = lemmaForEntity(entity);
	if (isSelection(entity)) {
		return [
			`- \`${entity.selectedOrthography}\` **Selection**`,
			`- \`${entity.surface.realizationCoverage}\` \`${entity.surface.spelling}\` **Surface**`,
			`- \`${lemma.kind}\` **${lemma.family}**`,
			`- **Lemma** _"${lemma.canonicalForm}"_`,
		];
	}
	if (isSurface(entity)) {
		return [
			`- \`${entity.surfaceKind}\` **Surface**`,
			`- \`${lemma.kind}\` **${lemma.family}**`,
			`- **Lemma** _"${lemma.canonicalForm}"_`,
		];
	}
	return [
		`- **Lemma** _"${lemma.canonicalForm}"_`,
		`- \`${lemma.kind}\` **${lemma.family}**`,
	];
}

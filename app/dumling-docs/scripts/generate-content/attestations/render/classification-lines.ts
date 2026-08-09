import type { EntityValue } from "dumling/types";
import { isAttestation, isSurface } from "../entity/guards";
import { lemmaForEntity } from "../entity/helpers";

export function classificationLinesForEntity(entity: EntityValue): string[] {
	const lemma = lemmaForEntity(entity);
	if (isAttestation(entity)) {
		return [
			`- \`${entity.realizationCoverage}\` **Attestation**`,
			...entity.members.map(
				(member) =>
					`- \`${member.orthography}\` member _"${member.attested}"_`,
			),
			`- \`${entity.surface.spelling}\` **Surface**`,
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

import type * as Dumling from "dumling/types";
import { grundformLabel } from "../../../../src/lib/unit-presentation";

import { isAttestation, isSurface } from "../entity/guards";
import { lemmaForEntity } from "../entity/helpers";

export function classificationLinesForEntity(
	entity: Dumling.Lemma | Dumling.Surface | Dumling.Attestation,
): string[] {
	const lemma = lemmaForEntity(entity);
	if (isAttestation(entity)) {
		return [
			`- \`${entity.realizationCoverage}\` **Attestation**`,
			...entity.members.map(
				(member) =>
					`- \`${member.orthography}\` member _"${member.attested}"_${
						member.orthography === "Fused"
							? ` of _"${member.fusion.spelling}"_`
							: ""
					}`,
			),
			`- \`${entity.surface.spelling}\` **Surface**`,
			`- \`${lemma.kind}\` **${lemma.family}**`,
			`- **Lemma** _"${lemma.canonicalForm}"_`,
		];
	}
	if (isSurface(entity)) {
		return [
			`- \`${grundformLabel(entity)}\` **Surface**`,
			`- \`${lemma.kind}\` **${lemma.family}**`,
			`- **Lemma** _"${lemma.canonicalForm}"_`,
		];
	}
	return [
		`- **Lemma** _"${lemma.canonicalForm}"_`,
		`- \`${lemma.kind}\` **${lemma.family}**`,
	];
}

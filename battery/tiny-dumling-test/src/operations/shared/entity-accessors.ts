import type {
	Attestation,
	Lemma,
	SupportedLanguage,
	Surface,
	SurfaceKind,
} from "../../types/public-types.js";

type EntityValue<L extends SupportedLanguage> =
	| Lemma<L>
	| Surface<L>
	| Attestation<L>;

type EntityInspection<L extends SupportedLanguage> = {
	language: L;
	lemma: Lemma<L>;
	surfaceKind: SurfaceKind;
};

export function inspectEntity<L extends SupportedLanguage>(
	value: EntityValue<L>,
): EntityInspection<L> {
	if ("canonicalForm" in value) {
		return {
			language: value.language as L,
			lemma: value,
			surfaceKind: "Citation",
		};
	}

	if ("surfaceKind" in value) {
		return {
			language: value.language as L,
			lemma: value.lemma as unknown as Lemma<L>,
			surfaceKind: value.surfaceKind,
		};
	}

	return {
		language: value.surface.language as L,
		lemma: value.surface.lemma as unknown as Lemma<L>,
		surfaceKind: value.surface.surfaceKind,
	};
}

export function extractLemma<L extends SupportedLanguage>(
	value: EntityValue<L>,
): Lemma<L> {
	return inspectEntity(value).lemma;
}

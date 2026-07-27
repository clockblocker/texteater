import type {
	EntityKind,
	Lemma,
	Selection,
	SupportedLanguage,
	Surface,
} from "../../types/public-types";

export function extractLemma<L extends SupportedLanguage>(
	value: Lemma<L> | Surface<L> | Selection<L>,
): Lemma<L> {
	if ("canonicalLemma" in value) {
		return value;
	}

	if ("surfaceKind" in value) {
		return value.lemma as unknown as Lemma<L>;
	}

	return value.surface.lemma as unknown as Lemma<L>;
}

export function inferEntityKind<L extends SupportedLanguage>(
	value: Lemma<L> | Surface<L> | Selection<L>,
): EntityKind {
	if ("surface" in value) {
		return "Selection";
	}

	if ("surfaceKind" in value) {
		return "Surface";
	}

	return "Lemma";
}

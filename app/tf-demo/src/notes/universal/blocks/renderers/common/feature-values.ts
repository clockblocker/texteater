import type { NoteTitleTone } from "lego";
import { coreGender } from "../../../../../../shared/grammatical-gender";

type PresentedFeatures = Readonly<
	Record<string, string | readonly string[] | null | undefined | unknown>
>;

const GENDER_TONES: Readonly<Record<string, NoteTitleTone>> = {
	Fem: "feminine",
	Masc: "masculine",
	Neut: "neuter",
};

/** The headword tone for a Lemma's grammatical gender, when it has one. */
export function genderTone(lemma: {
	family: string;
	kind: string;
	coreFeatures: unknown;
}): NoteTitleTone | undefined {
	const gender = coreGender(lemma);
	return typeof gender === "string" ? GENDER_TONES[gender] : undefined;
}

/** Non-null feature values as short readable pairs, e.g. `case Dat`. */
export function featurePairs(
	features: PresentedFeatures,
): readonly { readonly name: string; readonly value: string }[] {
	return Object.entries(features).flatMap(([name, value]) => {
		if (value == null) return [];
		if (Array.isArray(value)) {
			return value.length === 0
				? []
				: [{ name, value: value.map(String).join("/") }];
		}
		if (typeof value === "boolean")
			return value ? [{ name, value: "yes" }] : [];
		return [{ name, value: String(value) }];
	});
}

/** Feature values alone, for a one-line summary such as `Dat · Sg`. */
export function featureSummary(features: PresentedFeatures): string {
	return featurePairs(features)
		.map(({ name, value }) =>
			(name === "perfect" || name === "future") && value === "Yes"
				? name
				: name === "passive"
					? `${value.toLowerCase()} passive`
					: value,
		)
		.join(" · ");
}

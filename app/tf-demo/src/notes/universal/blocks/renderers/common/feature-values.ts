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

/**
 * A feature value as short text: `Dat`, a set `Masc/Neut`, or a noun's
 * `mixed` gender `Masc/Neut`. Undefined for no value.
 */
export function featureValueText(value: unknown): string | undefined {
	if (value == null) return undefined;
	const members =
		typeof value === "object" && "mixed" in value ? value.mixed : value;
	if (Array.isArray(members))
		return members.length === 0 ? undefined : members.map(String).join("/");
	if (typeof members === "boolean") return members ? "yes" : undefined;
	return String(members);
}

/** Non-null feature values as short readable pairs, e.g. `case Dat`. */
function featurePairs(
	features: PresentedFeatures,
): readonly { readonly name: string; readonly value: string }[] {
	return Object.entries(features).flatMap(([name, feature]) => {
		const value = featureValueText(feature);
		return value === undefined ? [] : [{ name, value }];
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

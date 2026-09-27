import { closedVerbForms as formsByLemma } from "dumspec/inventories";

const closedVerbForms = new Map(
	Object.entries(formsByLemma).flatMap(([lemma, forms]) =>
		forms.map((form) => [form, lemma] as const),
	),
);

/**
 * The closed VERB Lemma every member spells a form of (ist gewesen is sein,
 * möchte is mögen), or undefined when a member is outside the table or the
 * members name different Lemmas (ist geworden, hat können).
 */
export function closedParadigmVerb(
	members: readonly string[],
): string | undefined {
	const lemmas = new Set(
		members.map((member) =>
			closedVerbForms.get(
				member.normalize("NFC").toLocaleLowerCase("de"),
			),
		),
	);
	const [lemma] = lemmas;
	return lemmas.size === 1 ? lemma : undefined;
}

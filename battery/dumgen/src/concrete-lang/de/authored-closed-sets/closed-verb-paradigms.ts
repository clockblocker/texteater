import { auxiliaryForms } from "./realizations.js";

/**
 * Every form of the six modal verbs (ADR 0026: a modal is a VERB Lemma),
 * including the older ß spellings and möchte, which cites mögen.
 */
const modalForms: Readonly<Record<string, readonly string[]>> = {
	dürfen: [
		"dürfen",
		"darf",
		"darfst",
		"dürft",
		"durfte",
		"durftest",
		"durften",
		"durftet",
		"dürfe",
		"dürfest",
		"dürfet",
		"dürfte",
		"dürftest",
		"dürften",
		"dürftet",
		"gedurft",
	],
	können: [
		"können",
		"kann",
		"kannst",
		"könnt",
		"konnte",
		"konntest",
		"konnten",
		"konntet",
		"könne",
		"könnest",
		"könnet",
		"könnte",
		"könntest",
		"könnten",
		"könntet",
		"gekonnt",
	],
	mögen: [
		"mögen",
		"mag",
		"magst",
		"mögt",
		"mochte",
		"mochtest",
		"mochten",
		"mochtet",
		"möge",
		"mögest",
		"möget",
		"möchte",
		"möchtest",
		"möchten",
		"möchtet",
		"gemocht",
	],
	müssen: [
		"müssen",
		"muss",
		"muß",
		"musst",
		"mußt",
		"müsst",
		"müßt",
		"musste",
		"mußte",
		"musstest",
		"mußtest",
		"mussten",
		"mußten",
		"musstet",
		"mußtet",
		"müsse",
		"müssest",
		"müsset",
		"müsste",
		"müßte",
		"müsstest",
		"müßtest",
		"müssten",
		"müßten",
		"müsstet",
		"müßtet",
		"gemusst",
		"gemußt",
	],
	sollen: [
		"sollen",
		"soll",
		"sollst",
		"sollt",
		"sollte",
		"solltest",
		"sollten",
		"solltet",
		"solle",
		"sollest",
		"sollet",
		"gesollt",
	],
	wollen: [
		"wollen",
		"will",
		"willst",
		"wollt",
		"wollte",
		"wolltest",
		"wollten",
		"wolltet",
		"wolle",
		"wollest",
		"wollet",
		"gewollt",
	],
};

/**
 * The VERB Lemmas whose whole paradigm is closed: sein, haben, werden and the
 * modals. The recipient-passive verbs share an AUX Lemma but stay open as
 * VERBs (kriegen is not bekommen), so they are left out.
 */
const closedVerbForms = new Map(
	Object.entries({
		sein: auxiliaryForms.sein ?? [],
		haben: auxiliaryForms.haben ?? [],
		werden: auxiliaryForms.werden ?? [],
		...modalForms,
	}).flatMap(([lemma, forms]) => forms.map((form) => [form, lemma] as const)),
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

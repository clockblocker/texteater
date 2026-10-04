import {
	auxiliaryFormSpellings,
	auxiliaryForms,
	type RealizationSpelling,
} from "./realizations.js";

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
 * The six modal verbs. A German VERB Lemma is a modal when its Canonical Form
 * is one of them; no Core Feature marks it (ADR 0026).
 */
export const modalVerbs: readonly string[] = Object.keys(modalForms);

/**
 * Every form of the VERB Lemmas whose whole paradigm is closed, keyed by
 * Lemma: sein, haben, werden and the modals. The recipient-passive verbs
 * share an AUX Lemma but stay open as VERBs (kriegen is not bekommen), so
 * they are left out.
 */
export const closedVerbForms: Readonly<Record<string, readonly string[]>> = {
	sein: auxiliaryForms.sein ?? [],
	haben: auxiliaryForms.haben ?? [],
	werden: auxiliaryForms.werden ?? [],
	...modalForms,
};

/**
 * The closed verb forms whose spelling is not plainly Canonical and
 * Standard, keyed by form; every other form in `closedVerbForms` is. The
 * auxiliaries' forms (ward, hätt) are spelled as their AUX realizations
 * are, but hab is VERB haben's imperative too (Hab keine Angst!), plainly
 * Canonical, while the 1sg (Ich hab Hunger) is the Shorthand of habe, as
 * AUX hab is; the occurrence decides which. The ß spellings of müssen are
 * Historical Variants, valid only before the 1996 reform, as gold has muß,
 * mußte and mußten (de/variant-and-historical-status).
 */
const { hab: _auxiliaryHab, ...auxiliaryOnlyFormSpellings } =
	auxiliaryFormSpellings;
export const closedVerbFormSpellings: Readonly<
	Record<string, RealizationSpelling>
> = {
	...auxiliaryOnlyFormSpellings,
	...Object.fromEntries(
		(modalForms.müssen ?? [])
			.filter((form) => form.includes("ß"))
			.map((form) => [
				form,
				{ spelling: { kind: "Variant", variantTags: ["Historical"] } },
			]),
	),
};

import { ParsingError } from "common-utils/validation";
import type * as Dumling from "dumling/types";
import { knowledgePolicyApplies } from "./knowledge-policies.js";
import type { KnowledgeChange, ReadingKnowledge } from "./types.js";

type Path = (number | string)[];

/** The aspects that store a German verb's forms (ADR 0038). */
const verbFormAspects = [
	"preterite",
	"presentSingular",
	"pastParticiple",
	"subjunctivePast",
] as const;
type VerbFormAspect = (typeof verbFormAspects)[number];

type VerbForms = Pick<ReadingKnowledge, VerbFormAspect>;

const issue = (path: Path, message: string) =>
	new ParsingError([{ code: "custom", path, message }]);

const names: Readonly<Record<VerbFormAspect, string>> = {
	preterite: "Präteritum",
	presentSingular: "Präsens",
	pastParticiple: "Partizip II",
	subjunctivePast: "Konjunktiv II",
};

/** The separable particle a German VERB Lemma names in Core, or undefined. */
function separablePrefixOf(lemma: Dumling.Lemma): string | undefined {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	return typeof core.hasSepPrefix === "string"
		? core.hasSepPrefix.toLocaleLowerCase("de")
		: undefined;
}

/**
 * Why a list of finite forms is not one a dictionary cites, or undefined:
 * each form once, one word, or a separable verb's finite word and its
 * particle split off (`stand auf`), never `sich`, and its finite word ending
 * as `ending` requires.
 */
function finiteFormsIssue(
	forms: readonly string[],
	particle: string | undefined,
	name: string,
	path: Path,
	ending?: { readonly test: RegExp; readonly message: string },
): ParsingError | undefined {
	const folded = forms.map((form) => form.toLocaleLowerCase("de"));
	if (new Set(folded).size !== forms.length)
		return issue(path, `A ${name} lists each form once`);
	for (const [index, form] of folded.entries()) {
		const words = form.split(" ");
		const fits =
			words.every((word) => /^\S+$/u.test(word) && word !== "sich") &&
			(particle === undefined
				? words.length === 1
				: words.length === 2 && words[1] === particle);
		if (!fits)
			return issue(
				[...path, index],
				particle === undefined
					? `A ${name} form is one word, without a reflexive pronoun`
					: `A separable verb's ${name} form is its finite word and its particle split off, without a reflexive pronoun: «… ${particle}»`,
			);
		if (ending && !ending.test.test(words[0] ?? ""))
			return issue([...path, index], ending.message);
	}
	return undefined;
}

/**
 * Why a Partizip II is not one a dictionary cites, or undefined: each form
 * once and one word ending in -t or -n, a separable verb's opening with its
 * particle (`abgefahren`), never `sich`.
 */
function participleIssue(
	forms: readonly string[],
	particle: string | undefined,
	path: Path,
): ParsingError | undefined {
	const folded = forms.map((form) => form.toLocaleLowerCase("de"));
	if (new Set(folded).size !== forms.length)
		return issue(path, "A Partizip II lists each form once");
	for (const [index, form] of folded.entries())
		if (
			!/^\S+[tn]$/u.test(form) ||
			(particle !== undefined &&
				!(form.startsWith(particle) && form.length > particle.length))
		)
			return issue(
				[...path, index],
				particle === undefined
					? "A Partizip II is one word ending in -t or -n, without a reflexive pronoun"
					: `A separable verb's Partizip II is one word that opens with its particle «${particle}…» and ends in -t or -n`,
			);
	return undefined;
}

const subjunctiveEnding = {
	test: /e$/u,
	message: "A Konjunktiv II form's finite word ends in -e",
};
const secondPersonEnding = {
	test: /t$/u,
	message: "A second person singular Präsens form's finite word ends in -t",
};

/**
 * Why a German VERB Reading's verb forms are not as a dictionary cites them,
 * or undefined (ADR 0038). Only a route the Knowledge Policy gives an aspect
 * stores it. Each form is listed once, a finite form is one word or a
 * separable verb's finite word and its particle, and none holds `sich`.
 * Endings code can be sure of are checked: a Konjunktiv II ends in -e, a
 * second person Präsens in -t, a Partizip II in -t or -n. The forms are
 * checked apart from the conjugation classes and from each other.
 */
export function verbFormsIssue<R extends Dumling.Reading>(
	source: R,
	forms: VerbForms,
	pathOf: (aspect: VerbFormAspect) => Path,
): ParsingError | undefined {
	const particle = separablePrefixOf(source.lemma);
	for (const aspect of verbFormAspects) {
		const value = forms[aspect];
		if (value === undefined) continue;
		const path = pathOf(aspect);
		if (!knowledgePolicyApplies(source.lemma, aspect))
			return issue(
				path,
				`Only a German VERB Reading has a ${names[aspect]}`,
			);
		const failure = Array.isArray(value)
			? aspect === "pastParticiple"
				? participleIssue(value, particle, path)
				: finiteFormsIssue(
						value,
						particle,
						names[aspect],
						path,
						aspect === "subjunctivePast"
							? subjunctiveEnding
							: undefined,
					)
			: (finiteFormsIssue(value.first, particle, "Präsens", [
					...path,
					"first",
				]) ??
				finiteFormsIssue(
					value.second,
					particle,
					"Präsens",
					[...path, "second"],
					secondPersonEnding,
				) ??
				finiteFormsIssue(value.third, particle, "Präsens", [
					...path,
					"third",
				]));
		if (failure) return failure;
	}
	return undefined;
}

/** The verb forms a change sets, keyed by its aspect, or undefined. */
export function verbFormsOfChange(
	change: KnowledgeChange,
): VerbForms | undefined {
	if (change.kind === "Retract") return undefined;
	switch (change.aspect) {
		case "preterite":
			return { preterite: change.value };
		case "presentSingular":
			return { presentSingular: change.value };
		case "pastParticiple":
			return { pastParticiple: change.value };
		case "subjunctivePast":
			return { subjunctivePast: change.value };
		default:
			return undefined;
	}
}

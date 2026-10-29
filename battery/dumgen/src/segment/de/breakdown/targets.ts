/**
 * Where each open part of a German Breakdown links (system ADR 0050): a
 * Unit Shadow, its route and Canonical Form. jev picks the route among the
 * ones code offers in one request, `breakdown-routes`, then the Canonical
 * Form among the ones code writes (`forms.ts`) in a second,
 * `breakdown-forms`. A part with one option is not asked about, and a
 * request with no question is not sent. A compound's first part may also
 * be offered as a cranberry piece, which links to its Root Morpheme
 * (`Brom` in Brombeere, ADR 0050, ADR 0051), spelled as it shows.
 */
import type { EntryType, Questions } from "@typesafe-ai/sdk";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import {
	type Ask,
	type AskFailure,
	askAny,
	choice,
	choiceOf,
} from "../../ask.js";
import { type RouteKey, routeCriteria } from "../routes.js";
import {
	formCandidates,
	offersReflexive,
	reflexiveFormGuide,
} from "./forms.js";

/** A part whose link jev settles. */
export type OpenPart = {
	/** What the part stands for, as the judge reads it: `in` for the `i` of `im`. */
	readonly reads: string;
	/** The routes it may take, the likeliest first. */
	readonly routes: readonly RouteKey[];
	/** Whether it may also be a cranberry piece, a Root of its own. */
	readonly cranberry?: true;
	/** Its candidate Canonical Forms, when code knows them better than `forms.ts`. */
	readonly forms?: readonly string[];
	/** Its candidate Canonical Forms on one route, over `forms` (a base's tested nouns). */
	readonly routeForms?: Readonly<
		Partial<Record<RouteKey, readonly string[]>>
	>;
	/** Closes its headword question, when its forms need one. */
	readonly formGuide?: string;
};

/** The option a cranberry piece takes. */
const rootKey = "Morpheme/Root";

/**
 * What a cranberry piece is, for its option (ADR 0050); its examples are no
 * Breakdown case (#693).
 */
export const cranberryOption =
	"A cranberry piece: no word of its own, found only in this word and the words built on it, and in no dictionary as a headword (Schorn in Schornstein, Sint in Sintflut)";

/** The judge's view of the whole being broken down. */
export type Whole = {
	/** The state's key that names the whole (`word`, `wording`). */
	readonly key: string;
	readonly state: Readonly<Record<string, EntryType>>;
};

type PartRoute = RouteKey | typeof rootKey;

/** The chosen key among `routes`; an answer outside them is a bug the adapter already refused. */
function routeOf(routes: readonly PartRoute[], picked: string): PartRoute {
	const route = routes.find((key) => key === picked);
	if (route === undefined) throw Error(`Not an offered route: ${picked}`);
	return route;
}

/** A Unit Shadow on a German route; `routes.ts` checked the route. */
function shadowOf(route: PartRoute, canonicalForm: string): Dumrel.UnitShadow {
	const [family = "", kind = ""] = route.split("/");
	// Sound: every RouteKey names a German route with a Unit Shadow shape.
	return { language: "de", family, kind, canonicalForm } as Dumrel.UnitShadow;
}

const kindNames: Readonly<Record<string, string>> = {
	NOUN: "noun",
	PROPN: "proper name",
	VERB: "verb",
	ADJ: "adjective",
	ADV: "adverb",
	ADP: "preposition",
	PRON: "pronoun",
	DET: "determiner",
	NUM: "numeral",
};

/**
 * Each part's Unit Shadow, in order. Its route is the only one offered or
 * jev's pick, then its Canonical Form the only candidate or jev's pick; a
 * Locution keeps its wording. `routeGuide`, when given, closes every route
 * question: how a word's or a phraseme's parts are judged. The route
 * descriptions themselves are segment.inUnits's and stay shared.
 * `formGuides` close the headword question of a part of a given Kind,
 * unless the part brings its own guide.
 */
export const partTargets = Effect.fnUntraced(function* (
	parts: readonly OpenPart[],
	whole: Whole,
	ask: Ask,
	routeGuide?: string,
	formGuides: Readonly<Partial<Record<string, string>>> = {},
): Effect.fn.Return<Dumrel.UnitShadow[], AskFailure> {
	const offered = parts.map((part): readonly PartRoute[] =>
		part.cranberry ? [...part.routes, rootKey] : part.routes,
	);
	const routeQuestions: Questions = {};
	for (const [index, part] of parts.entries())
		if ((offered[index] ?? []).length > 1)
			routeQuestions[`r_${index}`] = choice(
				`In \`${whole.key}\`, the part "${part.reads}" is which kind of unit?${routeGuide ? ` ${routeGuide}` : ""}`,
				{
					...routeCriteria(part.routes, true),
					...(part.cranberry ? { [rootKey]: cranberryOption } : {}),
				},
			);
	const routeAnswers = yield* askAny(ask, {
		stage: "breakdown-routes",
		state: whole.state,
		questions: routeQuestions,
	});
	const routes = parts.map((_, index) => {
		const options = offered[index] ?? [];
		const [only] = options;
		if (options.length === 1 && only !== undefined) return only;
		return routeOf(options, choiceOf(routeAnswers, `r_${index}`).choice);
	});
	const candidates = parts.map((part, index) => {
		const route = routes[index];
		if (route === rootKey) return [part.reads.toLocaleLowerCase("de")];
		const routeForms =
			route === undefined ? undefined : part.routeForms?.[route];
		if (routeForms !== undefined) return routeForms;
		if (part.forms !== undefined) return part.forms;
		const [family = "", kind = ""] = (route ?? "").split("/");
		return formCandidates(part.reads, family, kind);
	});
	const formQuestions: Questions = {};
	for (const [index, part] of parts.entries()) {
		const forms = candidates[index] ?? [];
		const [, kind = ""] = (routes[index] ?? "").split("/");
		const guide =
			part.formGuide ??
			(offersReflexive(forms) ? reflexiveFormGuide : formGuides[kind]);
		if (forms.length > 1)
			formQuestions[`f_${index}`] = choice(
				`In \`${whole.key}\`, the part "${part.reads}" is a ${kindNames[kind] ?? kind}. Which is its dictionary headword?${guide ? ` ${guide}` : ""}`,
				Object.fromEntries(forms.map((form, at) => [`f${at}`, form])),
			);
	}
	const formAnswers = yield* askAny(ask, {
		stage: "breakdown-forms",
		state: whole.state,
		questions: formQuestions,
	});
	return parts.map((_, index) => {
		const forms = candidates[index] ?? [];
		const picked =
			forms.length > 1
				? Number(choiceOf(formAnswers, `f_${index}`).choice.slice(1))
				: 0;
		const form = forms[picked];
		const route = routes[index];
		if (form === undefined || route === undefined)
			throw Error(`Part ${index} has no Canonical Form`);
		return shadowOf(route, form);
	});
});

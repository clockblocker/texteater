/**
 * Where each open part of a German Breakdown links (system ADR 0050): a
 * Unit Shadow, its route and Canonical Form. jev picks the route among the
 * ones code offers in one request, `breakdown-routes`, then the Canonical
 * Form among the ones code writes (`forms.ts`) in a second,
 * `breakdown-forms`. A part with one option is not asked about, and a
 * request with no question is not sent.
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
import { formCandidates } from "./forms.js";

/** A part whose link jev settles. */
export type OpenPart = {
	/** What the part stands for, as the judge reads it: `in` for the `i` of `im`. */
	readonly reads: string;
	/** The routes it may take, the likeliest first. */
	readonly routes: readonly RouteKey[];
};

/** The judge's view of the whole being broken down. */
export type Whole = {
	/** The state's key that names the whole (`word`, `wording`). */
	readonly key: string;
	readonly state: Readonly<Record<string, EntryType>>;
};

/** The chosen key among `routes`; an answer outside them is a bug the adapter already refused. */
function routeOf(routes: readonly RouteKey[], picked: string): RouteKey {
	const route = routes.find((key) => key === picked);
	if (route === undefined) throw Error(`Not an offered route: ${picked}`);
	return route;
}

/** A Unit Shadow on a German route; `routes.ts` checked the route. */
function shadowOf(route: RouteKey, canonicalForm: string): Dumrel.UnitShadow {
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
 * Locution keeps its wording.
 */
export const partTargets = Effect.fnUntraced(function* (
	parts: readonly OpenPart[],
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<Dumrel.UnitShadow[], AskFailure> {
	const routeQuestions: Questions = {};
	for (const [index, part] of parts.entries())
		if (part.routes.length > 1)
			routeQuestions[`r_${index}`] = choice(
				`In \`${whole.key}\`, the part "${part.reads}" is which kind of unit?`,
				routeCriteria(part.routes, true),
			);
	const routeAnswers = yield* askAny(ask, {
		stage: "breakdown-routes",
		state: whole.state,
		questions: routeQuestions,
	});
	const routes = parts.map((part, index) => {
		const [only] = part.routes;
		if (part.routes.length === 1 && only !== undefined) return only;
		return routeOf(
			part.routes,
			choiceOf(routeAnswers, `r_${index}`).choice,
		);
	});
	const candidates = parts.map((part, index) => {
		const [family = "", kind = ""] = (routes[index] ?? "").split("/");
		return formCandidates(part.reads, family, kind);
	});
	const formQuestions: Questions = {};
	for (const [index, part] of parts.entries()) {
		const forms = candidates[index] ?? [];
		const [, kind = ""] = (routes[index] ?? "").split("/");
		if (forms.length > 1)
			formQuestions[`f_${index}`] = choice(
				`In \`${whole.key}\`, the part "${part.reads}" is a ${kindNames[kind] ?? kind}. Which is its dictionary headword?`,
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

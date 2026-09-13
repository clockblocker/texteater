import type { UnitMap } from "../generated/units.js";
import type { Surface } from "../types.js";
import { germanRules } from "./de.js";
import { englishRules } from "./en.js";
import type { GrundformRule } from "./features.js";
import { hebrewRules } from "./he.js";

type InflectableRoute = {
	[R in keyof UnitMap]: "inflectionalFeatures" extends keyof UnitMap[R]["Surface"]
		? R
		: never;
}[keyof UnitMap];
type Rule = GrundformRule | ((surface: Surface) => GrundformRule);

/** Every route with represented inflection has a language-owned policy. */
const rules = {
	...germanRules,
	...englishRules,
	...hebrewRules,
} satisfies Record<InflectableRoute, Rule>;

export function ruleFor(surface: Surface): GrundformRule {
	if (!("inflectionalFeatures" in surface)) return { features: {} };
	const { language, family, kind } = surface.lemma;
	const key = `${language}/${family}/${kind}`;
	if (!Object.hasOwn(rules, key))
		throw new Error(
			`Missing Grundform rule for represented inflection: ${key}`,
		);
	const rule: Rule = rules[key as InflectableRoute];
	return typeof rule === "function" ? rule(surface) : rule;
}

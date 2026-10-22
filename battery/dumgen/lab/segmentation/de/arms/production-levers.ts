/**
 * The production arm's `--opt` levers (#851), each read into the policies
 * it adds over production's unit stage (`production-stage.ts`). Every
 * lever's groups no batched route request asked about route `Unresolved`
 * unasked, so no lever asks `route-extra`; membership never reads those
 * routes.
 *
 * - `--opt variants=0.1,0.2` (X7): production with route variants at each
 *   margin, `production+variants@<margin>`.
 * - `--opt x3=<rule>,<rule>` (X3): production with each listed code rule
 *   added to its own, `production+<rule>`, and with all of them,
 *   `production+x3` (`code-rules.ts`). `all` lists every rule.
 * - `--opt x5=<variant>,<variant>` (X5): production's rules with the
 *   Locution Choice (`locution-choice.ts`), `production+x5@<variant>`. A
 *   variant is the `fixed` share each unit of a merge needs, then any of
 *   `noabsorb` and `sc` (the `saying-closed` code rule added), joined by
 *   `-`: `0.5`, `0.6-noabsorb`, `0.5-sc`. Every variant reads one
 *   `locution` request per rule set.
 * - `--opt verb=<variant>,<variant>` (D4): production's rules and Locution
 *   Choice with the Verb Choice (`verb-choice.ts`),
 *   `production+verb@<variant>`. A variant is the floor, then the families
 *   it applies joined by `-` (all when none is named): `0.6`,
 *   `0.6-lassen-recipient`. Every variant reads the one `verb` request
 *   over all families.
 * - `--opt gov=<variant>,<variant>` (X4): production with the Government
 *   Choice (`government-choice.ts`), `production+gov@<variant>`. A variant
 *   is the floor, then the families it applies joined by `-` (all when
 *   none is named): `0.6`, `0.6-joined-rival`. Every variant reads the one
 *   `government` request over all families, asked over production's
 *   membership.
 * - `--opt grid=x1` (X1): `production-grid.ts`.
 * - `--opt pool=mean,median` (X2): every policy again over answers pooled
 *   across the cache's repetitions (`production.ts`).
 */

import * as Effect from "effect/Effect";
import {
	type CodeRule,
	codeRules,
} from "../../../../src/segment/de/code-rules.js";
import {
	askGovernmentChoice,
	governmentFamilies,
	withGovernmentChoice,
} from "../../../../src/segment/de/government-choice.js";
import {
	askLocutionChoice,
	type LocutionAnswers,
	type LocutionSettings,
	withLocutionChoice,
} from "../../../../src/segment/de/locution-choice.js";
import { productionUnitSettings } from "../../../../src/segment/de/units.js";
import {
	askVerbChoice,
	verbFamilies,
	withVerbChoice,
} from "../../../../src/segment/de/verb-choice.js";
import type { SegmentInUnitsOutput } from "../../../evaluation/spec-corpus/segment-in-units.js";
import { type Pooling, poolings } from "../../harness/pool.js";
import type { ArmOptions } from "../arm.js";
import { gridPolicies } from "./production-grid.js";
import type { Policies } from "./production-stage.js";

const settings = productionUnitSettings;

export type Levers = {
	/** X2's poolings, each a second reading of every policy. */
	readonly pool: readonly Pooling[];
	/** The policies the other levers add, in a fixed order. */
	readonly policies: readonly Policies[];
};

/** A lever's value, split at commas. */
const listOf = (option: string | undefined) =>
	(option ?? "").split(",").filter(Boolean);

/** Each of `names` as found in `vocabulary`; undefined when one is not in it. */
function foundIn<Name extends string>(
	vocabulary: readonly Name[],
	names: readonly string[],
): Name[] | undefined {
	const found: Name[] = [];
	for (const name of names) {
		const known = vocabulary.find((entry) => entry === name);
		if (known === undefined) return undefined;
		found.push(known);
	}
	return found;
}

/** `--opt <key>=<variants>`: each a floor, then any of `families` joined by `-`, all when none is named. */
function choiceVariantsOf<Family extends string>(
	key: string,
	option: string,
	families: readonly Family[],
) {
	return listOf(option).map((name) => {
		const [floor, ...listed] = name.split("-");
		const share = Number(floor);
		const found = foundIn(families, listed);
		if (!Number.isFinite(share) || !found)
			throw Error(
				`--opt ${key}=${option}: a variant is a floor, then any of ${families.join(", ")}, joined by -`,
			);
		return {
			name,
			settings: {
				floor: share,
				families: found.length > 0 ? found : families,
			},
		};
	});
}

/** Production's rules with `added`. */
const rulesWith = (added: readonly CodeRule[]) => [
	...new Set([...settings.rules, ...added]),
];

function variantPolicies(option: string): Policies | undefined {
	const margins = listOf(option).map((entry) => {
		const margin = Number(entry);
		if (!Number.isFinite(margin) || margin < 0)
			throw Error(`--opt variants=${option} must list margins`);
		return margin;
	});
	if (margins.length === 0) return undefined;
	return async (stage) => {
		const { routed } = await stage.production();
		return Object.fromEntries(
			margins.map((margin) => [
				`production+variants@${margin}`,
				{ units: routed.units(margin) },
			]),
		);
	};
}

function x3Policies(option: string): Policies | undefined {
	const listed = listOf(option);
	const rules = listed.includes("all")
		? [...codeRules]
		: listed.map((rule) => {
				const known = codeRules.find((entry) => entry === rule);
				if (!known)
					throw Error(
						`--opt x3=${option} lists all, ${codeRules.join(", ")}`,
					);
				return known;
			});
	const policies = [
		...rules.map((rule) => [rule, [rule]] as const),
		...(rules.length > 1 ? [["x3", rules] as const] : []),
	];
	if (policies.length === 0) return undefined;
	return async (stage) => {
		const outputs: Record<string, SegmentInUnitsOutput> = {};
		for (const [name, added] of policies) {
			const ruleSet = rulesWith(added);
			const read = await stage.read(ruleSet);
			outputs[`production+${name}`] = stage.units(
				read,
				await stage.membership(read, ruleSet),
				ruleSet,
			);
		}
		return outputs;
	};
}

function x5Policies(option: string): Policies | undefined {
	const variants = listOf(option).map((name) => {
		const [floor, ...flags] = name.split("-");
		const share = Number(floor);
		if (
			!Number.isFinite(share) ||
			flags.some((flag) => !["noabsorb", "sc"].includes(flag))
		)
			throw Error(
				`--opt x5=${option}: a variant is a floor, then noabsorb or sc, joined by -`,
			);
		const locution: LocutionSettings = {
			floor: share,
			absorb: !flags.includes("noabsorb"),
		};
		const added: CodeRule[] = flags.includes("sc") ? ["saying-closed"] : [];
		return { name, locution, rules: rulesWith(added) };
	});
	if (variants.length === 0) return undefined;
	return async (stage) => {
		// One `locution` request per rule set, shared by the variants that read it.
		const located = new Map<string, Promise<LocutionAnswers>>();
		const outputs: Record<string, SegmentInUnitsOutput> = {};
		for (const { name, locution, rules } of variants) {
			const read = await stage.read(rules);
			const { base, ruled } = stage.ruled(read, rules);
			const key = [...rules].sort().join(",");
			const asked =
				located.get(key) ??
				Effect.runPromise(
					askLocutionChoice(read.nomination, ruled, stage.ask, rules),
				);
			located.set(key, asked);
			outputs[`production+x5@${name}`] = stage.units(
				read,
				withLocutionChoice(
					read.nomination,
					base,
					ruled,
					await asked,
					rules,
					locution,
				),
				rules,
			);
		}
		return outputs;
	};
}

function verbPolicies(option: string): Policies | undefined {
	const variants = choiceVariantsOf("verb", option, verbFamilies);
	if (variants.length === 0) return undefined;
	return async (stage) => {
		const rules = settings.rules;
		const read = await stage.read(rules);
		const located = await stage.located(read, rules);
		// One `verb` request over every family, shared by every variant.
		const asked = await Effect.runPromise(
			askVerbChoice(read.nomination, stage.ask),
		);
		return Object.fromEntries(
			variants.map((variant) => [
				`production+verb@${variant.name}`,
				stage.units(
					read,
					withVerbChoice(
						read.nomination,
						located,
						asked,
						rules,
						variant.settings,
					),
					rules,
				),
			]),
		);
	};
}

function governmentPolicies(option: string): Policies | undefined {
	const variants = choiceVariantsOf("gov", option, governmentFamilies);
	if (variants.length === 0) return undefined;
	return async (stage) => {
		const rules = settings.rules;
		const read = await stage.read(rules);
		const membership = await stage.membership(read, rules);
		// One `government` request over every family, shared by every variant.
		const asked = await Effect.runPromise(
			askGovernmentChoice(read.nomination, membership, stage.ask, rules),
		);
		return Object.fromEntries(
			variants.map((variant) => [
				`production+gov@${variant.name}`,
				stage.units(
					read,
					withGovernmentChoice(
						read.nomination,
						membership,
						asked,
						rules,
						variant.settings,
					),
					rules,
				),
			]),
		);
	};
}

/** Each lever by its `--opt` key, in the order its policies are asked and named; none when its value lists nothing. */
const levers: Readonly<
	Record<string, (option: string) => Policies | undefined>
> = {
	variants: variantPolicies,
	x3: x3Policies,
	x5: x5Policies,
	verb: verbPolicies,
	gov: governmentPolicies,
	grid: (option) => {
		if (option !== "x1") throw Error(`--opt grid=${option} must be x1`);
		return gridPolicies;
	},
};

/** The levers `options` pull; an unknown or malformed one throws. */
export function leversOf(options: ArmOptions): Levers {
	for (const key of Object.keys(options))
		if (key !== "pool" && !Object.hasOwn(levers, key))
			throw Error(`production takes no --opt ${key}`);
	const pool = listOf(options.pool).map((entry) => {
		const known = poolings.find((pooling) => pooling === entry);
		if (!known)
			throw Error(
				`--opt pool=${options.pool} lists ${poolings.join(", ")}`,
			);
		return known;
	});
	return {
		pool,
		policies: Object.entries(levers).flatMap(([key, policiesOf]) => {
			const option = options[key];
			const policies =
				option === undefined ? undefined : policiesOf(option);
			return policies ? [policies] : [];
		}),
	};
}

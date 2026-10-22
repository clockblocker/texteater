/**
 * The production arm's `--opt` levers (#851), each read into the policies
 * it adds over production's unit stage (`production-stage.ts`). Each
 * policy is production with one knob changed: its code rules, Choices,
 * floors and route variants are production's otherwise, so a variant
 * that repeats production's own setting outputs and asks what production
 * does. That includes routing: a group no batched route request asked
 * about asks `route-extra`, as production's does.
 *
 * - `--opt variants=0.1,0.2` (X7): production with route variants at each
 *   margin, `production+variants@<margin>`.
 * - `--opt x3=<rule>,<rule>` (X3): production with each listed code rule
 *   added to its own, `production+<rule>`, and with all of them,
 *   `production+x3` (`code-rules.ts`). `all` lists every rule. A rule
 *   production already applies changes nothing; this screens a rule
 *   `codeRules` holds and production does not yet.
 * - `--opt x5=<variant>,<variant>` (X5): production with each variant's
 *   Locution Choice (`locution-choice.ts`) in place of its own,
 *   `production+x5@<variant>`. A variant is the `fixed` share each unit of
 *   a merge needs, then any of `noabsorb` and `sc` (the `saying-closed`
 *   code rule added, which production applies already), joined by `-`:
 *   `0.5`, `0.6-noabsorb`, `0.5-sc`. The Verb and Government Choices run
 *   after it, so a variant whose membership differs from production's asks
 *   its own `government` request.
 * - `--opt verb=<variant>,<variant>` (D4): production with each variant's
 *   Verb Choice (`verb-choice.ts`) in place of its own,
 *   `production+verb@<variant>`. A variant is the floor, then the families
 *   it asks and applies joined by `-` (all when none is named): `0.6`,
 *   `0.6-lassen-recipient`. Each family set asks its own `verb` request, as
 *   production asks its families', and the Government Choice runs after it.
 * - `--opt gov=<variant>,<variant>` (X4): production with each variant's
 *   Government Choice (`government-choice.ts`) in place of its own,
 *   `production+gov@<variant>`. A variant is the floor, then the families
 *   it asks and applies joined by `-` (all when none is named): `0.6`,
 *   `0.6-joined-rival`. Each family set asks its own `government` request
 *   over production's membership before its Government Choice.
 * - `--opt grid=x1` (X1): `production-grid.ts`.
 * - `--opt pool=mean,median` (X2): every policy again over answers pooled
 *   across the cache's repetitions (`production.ts`).
 *
 * The unit stage asks each distinct request once per case, so variants
 * share every request that comes out the same, production's included.
 */

import * as Effect from "effect/Effect";
import {
	type CodeRule,
	codeRules,
} from "../../../../src/segment/de/code-rules.js";
import { governmentFamilies } from "../../../../src/segment/de/government-choice.js";
import type { LocutionSettings } from "../../../../src/segment/de/locution-choice.js";
import { productionUnitSettings } from "../../../../src/segment/de/units.js";
import { verbFamilies } from "../../../../src/segment/de/verb-choice.js";
import type { SegmentInUnitsOutput } from "../../../evaluation/spec-corpus/segment-in-units.js";
import { type Pooling, poolings } from "../../harness/pool.js";
import type { ArmOptions } from "../arm.js";
import { gridPolicies } from "./production-grid.js";
import type { Choices, Policies } from "./production-stage.js";

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
	return (stage) =>
		Effect.map(stage.production, ({ routed }) =>
			Object.fromEntries(
				margins.map((margin) => [
					`production+variants@${margin}`,
					{ units: routed.units(margin) },
				]),
			),
		);
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
	return (stage) =>
		Effect.gen(function* () {
			const outputs: Record<string, SegmentInUnitsOutput> = {};
			for (const [name, added] of policies) {
				const ruleSet = rulesWith(added);
				const read = yield* stage.read(ruleSet);
				const membership = yield* stage.membership(read, ruleSet);
				outputs[`production+${name}`] = yield* stage.units(
					read,
					membership,
					ruleSet,
				);
			}
			return outputs;
		});
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
	return (stage) =>
		Effect.gen(function* () {
			const outputs: Record<string, SegmentInUnitsOutput> = {};
			for (const { name, locution, rules } of variants) {
				const read = yield* stage.read(rules);
				const membership = yield* stage.membership(read, rules, {
					locution,
				});
				outputs[`production+x5@${name}`] = yield* stage.units(
					read,
					membership,
					rules,
				);
			}
			return outputs;
		});
}

/** Production with each variant's Choice, as `replacing` sets it, in place of its own. */
function choicePolicies<Family extends string>(
	key: string,
	option: string,
	families: readonly Family[],
	replacing: (variant: {
		readonly floor: number;
		readonly families: readonly Family[];
	}) => Partial<Choices>,
): Policies | undefined {
	const variants = choiceVariantsOf(key, option, families);
	if (variants.length === 0) return undefined;
	return (stage) =>
		Effect.gen(function* () {
			const rules = settings.rules;
			const read = yield* stage.read(rules);
			const outputs: Record<string, SegmentInUnitsOutput> = {};
			for (const variant of variants) {
				const membership = yield* stage.membership(
					read,
					rules,
					replacing(variant.settings),
				);
				outputs[`production+${key}@${variant.name}`] =
					yield* stage.units(read, membership, rules);
			}
			return outputs;
		});
}

/** Each lever by its `--opt` key, in the order its policies are asked and named; none when its value lists nothing. */
const levers: Readonly<
	Record<string, (option: string) => Policies | undefined>
> = {
	variants: variantPolicies,
	x3: x3Policies,
	x5: x5Policies,
	verb: (option) =>
		choicePolicies("verb", option, verbFamilies, (verb) => ({ verb })),
	gov: (option) =>
		choicePolicies("gov", option, governmentFamilies, (government) => ({
			government,
		})),
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

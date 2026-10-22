/**
 * Production's unit stage (`productionUnitSettings`) and its offline
 * levers, every policy read from the same answers. Under every lever, a
 * group no batched route request asked about routes `Unresolved` unasked,
 * so the levers ask no `route-extra`. Membership never reads those routes.
 *
 * - `production`: the unit stage as intake runs it (`segmentGermanUnits`).
 * - `--opt grid=x1` (X1): the Saying assembly at maxim@0.6, 0.7 and 0.8 and
 *   the reference's whole + fragment at 0.4, under production's floors
 *   (`prod+…`) and #762's (`762+…`: idiom 0.6, fixed 0.3), with step 0 and
 *   without it (`+nostep0`), each with closed-class identity.
 * - `--opt pool=mean,median` (X2): every policy again over answers pooled
 *   across the cache's repetitions 0 to 2 (`lab/segmentation/harness/pool.ts`), as
 *   `pooled-<pooling>+<policy>`. A pooled output is the same in every
 *   repetition.
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
 */

import { canonicalJson } from "common-utils";
import * as Effect from "effect/Effect";
import type { Ask } from "../../../../src/segment/ask.js";
import {
	type Floors,
	full07,
	type Membership,
	membershipOf,
	policyInput,
	type SayingAssembly,
	stepZeroMembership,
} from "../../../../src/segment/de/assembly.js";
import {
	answerBeforeFormula,
	type CodeRule,
	codeRoutes,
	codeRules,
	withCodeRules,
} from "../../../../src/segment/de/code-rules.js";
import {
	askGovernmentChoice,
	type GovernmentFamily,
	governmentFamilies,
	withGovernmentChoice,
} from "../../../../src/segment/de/government-choice.js";
import {
	askLocutionChoice,
	type LocutionAnswers,
	type LocutionSettings,
	withLocutionChoice,
} from "../../../../src/segment/de/locution-choice.js";
import {
	type Nomination,
	nominate,
} from "../../../../src/segment/de/nomination.js";
import {
	askRouteBatches,
	askUnaskedRoutes,
	type RouteAnswers,
	type RouteJudgment,
	routeMembership,
} from "../../../../src/segment/de/routing.js";
import {
	productionUnitSettings,
	type UnitSettings,
} from "../../../../src/segment/de/units.js";
import {
	askVerbChoice,
	type VerbAnswers,
	type VerbFamily,
	verbFamilies,
	withVerbChoice,
} from "../../../../src/segment/de/verb-choice.js";
import type { SegmentInUnitsOutput } from "../../../evaluation/spec-corpus/segment-in-units.js";
import {
	type Heard,
	type Pooling,
	pooledAsk,
	poolings,
	recording,
} from "../../harness/pool.js";
import { type Arm, type ArmContext, type ArmOptions, askOf } from "../arm.js";

/** A membership setting: floors, the Saying assembly and whether step 0 runs. */
type Assembly = {
	readonly floors: Floors;
	readonly saying: SayingAssembly;
	readonly stepZero: boolean;
};

/** Production's floors with the idiom and fixedness floors #762 adopted for the reference. */
const floors762: Floors = {
	...productionUnitSettings.floors,
	idiom: 0.6,
	fixed: 0.3,
};

const sayingAssemblies: Readonly<Record<string, SayingAssembly>> = {
	"maxim@0.6": { floor: 0.6, maxim: true },
	"maxim@0.7": { floor: 0.7, maxim: true },
	"maxim@0.8": { floor: 0.8, maxim: true },
	"saying@0.4": { floor: 0.4, maxim: false },
};

/** X1's grid: floors × Saying assembly × step 0. */
const x1Grid: Readonly<Record<string, Assembly>> = Object.fromEntries(
	(
		[
			["prod", productionUnitSettings.floors],
			["762", floors762],
		] as const
	).flatMap(([floorsName, floors]) =>
		Object.entries(sayingAssemblies).flatMap(([sayingName, saying]) =>
			[true, false].map((stepZero) => [
				`${floorsName}+${sayingName}${stepZero ? "" : "+nostep0"}`,
				{ floors, saying, stepZero },
			]),
		),
	),
);

/** Membership under an assembly; without step 0, candidates v3's links with the Saying Choice. */
function membershipUnder(
	nomination: Nomination,
	{ floors, saying, stepZero }: Assembly,
): Membership {
	if (stepZero) return membershipOf(nomination, floors, saying);
	if (floors.margin !== 0)
		throw Error("A satellite margin needs step 0's assembly");
	return stepZeroMembership(
		nomination,
		policyInput(nomination, {
			...full07,
			satellite: floors.satellite,
			idiom: floors.idiom,
			expression: floors.expression,
			fixed: floors.fixed,
		}),
		[],
		saying,
	);
}

/** One X5 variant: the Locution Choice's setting and the code rules it adds. */
type LocutionVariant = {
	readonly name: string;
	readonly settings: LocutionSettings;
	readonly rules: readonly CodeRule[];
};

/** One D4 or X4 variant: its Choice's floor and families. */
type ChoiceVariant<Family extends string> = {
	readonly name: string;
	readonly settings: {
		readonly floor: number;
		readonly families: readonly Family[];
	};
};

type Levers = {
	readonly grid: boolean;
	readonly pool: readonly Pooling[];
	readonly margins: readonly number[];
	readonly rules: readonly CodeRule[];
	readonly locution: readonly LocutionVariant[];
	readonly verb: readonly ChoiceVariant<VerbFamily>[];
	readonly government: readonly ChoiceVariant<GovernmentFamily>[];
};

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
	option: string | undefined,
	families: readonly Family[],
): ChoiceVariant<Family>[] {
	return (option ?? "")
		.split(",")
		.filter(Boolean)
		.map((name) => {
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

function locutionVariantsOf(option: string | undefined): LocutionVariant[] {
	return (option ?? "")
		.split(",")
		.filter(Boolean)
		.map((name) => {
			const [floor, ...flags] = name.split("-");
			const share = Number(floor);
			if (
				!Number.isFinite(share) ||
				flags.some((flag) => !["noabsorb", "sc"].includes(flag))
			)
				throw Error(
					`--opt x5=${option}: a variant is a floor, then noabsorb or sc, joined by -`,
				);
			return {
				name,
				settings: {
					floor: share,
					absorb: !flags.includes("noabsorb"),
				},
				rules: flags.includes("sc") ? ["saying-closed"] : [],
			};
		});
}

function rulesOf(option: string | undefined): CodeRule[] {
	const listed = (option ?? "").split(",").filter(Boolean);
	if (listed.includes("all")) return [...codeRules];
	return listed.map((rule) => {
		const known = codeRules.find((entry) => entry === rule);
		if (!known)
			throw Error(
				`--opt x3=${option} lists all, ${codeRules.join(", ")}`,
			);
		return known;
	});
}

function leversOf(options: ArmOptions): Levers {
	const known = new Set([
		"grid",
		"pool",
		"variants",
		"x3",
		"x5",
		"verb",
		"gov",
	]);
	for (const key of Object.keys(options))
		if (!known.has(key)) throw Error(`production takes no --opt ${key}`);
	if (options.grid !== undefined && options.grid !== "x1")
		throw Error(`--opt grid=${options.grid} must be x1`);
	const pool = (options.pool ?? "")
		.split(",")
		.filter(Boolean)
		.map((entry) => {
			const known = poolings.find((pooling) => pooling === entry);
			if (!known)
				throw Error(
					`--opt pool=${options.pool} lists ${poolings.join(", ")}`,
				);
			return known;
		});
	const margins = (options.variants ?? "")
		.split(",")
		.filter(Boolean)
		.map((entry) => {
			const margin = Number(entry);
			if (!Number.isFinite(margin) || margin < 0)
				throw Error(
					`--opt variants=${options.variants} must list margins`,
				);
			return margin;
		});
	return {
		grid: options.grid === "x1",
		pool,
		margins,
		rules: rulesOf(options.x3),
		locution: locutionVariantsOf(options.x5),
		verb: choiceVariantsOf("verb", options.verb, verbFamilies),
		government: choiceVariantsOf("gov", options.gov, governmentFamilies),
	};
}

/** X3's policies: each listed rule and, with two or more, all of them. */
const x3Policies = (rules: readonly CodeRule[]) => [
	...rules.map((rule) => [rule, [rule]] as const),
	...(rules.length > 1 ? [["x3", rules] as const] : []),
];

/** A nomination and its batched route answers. */
type Read = {
	readonly nomination: Nomination;
	readonly answers: RouteAnswers;
};

/** Membership under code rules and production's Locution Choice over one read, before any Verb Choice. */
async function ruledMembership(
	read: Read,
	rules: readonly CodeRule[],
	ask: Ask,
): Promise<Membership> {
	const settings = productionUnitSettings;
	const base = membershipOf(
		read.nomination,
		settings.floors,
		settings.saying,
	);
	const ruled = withCodeRules(read.nomination, base, rules);
	// Production's Locution Choice (X5) runs over every rule set it is given.
	return settings.locution
		? withLocutionChoice(
				read.nomination,
				base,
				ruled,
				await Effect.runPromise(
					askLocutionChoice(read.nomination, ruled, ask, rules),
				),
				rules,
				settings.locution,
			)
		: ruled;
}

/** Membership under code rules and production's Locution, Verb and Government Choices over one read. */
async function productionMembership(
	read: Read,
	rules: readonly CodeRule[],
	ask: Ask,
): Promise<Membership> {
	const settings = productionUnitSettings;
	const located = await ruledMembership(read, rules, ask);
	const verbed = settings.verb
		? withVerbChoice(
				read.nomination,
				located,
				await Effect.runPromise(
					askVerbChoice(read.nomination, ask, settings.verb.families),
				),
				rules,
				settings.verb,
			)
		: located;
	return settings.government
		? withGovernmentChoice(
				read.nomination,
				verbed,
				await Effect.runPromise(
					askGovernmentChoice(
						read.nomination,
						verbed,
						ask,
						rules,
						settings.government.families,
					),
				),
				rules,
				settings.government,
			)
		: verbed;
}

/** Units under code rules and production's follow-up Choices over one read, as the unit stage routes them. */
async function ruledUnits(
	read: Read,
	rules: readonly CodeRule[],
	unasked: UnitSettings["unasked"],
	ask: Ask,
) {
	return routedUnits(
		read,
		await productionMembership(read, rules, ask),
		rules,
		unasked,
		ask,
	);
}

/** A membership's units, its new groups routed as `unasked` says. */
async function routedUnits(
	read: Read,
	membership: Membership,
	rules: readonly CodeRule[],
	unasked: UnitSettings["unasked"],
	ask: Ask,
) {
	const extra =
		unasked === "ask"
			? await Effect.runPromise(
					askUnaskedRoutes(
						read.nomination,
						read.answers,
						membership.partition,
						ask,
					),
				)
			: undefined;
	return routeMembership(
		read.nomination,
		membership,
		read.answers,
		extra,
		rules.includes("answer-apart") ? answerBeforeFormula : undefined,
		codeRoutes(read.nomination, rules),
	);
}

/** Every policy over one `ask`, each name prefixed. */
async function outputsOf(
	input: Parameters<Arm["run"]>[0],
	ask: Ask,
	levers: Levers,
	prefix = "",
): Promise<{
	readonly outputs: Record<string, SegmentInUnitsOutput>;
	readonly routes: RouteJudgment[];
}> {
	const settings = productionUnitSettings;
	// was-fuer adds its Noul to `final`; a Sentence without was … für asks the same.
	const reads = new Map<boolean, Promise<Read>>();
	const readOf = (wasFuer: boolean): Promise<Read> => {
		const known = reads.get(wasFuer);
		if (known) return known;
		const read = (async () => {
			const nomination = await Effect.runPromise(
				nominate(input, ask, settings.inventory, {
					wasFuer,
				}),
			);
			return {
				nomination,
				answers: await Effect.runPromise(
					askRouteBatches(nomination, ask),
				),
			};
		})();
		reads.set(wasFuer, read);
		return read;
	};
	const production = await readOf(settings.rules.includes("was-fuer"));
	const routed = await ruledUnits(
		production,
		settings.rules,
		settings.unasked,
		ask,
	);
	const outputs: Record<string, SegmentInUnitsOutput> = {
		[`${prefix}production`]: {
			units: routed.units(settings.variantMargin),
		},
	};
	for (const margin of levers.margins)
		outputs[`${prefix}production+variants@${margin}`] = {
			units: routed.units(margin),
		};
	for (const [name, listed] of x3Policies(levers.rules)) {
		const rules = [...new Set([...settings.rules, ...listed])];
		outputs[`${prefix}production+${name}`] = {
			units: (
				await ruledUnits(
					await readOf(rules.includes("was-fuer")),
					rules,
					"unresolved",
					ask,
				)
			).units(),
		};
	}
	// One `locution` request per rule set, shared by the variants that read it.
	const located = new Map<string, Promise<LocutionAnswers>>();
	for (const variant of levers.locution) {
		const rules = [...new Set([...settings.rules, ...variant.rules])];
		const read = await readOf(rules.includes("was-fuer"));
		const base = membershipOf(
			read.nomination,
			settings.floors,
			settings.saying,
		);
		const ruled = withCodeRules(read.nomination, base, rules);
		const key = [...rules].sort().join(",");
		const asked =
			located.get(key) ??
			Effect.runPromise(
				askLocutionChoice(read.nomination, ruled, ask, rules),
			);
		located.set(key, asked);
		const membership = withLocutionChoice(
			read.nomination,
			base,
			ruled,
			await asked,
			rules,
			variant.settings,
		);
		outputs[`${prefix}production+x5@${variant.name}`] = {
			units: (
				await routedUnits(read, membership, rules, "unresolved", ask)
			).units(),
		};
	}
	if (levers.verb.length > 0) {
		const rules = settings.rules;
		const read = await readOf(rules.includes("was-fuer"));
		const located = await ruledMembership(read, rules, ask);
		// One `verb` request over every family, shared by every variant.
		const asked: VerbAnswers = await Effect.runPromise(
			askVerbChoice(read.nomination, ask),
		);
		for (const variant of levers.verb)
			outputs[`${prefix}production+verb@${variant.name}`] = {
				units: (
					await routedUnits(
						read,
						withVerbChoice(
							read.nomination,
							located,
							asked,
							rules,
							variant.settings,
						),
						rules,
						"unresolved",
						ask,
					)
				).units(),
			};
	}
	if (levers.government.length > 0) {
		const rules = settings.rules;
		const read = await readOf(rules.includes("was-fuer"));
		const membership = await productionMembership(read, rules, ask);
		// One `government` request over every family, shared by every variant.
		const asked = await Effect.runPromise(
			askGovernmentChoice(read.nomination, membership, ask, rules),
		);
		for (const variant of levers.government)
			outputs[`${prefix}production+gov@${variant.name}`] = {
				units: (
					await routedUnits(
						read,
						withGovernmentChoice(
							read.nomination,
							membership,
							asked,
							rules,
							variant.settings,
						),
						rules,
						"unresolved",
						ask,
					)
				).units(),
			};
	}
	if (levers.grid) {
		const read = await readOf(false);
		for (const [name, assembly] of Object.entries(x1Grid))
			outputs[`${prefix}${name}`] = {
				units: (
					await routedUnits(
						read,
						membershipUnder(read.nomination, assembly),
						[],
						"unresolved",
						ask,
					)
				).units(),
			};
	}
	return {
		outputs,
		routes: [...production.answers.routes.identity.values()],
	};
}

/** The repetitions a pool reads. */
const pooledRepetitions = [0, 1, 2] as const;

/** Each case's answers by repetition, heard once per run. */
const heardCache = new WeakMap<
	ArmContext["jev"],
	Map<string, Promise<Heard[]>>
>();

function heardOf(
	input: Parameters<Arm["run"]>[0],
	context: ArmContext,
): Promise<Heard[]> {
	const byCase = heardCache.get(context.jev) ?? new Map();
	heardCache.set(context.jev, byCase);
	const key = canonicalJson(input);
	const known = byCase.get(key);
	if (known) return known;
	const heard = Promise.all(
		pooledRepetitions.map(async (repetition) => {
			const answers: Heard = new Map();
			// Fresh calls land in this repetition's record, so a live run counts them.
			await outputsOf(
				input,
				recording(
					askOf({
						jev: context.jev,
						repetition,
						calls: context.calls,
					}),
					answers,
				),
				leversOf({}),
			);
			return answers;
		}),
	);
	byCase.set(key, heard);
	return heard;
}

export const productionArm: Arm = {
	id: "production",
	summary:
		"production's unit stage with #851's offline levers: the X1 floors × Saying grid, X2 pooled repetitions, X7 route variants, X3 code rules and the X5 Locution, D4 Verb and X4 Government Choice variants",
	async run(input, context) {
		const levers = leversOf(context.options);
		const { outputs, routes } = await outputsOf(
			input,
			askOf(context),
			levers,
		);
		if (levers.pool.length > 0) {
			const heard = await heardOf(input, context);
			for (const pooling of levers.pool)
				Object.assign(
					outputs,
					(
						await outputsOf(
							input,
							pooledAsk(heard, pooling),
							levers,
							`pooled-${pooling}+`,
						)
					).outputs,
				);
		}
		return {
			primary: "production",
			outputs,
			routes,
		};
	},
};

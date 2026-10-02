/**
 * Production's unit stage (`productionUnitSettings`, #843) and the levers
 * of #851's offline experiments, every policy read from the same answers:
 *
 * - `production`: the unit stage as intake runs it (`segmentGermanUnits`).
 * - `--opt grid=x1` (X1): the Saying assembly at maxim@0.6, 0.7 and 0.8 and
 *   the reference's whole + fragment at 0.4, under production's floors
 *   (`prod+…`) and #762's (`762+…`: idiom 0.6, fixed 0.3), with step 0 and
 *   without it (`+nostep0`), each with closed-class identity. A group no
 *   batched route request asked about routes `Unresolved` unasked, so the
 *   grid runs offline (`--opt unasked=ask` asks `route-extra`).
 *   Membership never reads those routes.
 * - `--opt pool=mean,median` (X2): every policy again over answers pooled
 *   across the cache's repetitions 0 to 2 (`lab/pool.ts`), as
 *   `pooled-<pooling>+<policy>`. A pooled output is the same in every
 *   repetition.
 * - `--opt variants=0.1,0.2` (X7): production with route variants at each
 *   margin, `production+variants@<margin>`.
 * - `--opt x3=<rule>,<rule>` (X3): production with each listed code rule
 *   added to its own, `production+<rule>`, and with all of them,
 *   `production+x3` (`code-rules.ts`). `all` lists every rule. `was-fuer` asks its Noul
 *   in `final`, so a Sentence with was … für misses the cache once.
 *   Groups no batch asked about route `Unresolved`, as in the grid.
 * - `--opt x5=<variant>,<variant>` (X5): production with the Locution
 *   Choice (`locution-choice.ts`), `production+x5@<variant>`. A variant is
 *   the `fixed` share each unit of a merge needs, then any of `noabsorb`
 *   and `sc` (the `saying-closed` code rule added), joined by `-`: `0.5`,
 *   `0.6-noabsorb`, `0.5-sc`. Every variant reads one `locution` request
 *   per rule set, so the variants of one run ask once. Groups no batch
 *   asked about route as `--opt unasked` says.
 * - `--opt verb=<variant>,<variant>` (D4): production with the Verb Choice
 *   (`verb-choice.ts`), `production+verb@<variant>`. A variant is the floor,
 *   then the families it applies joined by `-` (all when none is named):
 *   `0.6`, `0.6-lassen-recipient`. Every variant reads the one `verb`
 *   request, which depends on the nomination alone. Groups no batch asked
 *   about route as `--opt unasked` says.
 */
import { stableJson } from "promptsmith";
import type { SegmentInUnitsOutput } from "../../../evaluation/spec-corpus/segment-in-units.js";
import type { Ask } from "../../../segment/ask.js";
import {
	type Floors,
	full07,
	type Membership,
	membershipOf,
	policyInput,
	type SayingAssembly,
	stepZeroMembership,
} from "../../../segment/de/assembly.js";
import {
	answerBeforeFormula,
	type CodeRule,
	codeRules,
	withCodeRules,
} from "../../../segment/de/code-rules.js";
import {
	askLocutionChoice,
	type LocutionAnswers,
	type LocutionSettings,
	withLocutionChoice,
} from "../../../segment/de/locution-choice.js";
import { type Nomination, nominate } from "../../../segment/de/nomination.js";
import {
	askRouteBatches,
	askUnaskedRoutes,
	type RouteAnswers,
	type RouteJudgment,
	routeMembership,
} from "../../../segment/de/routing.js";
import { productionUnitSettings } from "../../../segment/de/units.js";
import {
	askVerbChoice,
	type VerbAnswers,
	type VerbFamily,
	type VerbSettings,
	verbFamilies,
	withVerbChoice,
} from "../../../segment/de/verb-choice.js";
import {
	type Heard,
	type Pooling,
	pooledAsk,
	poolings,
	recording,
} from "../../lab/pool.js";
import { type Arm, type ArmContext, type ArmOptions, askOf } from "../arm.js";

/** A membership setting: floors, the Saying assembly and whether step 0 runs. */
export type Assembly = {
	readonly floors: Floors;
	readonly saying: SayingAssembly;
	readonly stepZero: boolean;
};

/** Production's floors with the idiom and fixedness floors #762 adopted for the reference. */
export const floors762: Floors = {
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
export const x1Grid: Readonly<Record<string, Assembly>> = Object.fromEntries(
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
export function membershipUnder(
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

/** One D4 variant: the Verb Choice's floor and families. */
type VerbVariant = {
	readonly name: string;
	readonly settings: VerbSettings;
};

type Levers = {
	readonly grid: boolean;
	readonly pool: readonly Pooling[];
	readonly margins: readonly number[];
	readonly unasked: "ask" | "unresolved";
	readonly rules: readonly CodeRule[];
	readonly locution: readonly LocutionVariant[];
	readonly verb: readonly VerbVariant[];
};

function verbVariantsOf(option: string | undefined): VerbVariant[] {
	return (option ?? "")
		.split(",")
		.filter(Boolean)
		.map((name) => {
			const [floor, ...families] = name.split("-");
			const share = Number(floor);
			if (
				!Number.isFinite(share) ||
				families.some(
					(family) => !verbFamilies.includes(family as VerbFamily),
				)
			)
				throw Error(
					`--opt verb=${option}: a variant is a floor, then any of ${verbFamilies.join(", ")}, joined by -`,
				);
			return {
				name,
				settings: {
					floor: share,
					families:
						families.length > 0
							? (families as VerbFamily[])
							: verbFamilies,
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
	for (const rule of listed)
		if (!codeRules.includes(rule as CodeRule))
			throw Error(
				`--opt x3=${option} lists all, ${codeRules.join(", ")}`,
			);
	return listed as CodeRule[];
}

function leversOf(options: ArmOptions): Levers {
	const known = new Set([
		"grid",
		"pool",
		"variants",
		"unasked",
		"primary",
		"x3",
		"x5",
		"verb",
	]);
	for (const key of Object.keys(options))
		if (!known.has(key)) throw Error(`production takes no --opt ${key}`);
	if (options.grid !== undefined && options.grid !== "x1")
		throw Error(`--opt grid=${options.grid} must be x1`);
	const pool = (options.pool ?? "").split(",").filter(Boolean);
	for (const entry of pool)
		if (!poolings.includes(entry as Pooling))
			throw Error(
				`--opt pool=${options.pool} lists ${poolings.join(", ")}`,
			);
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
	const unasked = options.unasked ?? "unresolved";
	if (unasked !== "ask" && unasked !== "unresolved")
		throw Error(`--opt unasked=${unasked} must be ask or unresolved`);
	return {
		grid: options.grid === "x1",
		pool: pool as Pooling[],
		margins,
		unasked,
		rules: rulesOf(options.x3),
		locution: locutionVariantsOf(options.x5),
		verb: verbVariantsOf(options.verb),
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
				await askLocutionChoice(read.nomination, ruled, ask, rules),
				rules,
				settings.locution,
			)
		: ruled;
}

/** Units under code rules, production's Locution Choice and its Verb Choice over one read, as the unit stage routes them. */
async function ruledUnits(
	read: Read,
	rules: readonly CodeRule[],
	unasked: "ask" | "unresolved",
	ask: Ask,
) {
	const settings = productionUnitSettings;
	const located = await ruledMembership(read, rules, ask);
	const membership = settings.verb
		? withVerbChoice(
				read.nomination,
				located,
				await askVerbChoice(read.nomination, ask),
				rules,
				settings.verb,
			)
		: located;
	return routedUnits(read, membership, rules, unasked, ask);
}

/** A membership's units, its new groups routed as `unasked` says. */
async function routedUnits(
	read: Read,
	membership: Membership,
	rules: readonly CodeRule[],
	unasked: "ask" | "unresolved",
	ask: Ask,
) {
	const extra =
		unasked === "ask"
			? await askUnaskedRoutes(
					read.nomination,
					read.answers,
					membership.partition,
					ask,
				)
			: undefined;
	return routeMembership(
		read.nomination,
		membership,
		read.answers,
		extra,
		rules.includes("answer-apart") ? answerBeforeFormula : undefined,
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
			const nomination = await nominate(input, ask, settings.inventory, {
				wasFuer,
			});
			return {
				nomination,
				answers: await askRouteBatches(nomination, ask),
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
					levers.unasked,
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
			askLocutionChoice(read.nomination, ruled, ask, rules);
		located.set(key, asked);
		const membership = withLocutionChoice(
			read.nomination,
			base,
			ruled,
			await asked,
			rules,
			variant.settings,
		);
		const extra =
			levers.unasked === "ask"
				? await askUnaskedRoutes(
						read.nomination,
						read.answers,
						membership.partition,
						ask,
					)
				: undefined;
		outputs[`${prefix}production+x5@${variant.name}`] = {
			units: routeMembership(
				read.nomination,
				membership,
				read.answers,
				extra,
				rules.includes("answer-apart")
					? answerBeforeFormula
					: undefined,
			).units(),
		};
	}
	if (levers.verb.length > 0) {
		const rules = settings.rules;
		const read = await readOf(rules.includes("was-fuer"));
		const located = await ruledMembership(read, rules, ask);
		// One `verb` request, shared by every variant.
		const asked: VerbAnswers = await askVerbChoice(read.nomination, ask);
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
						levers.unasked,
						ask,
					)
				).units(),
			};
	}
	if (levers.grid) {
		const { nomination, answers } = await readOf(false);
		for (const [name, assembly] of Object.entries(x1Grid)) {
			const under = membershipUnder(nomination, assembly);
			const more =
				levers.unasked === "ask"
					? await askUnaskedRoutes(
							nomination,
							answers,
							under.partition,
							ask,
						)
					: undefined;
			outputs[`${prefix}${name}`] = {
				units: routeMembership(
					nomination,
					under,
					answers,
					more,
				).units(),
			};
		}
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
	const key = stableJson(input);
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
				{
					grid: false,
					pool: [],
					margins: [],
					unasked: "ask",
					rules: [],
					locution: [],
					verb: [],
				},
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
		"production's unit stage (candidates4 maxim+closed, #843) with #851's offline levers: the X1 floors × Saying grid, X2 pooled repetitions and X7 route variants",
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
			primary: context.options.primary ?? "production",
			outputs,
			routes,
		};
	},
};

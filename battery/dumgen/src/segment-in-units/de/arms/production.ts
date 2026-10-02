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
import { type Nomination, nominate } from "../../../segment/de/nomination.js";
import {
	askRouteBatches,
	askUnaskedRoutes,
	type RouteJudgment,
	routeMembership,
} from "../../../segment/de/routing.js";
import { productionUnitSettings } from "../../../segment/de/units.js";
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

type Levers = {
	readonly grid: boolean;
	readonly pool: readonly Pooling[];
	readonly margins: readonly number[];
	readonly unasked: "ask" | "unresolved";
};

function leversOf(options: ArmOptions): Levers {
	const known = new Set(["grid", "pool", "variants", "unasked", "primary"]);
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
	};
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
	const nomination = await nominate(input, ask, settings.inventory);
	const answers = await askRouteBatches(nomination, ask);
	const membership = membershipOf(
		nomination,
		settings.floors,
		settings.saying,
	);
	const extra =
		settings.unasked === "ask"
			? await askUnaskedRoutes(
					nomination,
					answers,
					membership.partition,
					ask,
				)
			: undefined;
	const routed = routeMembership(nomination, membership, answers, extra);
	const outputs: Record<string, SegmentInUnitsOutput> = {
		[`${prefix}production`]: {
			units: routed.units(settings.variantMargin),
		},
	};
	for (const margin of levers.margins)
		outputs[`${prefix}production+variants@${margin}`] = {
			units: routed.units(margin),
		};
	if (levers.grid)
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
	return { outputs, routes: [...answers.routes.identity.values()] };
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
				{ grid: false, pool: [], margins: [], unasked: "ask" },
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

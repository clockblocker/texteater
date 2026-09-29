import type { Arm } from "../arm.js";
import { attachArm } from "./attach.js";
import { oracleArm, singletonArm } from "./baselines.js";
import { anchoredArm, pairwiseArm } from "./pairs.js";

export const arms: Readonly<Record<string, Arm>> = Object.fromEntries(
	[singletonArm, oracleArm, pairwiseArm, anchoredArm, attachArm].map(
		(arm) => [arm.id, arm],
	),
);

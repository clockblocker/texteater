import type { Arm } from "../arm.js";
import { attachArm } from "./attach.js";
import { oracleArm, singletonArm } from "./baselines.js";
import { candidatesArm } from "./candidates.js";
import { candidates2Arm } from "./candidates2.js";
import { candidates4Arm } from "./candidates4.js";
import { lunaArm } from "./luna.js";
import { anchoredArm, pairwiseArm } from "./pairs.js";

export const arms: Readonly<Record<string, Arm>> = Object.fromEntries(
	[
		singletonArm,
		oracleArm,
		pairwiseArm,
		anchoredArm,
		attachArm,
		candidatesArm,
		candidates2Arm,
		candidates4Arm,
		lunaArm,
	].map((arm) => [arm.id, arm]),
);

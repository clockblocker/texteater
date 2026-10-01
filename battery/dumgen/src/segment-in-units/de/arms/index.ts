import type { Arm } from "../arm.js";
import { attachArm } from "./attach.js";
import { oracleArm, singletonArm } from "./baselines.js";
import { candidatesArm } from "./candidates.js";
import { candidates2Arm } from "./candidates2.js";
import { candidates4Arm } from "./candidates4.js";
import { envelopesArm } from "./envelopes.js";
import { lunaArm } from "./luna.js";
import { ownershipArm } from "./ownership.js";
import { anchoredArm, pairwiseArm } from "./pairs.js";
import { proposalsArm } from "./proposals.js";
import { referenceArm } from "./reference.js";
import { referenceFloorsArm } from "./reference-floors.js";

export const arms: Readonly<Record<string, Arm>> = Object.fromEntries(
	[
		singletonArm,
		oracleArm,
		pairwiseArm,
		anchoredArm,
		attachArm,
		ownershipArm,
		envelopesArm,
		proposalsArm,
		candidatesArm,
		candidates2Arm,
		candidates4Arm,
		referenceArm,
		referenceFloorsArm,
		lunaArm,
	].map((arm) => [arm.id, arm]),
);

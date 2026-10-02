/**
 * The lab's arms, each a configuration of the production unit stage. The
 * retired arms (singleton, oracle, pairwise, anchored, attach, ownership,
 * envelopes, proposals, candidates, candidates2, luna) and candidates4's
 * retired levers are kept at ec467e8d; reference-floors, added later, at
 * 5335f033.
 */
import type { Arm } from "../arm.js";
import { candidates4Arm } from "./candidates4.js";
import { referenceArm } from "./reference.js";

export const arms: Readonly<Record<string, Arm>> = Object.fromEntries(
	[candidates4Arm, referenceArm].map((arm) => [arm.id, arm]),
);

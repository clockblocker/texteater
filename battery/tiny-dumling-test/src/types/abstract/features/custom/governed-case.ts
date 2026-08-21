import type { z } from "zod";

import { Case } from "../ud/case.js";

export const GovernedCase = Case;
export type GovernedCase = z.infer<typeof GovernedCase>;

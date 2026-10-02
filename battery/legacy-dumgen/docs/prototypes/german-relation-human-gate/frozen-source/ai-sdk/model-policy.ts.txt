/** The single model policy for every future Dumgen generation request. */
export const DUMGEN_GENERATION_MODEL = "gpt-5.6-luna" as const;

/** Luna runs without reasoning-token allocation for every Dumgen request. */
export const DUMGEN_REASONING_EFFORT = "none" as const;

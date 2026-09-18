/** A link's hue feeds its text, focus indicator, underline, and quote rule. */
export const linkToneClasses = {
	default: "",
	feminine: "[--link:var(--gender-feminine)]",
	masculine: "[--link:var(--gender-masculine)]",
	neuter: "[--link:var(--gender-neuter)]",
} as const;

export type LinkTone = keyof typeof linkToneClasses;

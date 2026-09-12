import { z } from "zod";

const ANIM = z.literal("Anim");
const HUM = z.literal("Hum");
const INAN = z.literal("Inan");
const NHUM = z.literal("Nhum");

// Source: https://universaldependencies.org/u/feat/Animacy.html
export const AnimacySchema = z.enum([
	ANIM.value,
	HUM.value,
	INAN.value,
	NHUM.value,
]);
export const Animacy = AnimacySchema.enum;
export type Animacy = z.infer<typeof AnimacySchema>;

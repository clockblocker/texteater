import { z } from "zod";

const BANTU1 = z.literal("Bantu1"); // singular; persons
const BANTU2 = z.literal("Bantu2"); // plural; persons
const BANTU3 = z.literal("Bantu3"); // singular; plants, thin objects
const BANTU4 = z.literal("Bantu4"); // plural; plants, thin objects
const BANTU5 = z.literal("Bantu5"); // singular; fruits, round objects, paired things
const BANTU6 = z.literal("Bantu6"); // plural; fruits, round objects, paired things
const BANTU7 = z.literal("Bantu7"); // singular; things, diminutives
const BANTU8 = z.literal("Bantu8"); // plural; things, diminutives
const BANTU9 = z.literal("Bantu9"); // singular; animals, things
const BANTU10 = z.literal("Bantu10"); // plural; animals, things
const BANTU11 = z.literal("Bantu11"); // long thin objects, natural phenomena, abstracts
const BANTU12 = z.literal("Bantu12"); // singular; small things, diminutives
const BANTU13 = z.literal("Bantu13"); // plural or mass; small amount of mass
const BANTU14 = z.literal("Bantu14"); // plural; diminutives
const BANTU15 = z.literal("Bantu15"); // verbal nouns, infinitives
const BANTU16 = z.literal("Bantu16"); // definite location; close to something
const BANTU17 = z.literal("Bantu17"); // indefinite location, direction, movement
const BANTU18 = z.literal("Bantu18"); // definite location; inside something
const BANTU19 = z.literal("Bantu19"); // little bit of; pejorative plural
const BANTU20 = z.literal("Bantu20"); // singular; augmentatives
const BANTU21 = z.literal("Bantu21"); // singular; augmentatives, derogatives
const BANTU22 = z.literal("Bantu22"); // plural; augmentatives
const BANTU23 = z.literal("Bantu23"); // location with place names
const WOL1 = z.literal("Wol1"); // Wolof noun class 1/k; singular human
const WOL2 = z.literal("Wol2"); // Wolof noun class 2; plural human
const WOL3 = z.literal("Wol3"); // Wolof noun class 3/g; singular
const WOL4 = z.literal("Wol4"); // Wolof noun class 4/j; singular
const WOL5 = z.literal("Wol5"); // Wolof noun class 5/b; singular
const WOL6 = z.literal("Wol6"); // Wolof noun class 6/m; singular
const WOL7 = z.literal("Wol7"); // Wolof noun class 7/l; singular
const WOL8 = z.literal("Wol8"); // Wolof noun class 8/y; plural non-human
const WOL9 = z.literal("Wol9"); // Wolof noun class 9/s; singular
const WOL10 = z.literal("Wol10"); // Wolof noun class 10/w; singular
const WOL11 = z.literal("Wol11"); // Wolof noun class 11/f; location
const WOL12 = z.literal("Wol12"); // Wolof noun class 12/n; manner

// Source: https://universaldependencies.org/u/feat/NounClass.html
export const NounClassSchema = z.enum([
	BANTU1.value,
	BANTU2.value,
	BANTU3.value,
	BANTU4.value,
	BANTU5.value,
	BANTU6.value,
	BANTU7.value,
	BANTU8.value,
	BANTU9.value,
	BANTU10.value,
	BANTU11.value,
	BANTU12.value,
	BANTU13.value,
	BANTU14.value,
	BANTU15.value,
	BANTU16.value,
	BANTU17.value,
	BANTU18.value,
	BANTU19.value,
	BANTU20.value,
	BANTU21.value,
	BANTU22.value,
	BANTU23.value,
	WOL1.value,
	WOL2.value,
	WOL3.value,
	WOL4.value,
	WOL5.value,
	WOL6.value,
	WOL7.value,
	WOL8.value,
	WOL9.value,
	WOL10.value,
	WOL11.value,
	WOL12.value,
]);
export const NounClass = NounClassSchema.enum;
export type NounClass = z.infer<typeof NounClassSchema>;

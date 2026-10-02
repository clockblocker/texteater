import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Voice.html
export const VoiceSchema = z.enum([
	"Act", // active; actor-focus
	"Antip", // antipassive
	"Bfoc", // beneficiary-focus
	"Cau", // causative
	"Dir", // direct
	"Inv", // inverse
	"Lfoc", // location-focus
	"Mid", // middle
	"Pass", // passive; patient-focus
	"Rcp", // reciprocal
]);

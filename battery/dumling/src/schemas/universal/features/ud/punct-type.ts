import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/PunctType.html
export const PunctTypeSchema = z.enum([
	"Brck",
	"Colo",
	"Comm",
	"Dash",
	"Elip",
	"Excl",
	"Peri",
	"Qest",
	"Quot",
]);

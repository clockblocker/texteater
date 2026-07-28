import z from "zod";

const discourseFormulaRoles = [
	"Greeting",
	"Farewell",
	"Apology",
	"Thanks",
	"Acknowledgment",
	"Refusal",
	"Request",
	"Reaction",
	"Initiation",
	"Transition",
] as const;

export const DiscourseFormulaRole = z.enum(discourseFormulaRoles);
export type DiscourseFormulaRole = z.infer<typeof DiscourseFormulaRole>;

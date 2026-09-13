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

export const DiscourseFormulaRole = discourseFormulaRoles;
export type DiscourseFormulaRole = (typeof DiscourseFormulaRole)[number];

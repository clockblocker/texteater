/** Unit Kind and Language bound each private validation group. */
export function validationGroup(root: string): string {
	const [unit, language] = root.split("/");
	if (!unit || !language)
		throw new Error(`Invalid unit validation route: ${root}`);
	return `${unit}/${language}`;
}

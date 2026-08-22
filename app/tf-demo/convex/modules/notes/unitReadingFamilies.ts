const unitReadingFamilies = new Set(["Lexeme", "Phraseme", "Morpheme"]);

export function isUnitReadingFamily(family: string): boolean {
	return unitReadingFamilies.has(family);
}

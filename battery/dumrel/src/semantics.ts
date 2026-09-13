export function normalizeText(value: string): string {
	return value.trim().normalize("NFC");
}

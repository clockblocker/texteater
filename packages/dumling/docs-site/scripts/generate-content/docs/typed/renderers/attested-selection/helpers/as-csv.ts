export function asCsvValue(value: string): string {
	return /[",\n\r]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

import { z } from "zod";

function normalizeNfc(value: string) {
	return value.normalize("NFC");
}

function normalizeNfcLowercase(value: string) {
	return normalizeNfc(value).toLowerCase();
}

export function normalizedStringSchema() {
	return z.string().min(1).overwrite(normalizeNfc);
}

export function normalizedLowercaseStringSchema() {
	return z.string().min(1).overwrite(normalizeNfcLowercase);
}

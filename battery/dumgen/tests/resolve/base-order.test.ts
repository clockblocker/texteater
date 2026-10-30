import { expect, test } from "bun:test";
import { baseOrderSurface } from "../../src/resolve/de/open-route/base-order.js";

const finite = { verbForm: "Fin", mood: "Ind", tense: "Pres" };

/** The base-order form of words in sentence order; `aux` marks a judged auxiliary. */
function form(
	canonicalForm: string,
	words: string,
	options: {
		readonly prefix?: string;
		readonly locution?: boolean;
		readonly features?: Readonly<Record<string, unknown>>;
		readonly expletive?: boolean;
		readonly aux?: readonly string[];
	} = {},
): string {
	return baseOrderSurface({
		canonicalForm,
		separablePrefix: options.prefix,
		locution: options.locution ?? false,
		inflection: { ...finite, ...options.features },
		words: words.split(" ").map((text) => ({
			text,
			auxiliary: options.aux?.includes(text) ?? false,
		})),
		expletive: options.expletive ?? false,
	});
}

test("a Lexeme's verbal complex stands last in subordinate order", () => {
	expect(form("anfangen", "fängt an", { prefix: "an" })).toBe("anfängt");
	expect(form("leidtun", "Tut leid", { prefix: "leid" })).toBe("leidtut");
	expect(form("übrig bleiben", "blieb übrig", { prefix: "übrig" })).toBe(
		"übrig blieb",
	);
	expect(
		form("sprechen", "hat gesprochen", { features: { perfect: "Yes" } }),
	).toBe("gesprochen hat");
	expect(
		form("verschiffen", "war verschifft worden", {
			features: { perfect: "Yes", voice: "Pass", passive: "Process" },
		}),
	).toBe("verschifft worden war");
	expect(
		form("liefern", "bekommt geliefert", {
			features: { voice: "Pass", passive: "Recipient" },
			aux: ["bekommt"],
		}),
	).toBe("geliefert bekommt");
	expect(
		form("reparieren", "hat reparieren lassen", {
			features: { perfect: "Yes", voice: "Cau" },
			aux: ["hat", "lassen"],
		}),
	).toBe("hat reparieren lassen");
	expect(form("müssen", "hat müssen", { features: { perfect: "Yes" } })).toBe(
		"hat müssen",
	);
	expect(
		form("regnen", "regnet", {
			features: { expletive: "Subject" },
			expletive: true,
		}),
	).toBe("es regnet");
});

test("a Locution's fixed words keep its Canonical Form's order, whatever the sentence's", () => {
	const options = { locution: true, features: { tense: "Past" } };
	expect(form("mit zu tun haben", "hatte damit zu tun", options)).toBe(
		"mit zu tun hatte",
	);
	expect(form("mit zu tun haben", "Damit hatte zu tun", options)).toBe(
		"mit zu tun hatte",
	);
	expect(
		form("einen Bären aufbinden", "bindet einen Bären auf", options),
	).toBe("einen Bären aufbindet");
	expect(form("nichts dafür können", "Da kann nichts für", options)).toBe(
		"nichts dafür kann",
	);
	expect(
		form(
			"den Nagel auf den Kopf treffen",
			"wurde der Nagel auf den Kopf getroffen",
			{
				locution: true,
				features: { voice: "Pass", passive: "Process" },
			},
		),
	).toBe("der Nagel auf den Kopf getroffen wurde");
});

test("an imperative, and a Canonical Form whose last word is no verb, keep their order", () => {
	expect(
		form("hereinkommen", "komm herein", {
			prefix: "herein",
			features: { mood: "Imp" },
		}),
	).toBe("komm herein");
	expect(
		form("frieren wie ein Schneider", "fror wie ein Schneider", {
			locution: true,
		}),
	).toBe("fror wie ein Schneider");
});

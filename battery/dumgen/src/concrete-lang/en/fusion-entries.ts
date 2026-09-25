import type {
	AbbreviationEntry,
	CliticEntry,
	FusionEntry,
	FusionTable,
} from "../../universal/fusion-table.js";

/**
 * English fusion Entries (Dumgen ADR 0004, issue 498): contractions as
 * clitics on a host, full entries for contractions whose host is mangled,
 * and the abbreviation table. Each piece is a word of its own (ADR 0035):
 * 'll is AUX will, n't is PART not, and possessive 's is its own PART 's,
 * which attaches to the whole phrase before it (the king of England's hat).
 */
const pronounHosts = [
	"i",
	"you",
	"he",
	"she",
	"it",
	"we",
	"they",
	"that",
	"there",
	"who",
	"what",
	"where",
	"when",
	"how",
	"here",
	"this",
];
const negatedHosts = [
	"do",
	"does",
	"did",
	"is",
	"are",
	"was",
	"were",
	"has",
	"have",
	"had",
	"will",
	"would",
	"should",
	"could",
	"must",
	"might",
	"need",
	"dare",
	"ought",
];

export const englishClitics: readonly CliticEntry[] = [
	{
		clitic: "'s",
		surface: ["is", "has", "'s"],
		role: ["Verb", "Verb", "Possessive"],
		attachment: "Attached",
		hosts: null,
		oneLiner:
			"'s is a shortened verb, \"is\" (it's late) or \"has\" (it's been a while), or the possessive 's, which belongs to the whole phrase before it (the king of England's hat); the sentence decides.",
		register: "Standard",
	},
	{
		clitic: "'",
		surface: "'s",
		role: "Possessive",
		attachment: "Attached",
		hosts: null,
		oneLiner:
			"' after a plural in -s is the possessive 's (the boys' room).",
		register: "Standard",
	},
	{
		clitic: "'m",
		surface: "am",
		role: "Verb",
		attachment: "Attached",
		hosts: ["i"],
		oneLiner: "'m is the shortened verb \"am\" (I'm here).",
		register: "Standard",
	},
	{
		clitic: "'re",
		surface: "are",
		role: "Verb",
		attachment: "Attached",
		hosts: ["you", "we", "they", "who", "what", "there", "here"],
		oneLiner: "'re is the shortened verb \"are\" (we're ready).",
		register: "Standard",
	},
	{
		clitic: "'ve",
		surface: "have",
		role: "Verb",
		attachment: "Attached",
		hosts: [
			"i",
			"you",
			"we",
			"they",
			"who",
			"would",
			"should",
			"could",
			"might",
			"must",
		],
		oneLiner:
			"'ve is the shortened verb \"have\" (they've left, would've gone).",
		register: "Standard",
	},
	{
		clitic: "'ll",
		surface: "will",
		role: "Verb",
		attachment: "Attached",
		hosts: [...pronounHosts],
		oneLiner: "'ll is the shortened auxiliary \"will\" (she'll call).",
		register: "Standard",
	},
	{
		clitic: "'d",
		surface: ["had", "would"],
		role: "Verb",
		attachment: "Attached",
		hosts: [...pronounHosts],
		oneLiner:
			'\'d is a shortened verb: "had" (she\'d left) or "would" (she\'d like); the sentence decides.',
		register: "Standard",
	},
	{
		clitic: "n't",
		surface: "not",
		role: "Negation",
		attachment: "Attached",
		hosts: negatedHosts,
		oneLiner:
			"n't is the particle \"not\", shortened onto a helping verb (isn't, didn't).",
		register: "Standard",
	},
];

const whole = (
	form: string,
	components: FusionEntry["components"],
	oneLiner: string,
	register: FusionEntry["register"] = "Standard",
): FusionEntry => ({ form, components, oneLiner, register });

/** Contractions whose host letters differ from the full word, and apostrophe-free fusions. */
export const englishFusions: readonly FusionEntry[] = [
	whole(
		"won't",
		[
			{ span: "wo", surface: "will", role: "Verb" },
			{ span: "n't", surface: "not", role: "Negation" },
		],
		'won\'t is "will not"; the host is spelled wo, not will.',
	),
	whole(
		"can't",
		[
			{ span: "ca", surface: "can", role: "Verb" },
			{ span: "n't", surface: "not", role: "Negation" },
		],
		'can\'t is "cannot"; the host drops its final n.',
	),
	whole(
		"shan't",
		[
			{ span: "sha", surface: "shall", role: "Verb" },
			{ span: "n't", surface: "not", role: "Negation" },
		],
		'shan\'t is "shall not"; the host drops its final ll.',
	),
	whole(
		"ain't",
		[
			{
				span: "ai",
				surface: ["am", "is", "are", "has", "have"],
				role: "Verb",
			},
			{ span: "n't", surface: "not", role: "Negation" },
		],
		'ain\'t stands for "am not", "is not", "are not", "has not" or "have not"; the sentence decides.',
		"Colloquial",
	),
	whole(
		"cannot",
		[
			{ span: "can", surface: "can", role: "Verb" },
			{ span: "not", surface: "not", role: "Negation" },
		],
		'cannot is "can" and "not" written as one word.',
	),
	whole(
		"let's",
		[
			{ span: "let", surface: "let", role: "Verb" },
			{ span: "'s", surface: "us", role: "Pronoun" },
		],
		"let's is \"let us\", used for a suggestion (let's go).",
	),
	whole(
		"y'all",
		[
			{ span: "y'", surface: "you", role: "Pronoun" },
			{ span: "all", surface: "all", role: "Host" },
		],
		'y\'all is "you all", a Southern US plural you.',
		"Dialect",
	),
	whole(
		"gonna",
		[
			{ span: "gon", surface: "going", role: "Verb" },
			{ span: "na", surface: "to", role: "Host" },
		],
		'gonna is spoken "going to" (I\'m gonna leave).',
		"Colloquial",
	),
	whole(
		"wanna",
		[
			{ span: "wan", surface: "want", role: "Verb" },
			{ span: "na", surface: "to", role: "Host" },
		],
		'wanna is spoken "want to" (I wanna go).',
		"Colloquial",
	),
	whole(
		"gotta",
		[
			{ span: "got", surface: "got", role: "Verb" },
			{ span: "ta", surface: "to", role: "Host" },
		],
		'gotta is spoken "got to" (I gotta run).',
		"Colloquial",
	),
];

const abbreviation = (
	text: string,
	surface: AbbreviationEntry["surface"],
	kind: string | null,
	oneLiner: string,
): AbbreviationEntry => ({ text, surface, kind, oneLiner });

export const englishAbbreviations: readonly AbbreviationEntry[] = [
	abbreviation(
		"etc.",
		"et cetera",
		"ADV",
		'etc. stands for "et cetera": and so on.',
	),
	abbreviation(
		"e.g.",
		"for example",
		"ADV",
		"e.g. stands for Latin exempli gratia: for example.",
	),
	abbreviation(
		"i.e.",
		"that is",
		"ADV",
		"i.e. stands for Latin id est: that is, in other words.",
	),
	abbreviation(
		"cf.",
		"compare",
		"VERB",
		"cf. stands for Latin confer: compare.",
	),
	abbreviation("vs.", "versus", "ADP", 'vs. stands for "versus": against.'),
	abbreviation(
		"approx.",
		"approximately",
		"ADV",
		'approx. stands for "approximately".',
	),
	abbreviation("Mr.", "Mister", "NOUN", 'Mr. is the title "Mister".'),
	abbreviation(
		"Mrs.",
		"Missus",
		"NOUN",
		'Mrs. is the title for a married woman, said "missus".',
	),
	abbreviation(
		"Ms.",
		"Miz",
		"NOUN",
		"Ms. is a title for a woman that does not state marital status.",
	),
	abbreviation("Dr.", "Doctor", "NOUN", 'Dr. is the title "Doctor".'),
	abbreviation(
		"Prof.",
		"Professor",
		"NOUN",
		'Prof. is the title "Professor".',
	),
	abbreviation(
		"St.",
		["Saint", "Street"],
		"NOUN",
		'St. stands for "Saint" before a name or "Street" after one; the sentence decides.',
	),
	abbreviation("No.", "Number", "NOUN", 'No. stands for "Number".'),
	abbreviation(
		"Jr.",
		"Junior",
		"NOUN",
		'Jr. stands for "Junior" after a name.',
	),
	abbreviation(
		"Sr.",
		"Senior",
		"NOUN",
		'Sr. stands for "Senior" after a name.',
	),
	abbreviation(
		"Inc.",
		"Incorporated",
		"NOUN",
		'Inc. stands for "Incorporated" after a company name.',
	),
	abbreviation(
		"Ltd.",
		"Limited",
		"NOUN",
		'Ltd. stands for "Limited" after a company name.',
	),
	abbreviation(
		"a.m.",
		"ante meridiem",
		"ADV",
		"a.m. stands for Latin ante meridiem: before noon.",
	),
	abbreviation(
		"p.m.",
		"post meridiem",
		"ADV",
		"p.m. stands for Latin post meridiem: after noon.",
	),
];

export const englishFusionTable: FusionTable = {
	language: "en",
	fusions: englishFusions,
	clitics: englishClitics,
	abbreviations: englishAbbreviations,
};

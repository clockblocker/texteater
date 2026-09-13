// Generated from canonical Zod unit schemas. Run bun run generate.
export interface UnitMap {
	"de/Construction/Fusion": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Construction";
			kind: "Fusion";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Construction";
				kind: "Fusion";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Construction";
				kind: "Fusion";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Construction";
					kind: "Fusion";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/ADJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "ADJ";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				foreign: "Yes" | null;
				numType: ("Card" | "Ord") | null;
				variant: "Short" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					numType: ("Card" | "Ord") | null;
					variant: "Short" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				degree: ("Cmp" | "Pos" | "Sup") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					numType: ("Card" | "Ord") | null;
					variant: "Short" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "ADJ";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						foreign: "Yes" | null;
						numType: ("Card" | "Ord") | null;
						variant: "Short" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					degree: ("Cmp" | "Pos" | "Sup") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/ADP": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "ADP";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				adpType: ("Circ" | "Post" | "Prep") | null;
				extPos: ("ADV" | "SCONJ") | null;
				foreign: "Yes" | null;
				governedCase:
					| (
							| "Acc"
							| "Abe"
							| "Ben"
							| "Cau"
							| "Cmp"
							| "Cns"
							| "Com"
							| "Dat"
							| "Dis"
							| "Equ"
							| "Gen"
							| "Ins"
							| "Par"
							| "Tem"
							| "Abl"
							| "Add"
							| "Ade"
							| "All"
							| "Del"
							| "Ela"
							| "Ess"
							| "Ill"
							| "Ine"
							| "Lat"
							| "Loc"
							| "Nom"
							| "Per"
							| "Sbe"
							| "Sbl"
							| "Spl"
							| "Sub"
							| "Sup"
							| "Ter"
					  )
					| null;
				partType: "Vbp" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					adpType: ("Circ" | "Post" | "Prep") | null;
					extPos: ("ADV" | "SCONJ") | null;
					foreign: "Yes" | null;
					governedCase:
						| (
								| "Acc"
								| "Abe"
								| "Ben"
								| "Cau"
								| "Cmp"
								| "Cns"
								| "Com"
								| "Dat"
								| "Dis"
								| "Equ"
								| "Gen"
								| "Ins"
								| "Par"
								| "Tem"
								| "Abl"
								| "Add"
								| "Ade"
								| "All"
								| "Del"
								| "Ela"
								| "Ess"
								| "Ill"
								| "Ine"
								| "Lat"
								| "Loc"
								| "Nom"
								| "Per"
								| "Sbe"
								| "Sbl"
								| "Spl"
								| "Sub"
								| "Sup"
								| "Ter"
						  )
						| null;
					partType: "Vbp" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					adpType: ("Circ" | "Post" | "Prep") | null;
					extPos: ("ADV" | "SCONJ") | null;
					foreign: "Yes" | null;
					governedCase:
						| (
								| "Acc"
								| "Abe"
								| "Ben"
								| "Cau"
								| "Cmp"
								| "Cns"
								| "Com"
								| "Dat"
								| "Dis"
								| "Equ"
								| "Gen"
								| "Ins"
								| "Par"
								| "Tem"
								| "Abl"
								| "Add"
								| "Ade"
								| "All"
								| "Del"
								| "Ela"
								| "Ess"
								| "Ill"
								| "Ine"
								| "Lat"
								| "Loc"
								| "Nom"
								| "Per"
								| "Sbe"
								| "Sbl"
								| "Spl"
								| "Sub"
								| "Sup"
								| "Ter"
						  )
						| null;
					partType: "Vbp" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "ADP";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						adpType: ("Circ" | "Post" | "Prep") | null;
						extPos: ("ADV" | "SCONJ") | null;
						foreign: "Yes" | null;
						governedCase:
							| (
									| "Acc"
									| "Abe"
									| "Ben"
									| "Cau"
									| "Cmp"
									| "Cns"
									| "Com"
									| "Dat"
									| "Dis"
									| "Equ"
									| "Gen"
									| "Ins"
									| "Par"
									| "Tem"
									| "Abl"
									| "Add"
									| "Ade"
									| "All"
									| "Del"
									| "Ela"
									| "Ess"
									| "Ill"
									| "Ine"
									| "Lat"
									| "Loc"
									| "Nom"
									| "Per"
									| "Sbe"
									| "Sbl"
									| "Spl"
									| "Sub"
									| "Sup"
									| "Ter"
							  )
							| null;
						partType: "Vbp" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/ADV": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "ADV";
			canonicalForm: string;
			coreFeatures: {
				foreign: "Yes" | null;
				numType: ("Card" | "Mult") | null;
				pronType: ("Dem" | "Ind" | "Int" | "Neg" | "Rel") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: {
					foreign: "Yes" | null;
					numType: ("Card" | "Mult") | null;
					pronType: ("Dem" | "Ind" | "Int" | "Neg" | "Rel") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				degree: ("Cmp" | "Pos" | "Sup") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: {
					foreign: "Yes" | null;
					numType: ("Card" | "Mult") | null;
					pronType: ("Dem" | "Ind" | "Int" | "Neg" | "Rel") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "ADV";
					canonicalForm: string;
					coreFeatures: {
						foreign: "Yes" | null;
						numType: ("Card" | "Mult") | null;
						pronType:
							| ("Dem" | "Ind" | "Int" | "Neg" | "Rel")
							| null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					degree: ("Cmp" | "Pos" | "Sup") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/AUX": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "AUX";
			canonicalForm: string;
			coreFeatures: { verbType: "Mod" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "AUX";
				canonicalForm: string;
				coreFeatures: { verbType: "Mod" | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures:
				| (
						| {
								number: ("Plur" | "Sing") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: null;
								voice: "Pass" | null;
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								voice: "Pass" | null;
						  }
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								voice: "Pass" | null;
						  }
						| {
								mood: null;
								number: ("Plur" | "Sing") | null;
								person: null;
								tense: null;
								verbForm: "Inf";
								voice: "Pass" | null;
						  }
						| {
								aspect: "Perf" | null;
								gender: ("Fem" | "Masc" | "Neut") | null;
								mood: null;
								number: ("Plur" | "Sing") | null;
								person: null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Part";
								voice: "Pass" | null;
						  }
				  )
				| null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "AUX";
				canonicalForm: string;
				coreFeatures: { verbType: "Mod" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "AUX";
					canonicalForm: string;
					coreFeatures: { verbType: "Mod" | null };
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures:
					| (
							| {
									number: ("Plur" | "Sing") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: null;
									voice: "Pass" | null;
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									voice: "Pass" | null;
							  }
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									voice: "Pass" | null;
							  }
							| {
									mood: null;
									number: ("Plur" | "Sing") | null;
									person: null;
									tense: null;
									verbForm: "Inf";
									voice: "Pass" | null;
							  }
							| {
									aspect: "Perf" | null;
									gender: ("Fem" | "Masc" | "Neut") | null;
									mood: null;
									number: ("Plur" | "Sing") | null;
									person: null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Part";
									voice: "Pass" | null;
							  }
					  )
					| null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/CCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "CCONJ";
			canonicalForm: string;
			coreFeatures: { conjType: "Comp" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "CCONJ";
				canonicalForm: string;
				coreFeatures: { conjType: "Comp" | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "CCONJ";
				canonicalForm: string;
				coreFeatures: { conjType: "Comp" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "CCONJ";
					canonicalForm: string;
					coreFeatures: { conjType: "Comp" | null };
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/DET": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "DET";
			canonicalForm: string;
			coreFeatures: {
				definite: ("Def" | "Ind") | null;
				extPos: ("ADV" | "DET") | null;
				foreign: "Yes" | null;
				numType: ("Card" | "Ord") | null;
				person: ("1" | "2" | "3") | null;
				polite: ("Form" | "Infm") | null;
				poss: "Yes" | null;
				pronType:
					| (
							| "Art"
							| "Dem"
							| "Emp"
							| "Exc"
							| "Ind"
							| "Int"
							| "Neg"
							| "Prs"
							| "Rel"
							| "Tot"
					  )
					| null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: {
					definite: ("Def" | "Ind") | null;
					extPos: ("ADV" | "DET") | null;
					foreign: "Yes" | null;
					numType: ("Card" | "Ord") | null;
					person: ("1" | "2" | "3") | null;
					polite: ("Form" | "Infm") | null;
					poss: "Yes" | null;
					pronType:
						| (
								| "Art"
								| "Dem"
								| "Emp"
								| "Exc"
								| "Ind"
								| "Int"
								| "Neg"
								| "Prs"
								| "Rel"
								| "Tot"
						  )
						| null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				degree: ("Cmp" | "Pos" | "Sup") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				"gender[psor]":
					| (
							| ("Fem" | "Masc" | "Neut")
							| [
									"Fem" | "Masc" | "Neut",
									...Array<"Fem" | "Masc" | "Neut">,
							  ]
					  )
					| null;
				number: ("Plur" | "Sing") | null;
				"number[psor]": ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: {
					definite: ("Def" | "Ind") | null;
					extPos: ("ADV" | "DET") | null;
					foreign: "Yes" | null;
					numType: ("Card" | "Ord") | null;
					person: ("1" | "2" | "3") | null;
					polite: ("Form" | "Infm") | null;
					poss: "Yes" | null;
					pronType:
						| (
								| "Art"
								| "Dem"
								| "Emp"
								| "Exc"
								| "Ind"
								| "Int"
								| "Neg"
								| "Prs"
								| "Rel"
								| "Tot"
						  )
						| null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "DET";
					canonicalForm: string;
					coreFeatures: {
						definite: ("Def" | "Ind") | null;
						extPos: ("ADV" | "DET") | null;
						foreign: "Yes" | null;
						numType: ("Card" | "Ord") | null;
						person: ("1" | "2" | "3") | null;
						polite: ("Form" | "Infm") | null;
						poss: "Yes" | null;
						pronType:
							| (
									| "Art"
									| "Dem"
									| "Emp"
									| "Exc"
									| "Ind"
									| "Int"
									| "Neg"
									| "Prs"
									| "Rel"
									| "Tot"
							  )
							| null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					degree: ("Cmp" | "Pos" | "Sup") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					"gender[psor]":
						| (
								| ("Fem" | "Masc" | "Neut")
								| [
										"Fem" | "Masc" | "Neut",
										...Array<"Fem" | "Masc" | "Neut">,
								  ]
						  )
						| null;
					number: ("Plur" | "Sing") | null;
					"number[psor]": ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/INTJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "INTJ";
			canonicalForm: string;
			coreFeatures: { partType: "Res" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: { partType: "Res" | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: { partType: "Res" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "INTJ";
					canonicalForm: string;
					coreFeatures: { partType: "Res" | null };
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/NOUN": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "NOUN";
			canonicalForm: string;
			coreFeatures: {
				gender: ("Fem" | "Masc" | "Neut") | null;
				hyph: "Yes" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: {
					gender: ("Fem" | "Masc" | "Neut") | null;
					hyph: "Yes" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: {
					gender: ("Fem" | "Masc" | "Neut") | null;
					hyph: "Yes" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "NOUN";
					canonicalForm: string;
					coreFeatures: {
						gender: ("Fem" | "Masc" | "Neut") | null;
						hyph: "Yes" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/NUM": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "NUM";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				foreign: "Yes" | null;
				numType: ("Card" | "Frac" | "Mult" | "Range") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "NUM";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					numType: ("Card" | "Frac" | "Mult" | "Range") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "NUM";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					numType: ("Card" | "Frac" | "Mult" | "Range") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "NUM";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						foreign: "Yes" | null;
						numType: ("Card" | "Frac" | "Mult" | "Range") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/X": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "X";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				foreign: "Yes" | null;
				hyph: "Yes" | null;
				numType: ("Card" | "Mult" | "Range") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "X";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					hyph: "Yes" | null;
					numType: ("Card" | "Mult" | "Range") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				mood: ("Imp" | "Ind" | "Sub") | null;
				number: ("Plur" | "Sing") | null;
				verbForm: ("Fin" | "Inf" | "Part") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "X";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					hyph: "Yes" | null;
					numType: ("Card" | "Mult" | "Range") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "X";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						foreign: "Yes" | null;
						hyph: "Yes" | null;
						numType: ("Card" | "Mult" | "Range") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					mood: ("Imp" | "Ind" | "Sub") | null;
					number: ("Plur" | "Sing") | null;
					verbForm: ("Fin" | "Inf" | "Part") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/PART": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "PART";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				foreign: "Yes" | null;
				partType: "Inf" | null;
				polarity: ("Neg" | "Pos") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PART";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					partType: "Inf" | null;
					polarity: ("Neg" | "Pos") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PART";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					partType: "Inf" | null;
					polarity: ("Neg" | "Pos") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "PART";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						foreign: "Yes" | null;
						partType: "Inf" | null;
						polarity: ("Neg" | "Pos") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/PRON": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "PRON";
			canonicalForm: string;
			coreFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				number: ("Plur" | "Sing") | null;
				"gender[psor]": ("Fem" | "Masc" | "Neut") | null;
				extPos: "DET" | null;
				foreign: "Yes" | null;
				person: ("1" | "2" | "3") | null;
				polite: ("Form" | "Infm") | null;
				poss: "Yes" | null;
				pronType:
					| (
							| "Dem"
							| "Ind"
							| "Int"
							| "Neg"
							| "Prs"
							| "Rcp"
							| "Rel"
							| "Tot"
					  )
					| null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				referenceNumber: ("Plur" | "Sing") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					number: ("Plur" | "Sing") | null;
					"gender[psor]": ("Fem" | "Masc" | "Neut") | null;
					extPos: "DET" | null;
					foreign: "Yes" | null;
					person: ("1" | "2" | "3") | null;
					polite: ("Form" | "Infm") | null;
					poss: "Yes" | null;
					pronType:
						| (
								| "Dem"
								| "Ind"
								| "Int"
								| "Neg"
								| "Prs"
								| "Rcp"
								| "Rel"
								| "Tot"
						  )
						| null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					referenceNumber: ("Plur" | "Sing") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: { reflex: "Yes" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					number: ("Plur" | "Sing") | null;
					"gender[psor]": ("Fem" | "Masc" | "Neut") | null;
					extPos: "DET" | null;
					foreign: "Yes" | null;
					person: ("1" | "2" | "3") | null;
					polite: ("Form" | "Infm") | null;
					poss: "Yes" | null;
					pronType:
						| (
								| "Dem"
								| "Ind"
								| "Int"
								| "Neg"
								| "Prs"
								| "Rcp"
								| "Rel"
								| "Tot"
						  )
						| null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					referenceNumber: ("Plur" | "Sing") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "PRON";
					canonicalForm: string;
					coreFeatures: {
						case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
						number: ("Plur" | "Sing") | null;
						"gender[psor]": ("Fem" | "Masc" | "Neut") | null;
						extPos: "DET" | null;
						foreign: "Yes" | null;
						person: ("1" | "2" | "3") | null;
						polite: ("Form" | "Infm") | null;
						poss: "Yes" | null;
						pronType:
							| (
									| "Dem"
									| "Ind"
									| "Int"
									| "Neg"
									| "Prs"
									| "Rcp"
									| "Rel"
									| "Tot"
							  )
							| null;
						gender: ("Fem" | "Masc" | "Neut") | null;
						referenceNumber: ("Plur" | "Sing") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: { reflex: "Yes" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/PROPN": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "PROPN";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				foreign: "Yes" | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PROPN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PROPN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "PROPN";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						foreign: "Yes" | null;
						gender: ("Fem" | "Masc" | "Neut") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/PUNCT": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "PUNCT";
			canonicalForm: string;
			coreFeatures: {
				punctType:
					| (
							| "Brck"
							| "Colo"
							| "Comm"
							| "Dash"
							| "Elip"
							| "Excl"
							| "Peri"
							| "Qest"
							| "Quot"
					  )
					| null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PUNCT";
				canonicalForm: string;
				coreFeatures: {
					punctType:
						| (
								| "Brck"
								| "Colo"
								| "Comm"
								| "Dash"
								| "Elip"
								| "Excl"
								| "Peri"
								| "Qest"
								| "Quot"
						  )
						| null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "PUNCT";
				canonicalForm: string;
				coreFeatures: {
					punctType:
						| (
								| "Brck"
								| "Colo"
								| "Comm"
								| "Dash"
								| "Elip"
								| "Excl"
								| "Peri"
								| "Qest"
								| "Quot"
						  )
						| null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "PUNCT";
					canonicalForm: string;
					coreFeatures: {
						punctType:
							| (
									| "Brck"
									| "Colo"
									| "Comm"
									| "Dash"
									| "Elip"
									| "Excl"
									| "Peri"
									| "Qest"
									| "Quot"
							  )
							| null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/SCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "SCONJ";
			canonicalForm: string;
			coreFeatures: { conjType: "Comp" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: { conjType: "Comp" | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: { conjType: "Comp" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "SCONJ";
					canonicalForm: string;
					coreFeatures: { conjType: "Comp" | null };
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/SYM": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "SYM";
			canonicalForm: string;
			coreFeatures: {
				foreign: "Yes" | null;
				numType: ("Card" | "Range") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "SYM";
				canonicalForm: string;
				coreFeatures: {
					foreign: "Yes" | null;
					numType: ("Card" | "Range") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "SYM";
				canonicalForm: string;
				coreFeatures: {
					foreign: "Yes" | null;
					numType: ("Card" | "Range") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "SYM";
					canonicalForm: string;
					coreFeatures: {
						foreign: "Yes" | null;
						numType: ("Card" | "Range") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Dat" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Lexeme/VERB": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Lexeme";
			kind: "VERB";
			canonicalForm: string;
			coreFeatures: {
				hasGovPrep: string | null;
				hasSepPrefix: string | null;
				lexicallyReflexive: "Yes" | null;
				verbType: "Mod" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: {
					hasGovPrep: string | null;
					hasSepPrefix: string | null;
					lexicallyReflexive: "Yes" | null;
					verbType: "Mod" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures:
				| (
						| {
								number: ("Plur" | "Sing") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: null;
								voice: "Pass" | null;
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								voice: "Pass" | null;
						  }
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								voice: "Pass" | null;
						  }
						| {
								mood: null;
								number: ("Plur" | "Sing") | null;
								person: null;
								tense: null;
								verbForm: "Inf";
								voice: "Pass" | null;
						  }
						| {
								aspect: "Perf" | null;
								gender: ("Fem" | "Masc" | "Neut") | null;
								mood: null;
								number: ("Plur" | "Sing") | null;
								person: null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Part";
								voice: "Pass" | null;
						  }
				  )
				| null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Lexeme";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: {
					hasGovPrep: string | null;
					hasSepPrefix: string | null;
					lexicallyReflexive: "Yes" | null;
					verbType: "Mod" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Lexeme";
					kind: "VERB";
					canonicalForm: string;
					coreFeatures: {
						hasGovPrep: string | null;
						hasSepPrefix: string | null;
						lexicallyReflexive: "Yes" | null;
						verbType: "Mod" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures:
					| (
							| {
									number: ("Plur" | "Sing") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: null;
									voice: "Pass" | null;
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									voice: "Pass" | null;
							  }
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									voice: "Pass" | null;
							  }
							| {
									mood: null;
									number: ("Plur" | "Sing") | null;
									person: null;
									tense: null;
									verbForm: "Inf";
									voice: "Pass" | null;
							  }
							| {
									aspect: "Perf" | null;
									gender: ("Fem" | "Masc" | "Neut") | null;
									mood: null;
									number: ("Plur" | "Sing") | null;
									person: null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Part";
									voice: "Pass" | null;
							  }
					  )
					| null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Circumfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Circumfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Circumfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Circumfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Circumfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Clitic": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Clitic";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Clitic";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Clitic";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Clitic";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Duplifix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Duplifix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Duplifix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Duplifix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Duplifix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Infix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Infix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Infix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Infix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Infix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Interfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Interfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Interfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Interfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Interfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Prefix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Prefix";
			canonicalForm: string;
			coreFeatures: { hasSepPrefix: string | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Prefix";
				canonicalForm: string;
				coreFeatures: { hasSepPrefix: string | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Prefix";
				canonicalForm: string;
				coreFeatures: { hasSepPrefix: string | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Prefix";
					canonicalForm: string;
					coreFeatures: { hasSepPrefix: string | null };
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Root": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Root";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Root";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Root";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Root";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Suffix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Suffix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Suffix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Suffix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Suffix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Suffixoid": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Suffixoid";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Suffixoid";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Suffixoid";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Suffixoid";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Morpheme/Transfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Morpheme";
			kind: "Transfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Transfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Morpheme";
				kind: "Transfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Morpheme";
					kind: "Transfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Phraseme/Aphorism": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Phraseme";
			kind: "Aphorism";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Phraseme";
				kind: "Aphorism";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Phraseme";
				kind: "Aphorism";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Phraseme";
					kind: "Aphorism";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Phraseme/Collocation": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Phraseme";
			kind: "Collocation";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Phraseme";
				kind: "Collocation";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures:
				| (
						| {
								number: ("Plur" | "Sing") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: null;
								voice: "Pass" | null;
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								voice: "Pass" | null;
						  }
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								voice: "Pass" | null;
						  }
						| {
								mood: null;
								number: ("Plur" | "Sing") | null;
								person: null;
								tense: null;
								verbForm: "Inf";
								voice: "Pass" | null;
						  }
						| {
								aspect: "Perf" | null;
								gender: ("Fem" | "Masc" | "Neut") | null;
								mood: null;
								number: ("Plur" | "Sing") | null;
								person: null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Part";
								voice: "Pass" | null;
						  }
				  )
				| null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Phraseme";
				kind: "Collocation";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Phraseme";
					kind: "Collocation";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures:
					| (
							| {
									number: ("Plur" | "Sing") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: null;
									voice: "Pass" | null;
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									voice: "Pass" | null;
							  }
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									voice: "Pass" | null;
							  }
							| {
									mood: null;
									number: ("Plur" | "Sing") | null;
									person: null;
									tense: null;
									verbForm: "Inf";
									voice: "Pass" | null;
							  }
							| {
									aspect: "Perf" | null;
									gender: ("Fem" | "Masc" | "Neut") | null;
									mood: null;
									number: ("Plur" | "Sing") | null;
									person: null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Part";
									voice: "Pass" | null;
							  }
					  )
					| null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Phraseme/DiscourseFormula": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Phraseme";
			kind: "DiscourseFormula";
			canonicalForm: string;
			coreFeatures: {
				discourseFormulaRole:
					| (
							| "Greeting"
							| "Farewell"
							| "Apology"
							| "Thanks"
							| "Acknowledgment"
							| "Refusal"
							| "Request"
							| "Reaction"
							| "Initiation"
							| "Transition"
					  )
					| null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Phraseme";
				kind: "DiscourseFormula";
				canonicalForm: string;
				coreFeatures: {
					discourseFormulaRole:
						| (
								| "Greeting"
								| "Farewell"
								| "Apology"
								| "Thanks"
								| "Acknowledgment"
								| "Refusal"
								| "Request"
								| "Reaction"
								| "Initiation"
								| "Transition"
						  )
						| null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Phraseme";
				kind: "DiscourseFormula";
				canonicalForm: string;
				coreFeatures: {
					discourseFormulaRole:
						| (
								| "Greeting"
								| "Farewell"
								| "Apology"
								| "Thanks"
								| "Acknowledgment"
								| "Refusal"
								| "Request"
								| "Reaction"
								| "Initiation"
								| "Transition"
						  )
						| null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Phraseme";
					kind: "DiscourseFormula";
					canonicalForm: string;
					coreFeatures: {
						discourseFormulaRole:
							| (
									| "Greeting"
									| "Farewell"
									| "Apology"
									| "Thanks"
									| "Acknowledgment"
									| "Refusal"
									| "Request"
									| "Reaction"
									| "Initiation"
									| "Transition"
							  )
							| null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Phraseme/Idiom": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Phraseme";
			kind: "Idiom";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Phraseme";
				kind: "Idiom";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures:
				| (
						| {
								number: ("Plur" | "Sing") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: null;
								voice: "Pass" | null;
						  }
						| {
								mood: "Imp";
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: null;
								verbForm: "Fin";
								voice: "Pass" | null;
						  }
						| {
								mood: ("Ind" | "Sub") | null;
								number: ("Plur" | "Sing") | null;
								person: ("1" | "2" | "3") | null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Fin";
								voice: "Pass" | null;
						  }
						| {
								mood: null;
								number: ("Plur" | "Sing") | null;
								person: null;
								tense: null;
								verbForm: "Inf";
								voice: "Pass" | null;
						  }
						| {
								aspect: "Perf" | null;
								gender: ("Fem" | "Masc" | "Neut") | null;
								mood: null;
								number: ("Plur" | "Sing") | null;
								person: null;
								tense: ("Past" | "Pres") | null;
								verbForm: "Part";
								voice: "Pass" | null;
						  }
				  )
				| null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Phraseme";
				kind: "Idiom";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Phraseme";
					kind: "Idiom";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures:
					| (
							| {
									number: ("Plur" | "Sing") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: null;
									voice: "Pass" | null;
							  }
							| {
									mood: "Imp";
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: null;
									verbForm: "Fin";
									voice: "Pass" | null;
							  }
							| {
									mood: ("Ind" | "Sub") | null;
									number: ("Plur" | "Sing") | null;
									person: ("1" | "2" | "3") | null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Fin";
									voice: "Pass" | null;
							  }
							| {
									mood: null;
									number: ("Plur" | "Sing") | null;
									person: null;
									tense: null;
									verbForm: "Inf";
									voice: "Pass" | null;
							  }
							| {
									aspect: "Perf" | null;
									gender: ("Fem" | "Masc" | "Neut") | null;
									mood: null;
									number: ("Plur" | "Sing") | null;
									person: null;
									tense: ("Past" | "Pres") | null;
									verbForm: "Part";
									voice: "Pass" | null;
							  }
					  )
					| null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"de/Phraseme/Proverb": {
		Lemma: {
			unitKind: "Lemma";
			language: "de";
			family: "Phraseme";
			kind: "Proverb";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "de";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Phraseme";
				kind: "Proverb";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "de";
				family: "Phraseme";
				kind: "Proverb";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "de";
				lemma: {
					unitKind: "Lemma";
					language: "de";
					family: "Phraseme";
					kind: "Proverb";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Construction/Fusion": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Construction";
			kind: "Fusion";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Construction";
				kind: "Fusion";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Construction";
				kind: "Fusion";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Construction";
					kind: "Fusion";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/ADJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "ADJ";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: ("ADP" | "ADV" | "SCONJ") | null;
				numForm: ("Combi" | "Word") | null;
				numType: ("Frac" | "Ord") | null;
				style: "Expr" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "ADV" | "SCONJ") | null;
					numForm: ("Combi" | "Word") | null;
					numType: ("Frac" | "Ord") | null;
					style: "Expr" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				degree: ("Cmp" | "Pos" | "Sup") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "ADV" | "SCONJ") | null;
					numForm: ("Combi" | "Word") | null;
					numType: ("Frac" | "Ord") | null;
					style: "Expr" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "ADJ";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: ("ADP" | "ADV" | "SCONJ") | null;
						numForm: ("Combi" | "Word") | null;
						numType: ("Frac" | "Ord") | null;
						style: "Expr" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					degree: ("Cmp" | "Pos" | "Sup") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/ADP": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "ADP";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: ("ADP" | "ADV" | "SCONJ") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "ADV" | "SCONJ") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "ADV" | "SCONJ") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "ADP";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: ("ADP" | "ADV" | "SCONJ") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/ADV": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "ADV";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: ("ADP" | "ADV" | "CCONJ" | "SCONJ") | null;
				numForm: "Word" | null;
				numType: ("Frac" | "Mult" | "Ord") | null;
				pronType:
					| (
							| ("Dem" | "Ind" | "Int" | "Neg" | "Rel" | "Tot")
							| [
									(
										| "Dem"
										| "Ind"
										| "Int"
										| "Neg"
										| "Rel"
										| "Tot"
									),
									...Array<
										| "Dem"
										| "Ind"
										| "Int"
										| "Neg"
										| "Rel"
										| "Tot"
									>,
							  ]
					  )
					| null;
				style: ("Expr" | "Slng") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "ADV" | "CCONJ" | "SCONJ") | null;
					numForm: "Word" | null;
					numType: ("Frac" | "Mult" | "Ord") | null;
					pronType:
						| (
								| (
										| "Dem"
										| "Ind"
										| "Int"
										| "Neg"
										| "Rel"
										| "Tot"
								  )
								| [
										(
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Rel"
											| "Tot"
										),
										...Array<
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Rel"
											| "Tot"
										>,
								  ]
						  )
						| null;
					style: ("Expr" | "Slng") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				degree: ("Cmp" | "Pos" | "Sup") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "ADV" | "CCONJ" | "SCONJ") | null;
					numForm: "Word" | null;
					numType: ("Frac" | "Mult" | "Ord") | null;
					pronType:
						| (
								| (
										| "Dem"
										| "Ind"
										| "Int"
										| "Neg"
										| "Rel"
										| "Tot"
								  )
								| [
										(
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Rel"
											| "Tot"
										),
										...Array<
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Rel"
											| "Tot"
										>,
								  ]
						  )
						| null;
					style: ("Expr" | "Slng") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "ADV";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: ("ADP" | "ADV" | "CCONJ" | "SCONJ") | null;
						numForm: "Word" | null;
						numType: ("Frac" | "Mult" | "Ord") | null;
						pronType:
							| (
									| (
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Rel"
											| "Tot"
									  )
									| [
											(
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Rel"
												| "Tot"
											),
											...Array<
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Rel"
												| "Tot"
											>,
									  ]
							  )
							| null;
						style: ("Expr" | "Slng") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					degree: ("Cmp" | "Pos" | "Sup") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/AUX": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "AUX";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				style: ("Arch" | "Vrnc") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "AUX";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					style: ("Arch" | "Vrnc") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				mood: ("Imp" | "Ind" | "Sub") | null;
				number: ("Plur" | "Sing") | null;
				person: ("1" | "2" | "3") | null;
				tense: ("Past" | "Pres") | null;
				verbForm: ("Fin" | "Inf" | "Part") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "AUX";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					style: ("Arch" | "Vrnc") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "AUX";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						style: ("Arch" | "Vrnc") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					mood: ("Imp" | "Ind" | "Sub") | null;
					number: ("Plur" | "Sing") | null;
					person: ("1" | "2" | "3") | null;
					tense: ("Past" | "Pres") | null;
					verbForm: ("Fin" | "Inf" | "Part") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/CCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "CCONJ";
			canonicalForm: string;
			coreFeatures: { abbr: "Yes" | null; polarity: "Neg" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "CCONJ";
				canonicalForm: string;
				coreFeatures: { abbr: "Yes" | null; polarity: "Neg" | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "CCONJ";
				canonicalForm: string;
				coreFeatures: { abbr: "Yes" | null; polarity: "Neg" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "CCONJ";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						polarity: "Neg" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/DET": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "DET";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				definite: ("Def" | "Ind") | null;
				extPos: ("ADV" | "PRON") | null;
				numForm: "Word" | null;
				numType: "Frac" | null;
				pronType:
					| (
							| (
									| "Art"
									| "Dem"
									| "Ind"
									| "Int"
									| "Neg"
									| "Rcp"
									| "Rel"
									| "Tot"
							  )
							| [
									(
										| "Art"
										| "Dem"
										| "Ind"
										| "Int"
										| "Neg"
										| "Rcp"
										| "Rel"
										| "Tot"
									),
									...Array<
										| "Art"
										| "Dem"
										| "Ind"
										| "Int"
										| "Neg"
										| "Rcp"
										| "Rel"
										| "Tot"
									>,
							  ]
					  )
					| null;
				style: "Vrnc" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					definite: ("Def" | "Ind") | null;
					extPos: ("ADV" | "PRON") | null;
					numForm: "Word" | null;
					numType: "Frac" | null;
					pronType:
						| (
								| (
										| "Art"
										| "Dem"
										| "Ind"
										| "Int"
										| "Neg"
										| "Rcp"
										| "Rel"
										| "Tot"
								  )
								| [
										(
											| "Art"
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Rcp"
											| "Rel"
											| "Tot"
										),
										...Array<
											| "Art"
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Rcp"
											| "Rel"
											| "Tot"
										>,
								  ]
						  )
						| null;
					style: "Vrnc" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: { number: ("Plur" | "Sing") | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					definite: ("Def" | "Ind") | null;
					extPos: ("ADV" | "PRON") | null;
					numForm: "Word" | null;
					numType: "Frac" | null;
					pronType:
						| (
								| (
										| "Art"
										| "Dem"
										| "Ind"
										| "Int"
										| "Neg"
										| "Rcp"
										| "Rel"
										| "Tot"
								  )
								| [
										(
											| "Art"
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Rcp"
											| "Rel"
											| "Tot"
										),
										...Array<
											| "Art"
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Rcp"
											| "Rel"
											| "Tot"
										>,
								  ]
						  )
						| null;
					style: "Vrnc" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "DET";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						definite: ("Def" | "Ind") | null;
						extPos: ("ADV" | "PRON") | null;
						numForm: "Word" | null;
						numType: "Frac" | null;
						pronType:
							| (
									| (
											| "Art"
											| "Dem"
											| "Ind"
											| "Int"
											| "Neg"
											| "Rcp"
											| "Rel"
											| "Tot"
									  )
									| [
											(
												| "Art"
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Rcp"
												| "Rel"
												| "Tot"
											),
											...Array<
												| "Art"
												| "Dem"
												| "Ind"
												| "Int"
												| "Neg"
												| "Rcp"
												| "Rel"
												| "Tot"
											>,
									  ]
							  )
							| null;
						style: "Vrnc" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/INTJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "INTJ";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				foreign: "Yes" | null;
				polarity: ("Neg" | "Pos") | null;
				style: "Expr" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					polarity: ("Neg" | "Pos") | null;
					style: "Expr" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					foreign: "Yes" | null;
					polarity: ("Neg" | "Pos") | null;
					style: "Expr" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "INTJ";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						foreign: "Yes" | null;
						polarity: ("Neg" | "Pos") | null;
						style: "Expr" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/NOUN": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "NOUN";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: ("ADV" | "PROPN") | null;
				foreign: "Yes" | null;
				numForm: ("Combi" | "Digit" | "Word") | null;
				numType: ("Card" | "Frac" | "Ord") | null;
				style: ("Expr" | "Vrnc") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADV" | "PROPN") | null;
					foreign: "Yes" | null;
					numForm: ("Combi" | "Digit" | "Word") | null;
					numType: ("Card" | "Frac" | "Ord") | null;
					style: ("Expr" | "Vrnc") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				number: ("Plur" | "Ptan" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADV" | "PROPN") | null;
					foreign: "Yes" | null;
					numForm: ("Combi" | "Digit" | "Word") | null;
					numType: ("Card" | "Frac" | "Ord") | null;
					style: ("Expr" | "Vrnc") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "NOUN";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: ("ADV" | "PROPN") | null;
						foreign: "Yes" | null;
						numForm: ("Combi" | "Digit" | "Word") | null;
						numType: ("Card" | "Frac" | "Ord") | null;
						style: ("Expr" | "Vrnc") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					number: ("Plur" | "Ptan" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/NUM": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "NUM";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: "PROPN" | null;
				numForm: ("Digit" | "Roman" | "Word") | null;
				numType: ("Card" | "Frac") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "NUM";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: "PROPN" | null;
					numForm: ("Digit" | "Roman" | "Word") | null;
					numType: ("Card" | "Frac") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "NUM";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: "PROPN" | null;
					numForm: ("Digit" | "Roman" | "Word") | null;
					numType: ("Card" | "Frac") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "NUM";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: "PROPN" | null;
						numForm: ("Digit" | "Roman" | "Word") | null;
						numType: ("Card" | "Frac") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/X": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "X";
			canonicalForm: string;
			coreFeatures: { extPos: "PROPN" | null; foreign: "Yes" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "X";
				canonicalForm: string;
				coreFeatures: { extPos: "PROPN" | null; foreign: "Yes" | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "X";
				canonicalForm: string;
				coreFeatures: { extPos: "PROPN" | null; foreign: "Yes" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "X";
					canonicalForm: string;
					coreFeatures: {
						extPos: "PROPN" | null;
						foreign: "Yes" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/PART": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "PART";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: "CCONJ" | null;
				polarity: "Neg" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "PART";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: "CCONJ" | null;
					polarity: "Neg" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "PART";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: "CCONJ" | null;
					polarity: "Neg" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "PART";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: "CCONJ" | null;
						polarity: "Neg" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/PRON": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "PRON";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: ("ADV" | "PRON") | null;
				person: ("1" | "2" | "3") | null;
				poss: "Yes" | null;
				pronType:
					| (
							| (
									| "Dem"
									| "Emp"
									| "Ind"
									| "Int"
									| "Neg"
									| "Prs"
									| "Rcp"
									| "Rel"
									| "Tot"
							  )
							| [
									(
										| "Dem"
										| "Emp"
										| "Ind"
										| "Int"
										| "Neg"
										| "Prs"
										| "Rcp"
										| "Rel"
										| "Tot"
									),
									...Array<
										| "Dem"
										| "Emp"
										| "Ind"
										| "Int"
										| "Neg"
										| "Prs"
										| "Rcp"
										| "Rel"
										| "Tot"
									>,
							  ]
					  )
					| null;
				style: ("Arch" | "Coll" | "Expr" | "Slng" | "Vrnc") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADV" | "PRON") | null;
					person: ("1" | "2" | "3") | null;
					poss: "Yes" | null;
					pronType:
						| (
								| (
										| "Dem"
										| "Emp"
										| "Ind"
										| "Int"
										| "Neg"
										| "Prs"
										| "Rcp"
										| "Rel"
										| "Tot"
								  )
								| [
										(
											| "Dem"
											| "Emp"
											| "Ind"
											| "Int"
											| "Neg"
											| "Prs"
											| "Rcp"
											| "Rel"
											| "Tot"
										),
										...Array<
											| "Dem"
											| "Emp"
											| "Ind"
											| "Int"
											| "Neg"
											| "Prs"
											| "Rcp"
											| "Rel"
											| "Tot"
										>,
								  ]
						  )
						| null;
					style: ("Arch" | "Coll" | "Expr" | "Slng" | "Vrnc") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				case: ("Acc" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
				reflex: "Yes" | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADV" | "PRON") | null;
					person: ("1" | "2" | "3") | null;
					poss: "Yes" | null;
					pronType:
						| (
								| (
										| "Dem"
										| "Emp"
										| "Ind"
										| "Int"
										| "Neg"
										| "Prs"
										| "Rcp"
										| "Rel"
										| "Tot"
								  )
								| [
										(
											| "Dem"
											| "Emp"
											| "Ind"
											| "Int"
											| "Neg"
											| "Prs"
											| "Rcp"
											| "Rel"
											| "Tot"
										),
										...Array<
											| "Dem"
											| "Emp"
											| "Ind"
											| "Int"
											| "Neg"
											| "Prs"
											| "Rcp"
											| "Rel"
											| "Tot"
										>,
								  ]
						  )
						| null;
					style: ("Arch" | "Coll" | "Expr" | "Slng" | "Vrnc") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "PRON";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: ("ADV" | "PRON") | null;
						person: ("1" | "2" | "3") | null;
						poss: "Yes" | null;
						pronType:
							| (
									| (
											| "Dem"
											| "Emp"
											| "Ind"
											| "Int"
											| "Neg"
											| "Prs"
											| "Rcp"
											| "Rel"
											| "Tot"
									  )
									| [
											(
												| "Dem"
												| "Emp"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
											),
											...Array<
												| "Dem"
												| "Emp"
												| "Ind"
												| "Int"
												| "Neg"
												| "Prs"
												| "Rcp"
												| "Rel"
												| "Tot"
											>,
									  ]
							  )
							| null;
						style:
							| ("Arch" | "Coll" | "Expr" | "Slng" | "Vrnc")
							| null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					case: ("Acc" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
					reflex: "Yes" | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/PROPN": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "PROPN";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: "PROPN" | null;
				style: "Expr" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "PROPN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: "PROPN" | null;
					style: "Expr" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				number: ("Plur" | "Ptan" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "PROPN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: "PROPN" | null;
					style: "Expr" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "PROPN";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: "PROPN" | null;
						style: "Expr" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					number: ("Plur" | "Ptan" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/PUNCT": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "PUNCT";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "PUNCT";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "PUNCT";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "PUNCT";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/SCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "SCONJ";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: ("ADP" | "SCONJ") | null;
				style: "Vrnc" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "SCONJ") | null;
					style: "Vrnc" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "SCONJ") | null;
					style: "Vrnc" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "SCONJ";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: ("ADP" | "SCONJ") | null;
						style: "Vrnc" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/SYM": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "SYM";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: ("ADP" | "PROPN") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "SYM";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "PROPN") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: { number: ("Plur" | "Sing") | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "SYM";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "PROPN") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "SYM";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: ("ADP" | "PROPN") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Lexeme/VERB": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Lexeme";
			kind: "VERB";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				extPos: ("ADP" | "CCONJ" | "PROPN") | null;
				hasGovPrep: string | null;
				phrasal: "Yes" | null;
				style: ("Expr" | "Vrnc") | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "CCONJ" | "PROPN") | null;
					hasGovPrep: string | null;
					phrasal: "Yes" | null;
					style: ("Expr" | "Vrnc") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				mood: ("Imp" | "Ind" | "Sub") | null;
				number: ("Plur" | "Sing") | null;
				person: ("1" | "2" | "3") | null;
				tense: ("Past" | "Pres") | null;
				verbForm: ("Fin" | "Ger" | "Inf" | "Part") | null;
				voice: "Pass" | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Lexeme";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					extPos: ("ADP" | "CCONJ" | "PROPN") | null;
					hasGovPrep: string | null;
					phrasal: "Yes" | null;
					style: ("Expr" | "Vrnc") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Lexeme";
					kind: "VERB";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						extPos: ("ADP" | "CCONJ" | "PROPN") | null;
						hasGovPrep: string | null;
						phrasal: "Yes" | null;
						style: ("Expr" | "Vrnc") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					mood: ("Imp" | "Ind" | "Sub") | null;
					number: ("Plur" | "Sing") | null;
					person: ("1" | "2" | "3") | null;
					tense: ("Past" | "Pres") | null;
					verbForm: ("Fin" | "Ger" | "Inf" | "Part") | null;
					voice: "Pass" | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/Circumfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "Circumfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Circumfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Circumfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "Circumfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/Clitic": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "Clitic";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Clitic";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Clitic";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "Clitic";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/Duplifix": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "Duplifix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Duplifix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Duplifix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "Duplifix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/Infix": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "Infix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Infix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Infix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "Infix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/Interfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "Interfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Interfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Interfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "Interfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/Prefix": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "Prefix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Prefix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Prefix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "Prefix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/Root": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "Root";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Root";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Root";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "Root";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/Suffix": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "Suffix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Suffix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Suffix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "Suffix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/Suffixoid": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "Suffixoid";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Suffixoid";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Suffixoid";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "Suffixoid";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/ToneMarking": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "ToneMarking";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "ToneMarking";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "ToneMarking";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "ToneMarking";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Morpheme/Transfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Morpheme";
			kind: "Transfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Transfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Morpheme";
				kind: "Transfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Morpheme";
					kind: "Transfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Phraseme/Aphorism": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Phraseme";
			kind: "Aphorism";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Phraseme";
				kind: "Aphorism";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Phraseme";
				kind: "Aphorism";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Phraseme";
					kind: "Aphorism";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Phraseme/DiscourseFormula": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Phraseme";
			kind: "DiscourseFormula";
			canonicalForm: string;
			coreFeatures: {
				discourseFormulaRole:
					| (
							| "Greeting"
							| "Farewell"
							| "Apology"
							| "Thanks"
							| "Acknowledgment"
							| "Refusal"
							| "Request"
							| "Reaction"
							| "Initiation"
							| "Transition"
					  )
					| null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Phraseme";
				kind: "DiscourseFormula";
				canonicalForm: string;
				coreFeatures: {
					discourseFormulaRole:
						| (
								| "Greeting"
								| "Farewell"
								| "Apology"
								| "Thanks"
								| "Acknowledgment"
								| "Refusal"
								| "Request"
								| "Reaction"
								| "Initiation"
								| "Transition"
						  )
						| null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Phraseme";
				kind: "DiscourseFormula";
				canonicalForm: string;
				coreFeatures: {
					discourseFormulaRole:
						| (
								| "Greeting"
								| "Farewell"
								| "Apology"
								| "Thanks"
								| "Acknowledgment"
								| "Refusal"
								| "Request"
								| "Reaction"
								| "Initiation"
								| "Transition"
						  )
						| null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Phraseme";
					kind: "DiscourseFormula";
					canonicalForm: string;
					coreFeatures: {
						discourseFormulaRole:
							| (
									| "Greeting"
									| "Farewell"
									| "Apology"
									| "Thanks"
									| "Acknowledgment"
									| "Refusal"
									| "Request"
									| "Reaction"
									| "Initiation"
									| "Transition"
							  )
							| null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Phraseme/Idiom": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Phraseme";
			kind: "Idiom";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Phraseme";
				kind: "Idiom";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Phraseme";
				kind: "Idiom";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Phraseme";
					kind: "Idiom";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Phraseme/Proverb": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Phraseme";
			kind: "Proverb";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Phraseme";
				kind: "Proverb";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Phraseme";
				kind: "Proverb";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Phraseme";
					kind: "Proverb";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Construction/Fusion": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Construction";
			kind: "Fusion";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Construction";
				kind: "Fusion";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Construction";
				kind: "Fusion";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Construction";
					kind: "Fusion";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/ADJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "ADJ";
			canonicalForm: string;
			coreFeatures: { abbr: "Yes" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: { abbr: "Yes" | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				definite: ("Cons" | "Def") | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
					  )
					| null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "ADJ";
				canonicalForm: string;
				coreFeatures: { abbr: "Yes" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "ADJ";
					canonicalForm: string;
					coreFeatures: { abbr: "Yes" | null };
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					definite: ("Cons" | "Def") | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
						  )
						| null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/ADP": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "ADP";
			canonicalForm: string;
			coreFeatures: { abbr: "Yes" | null; case: ("Acc" | "Gen") | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					case: ("Acc" | "Gen") | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					case: ("Acc" | "Gen") | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "ADP";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						case: ("Acc" | "Gen") | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/ADV": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "ADV";
			canonicalForm: string;
			coreFeatures: { prefix: "Yes" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: { prefix: "Yes" | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: { prefix: "Yes" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "ADV";
					canonicalForm: string;
					coreFeatures: { prefix: "Yes" | null };
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/AUX": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "AUX";
			canonicalForm: string;
			coreFeatures: { verbType: ("Cop" | "Mod") | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "AUX";
				canonicalForm: string;
				coreFeatures: { verbType: ("Cop" | "Mod") | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				gender:
					| (
							| ("Fem" | "Masc")
							| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
					  )
					| null;
				number: ("Plur" | "Sing") | null;
				person:
					| (
							| ("1" | "2" | "3")
							| ["1" | "2" | "3", ...Array<"1" | "2" | "3">]
					  )
					| null;
				polarity: ("Neg" | "Pos") | null;
				tense: ("Fut" | "Past") | null;
				verbForm: ("Inf" | "Part") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "AUX";
				canonicalForm: string;
				coreFeatures: { verbType: ("Cop" | "Mod") | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "AUX";
					canonicalForm: string;
					coreFeatures: { verbType: ("Cop" | "Mod") | null };
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					gender:
						| (
								| ("Fem" | "Masc")
								| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
						  )
						| null;
					number: ("Plur" | "Sing") | null;
					person:
						| (
								| ("1" | "2" | "3")
								| ["1" | "2" | "3", ...Array<"1" | "2" | "3">]
						  )
						| null;
					polarity: ("Neg" | "Pos") | null;
					tense: ("Fut" | "Past") | null;
					verbForm: ("Inf" | "Part") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/CCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "CCONJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "CCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "CCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "CCONJ";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/DET": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "DET";
			canonicalForm: string;
			coreFeatures: { pronType: ("Art" | "Int") | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: { pronType: ("Art" | "Int") | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				definite: ("Cons" | "Def") | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
					  )
					| null;
				number: ("Plur" | "Sing") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "DET";
				canonicalForm: string;
				coreFeatures: { pronType: ("Art" | "Int") | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "DET";
					canonicalForm: string;
					coreFeatures: { pronType: ("Art" | "Int") | null };
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					definite: ("Cons" | "Def") | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
						  )
						| null;
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/INTJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "INTJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "INTJ";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/NOUN": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "NOUN";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
					  )
					| null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
						  )
						| null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				definite: ("Cons" | "Def" | "Ind") | null;
				number:
					| (
							| ("Dual" | "Plur" | "Sing")
							| [
									"Dual" | "Plur" | "Sing",
									...Array<"Dual" | "Plur" | "Sing">,
							  ]
					  )
					| null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
						  )
						| null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "NOUN";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						gender:
							| (
									| ("Fem" | "Masc")
									| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
							  )
							| null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					definite: ("Cons" | "Def" | "Ind") | null;
					number:
						| (
								| ("Dual" | "Plur" | "Sing")
								| [
										"Dual" | "Plur" | "Sing",
										...Array<"Dual" | "Plur" | "Sing">,
								  ]
						  )
						| null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/NUM": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "NUM";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "NUM";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				definite: ("Cons" | "Def") | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
					  )
					| null;
				number:
					| (
							| ("Dual" | "Plur")
							| ["Dual" | "Plur", ...Array<"Dual" | "Plur">]
					  )
					| null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "NUM";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "NUM";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					definite: ("Cons" | "Def") | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
						  )
						| null;
					number:
						| (
								| ("Dual" | "Plur")
								| ["Dual" | "Plur", ...Array<"Dual" | "Plur">]
						  )
						| null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/X": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "X";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "X";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "X";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "X";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/PART": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "PART";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PART";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PART";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "PART";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/PRON": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "PRON";
			canonicalForm: string;
			coreFeatures: {
				definite: "Def" | null;
				pronType: ("Dem" | "Ind" | "Int" | "Prs") | null;
				reflex: "Yes" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: {
					definite: "Def" | null;
					pronType: ("Dem" | "Ind" | "Int" | "Prs") | null;
					reflex: "Yes" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				gender:
					| (
							| ("Fem" | "Masc")
							| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
					  )
					| null;
				number: ("Plur" | "Sing") | null;
				person: ("1" | "2" | "3") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PRON";
				canonicalForm: string;
				coreFeatures: {
					definite: "Def" | null;
					pronType: ("Dem" | "Ind" | "Int" | "Prs") | null;
					reflex: "Yes" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "PRON";
					canonicalForm: string;
					coreFeatures: {
						definite: "Def" | null;
						pronType: ("Dem" | "Ind" | "Int" | "Prs") | null;
						reflex: "Yes" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					gender:
						| (
								| ("Fem" | "Masc")
								| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
						  )
						| null;
					number: ("Plur" | "Sing") | null;
					person: ("1" | "2" | "3") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/PROPN": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "PROPN";
			canonicalForm: string;
			coreFeatures: {
				abbr: "Yes" | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
					  )
					| null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PROPN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
						  )
						| null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: { number: ("Plur" | "Sing") | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PROPN";
				canonicalForm: string;
				coreFeatures: {
					abbr: "Yes" | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
						  )
						| null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "PROPN";
					canonicalForm: string;
					coreFeatures: {
						abbr: "Yes" | null;
						gender:
							| (
									| ("Fem" | "Masc")
									| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
							  )
							| null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/PUNCT": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "PUNCT";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PUNCT";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "PUNCT";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "PUNCT";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/SCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "SCONJ";
			canonicalForm: string;
			coreFeatures: { case: "Tem" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: { case: "Tem" | null };
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: { case: "Tem" | null };
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "SCONJ";
					canonicalForm: string;
					coreFeatures: { case: "Tem" | null };
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/SYM": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "SYM";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "SYM";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "SYM";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "SYM";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Lexeme/VERB": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Lexeme";
			kind: "VERB";
			canonicalForm: string;
			coreFeatures: {
				hebBinyan:
					| (
							| "HIFIL"
							| "HITPAEL"
							| "HUFAL"
							| "NIFAL"
							| "PAAL"
							| "PIEL"
							| "PUAL"
					  )
					| null;
				hebExistential: "Yes" | null;
			};
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: {
					hebBinyan:
						| (
								| "HIFIL"
								| "HITPAEL"
								| "HUFAL"
								| "NIFAL"
								| "PAAL"
								| "PIEL"
								| "PUAL"
						  )
						| null;
					hebExistential: "Yes" | null;
				};
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			inflectionalFeatures: {
				definite: ("Cons" | "Def") | null;
				gender:
					| (
							| ("Fem" | "Masc")
							| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
					  )
					| null;
				mood: "Imp" | null;
				number: ("Plur" | "Sing") | null;
				person:
					| (
							| ("1" | "2" | "3")
							| ["1" | "2" | "3", ...Array<"1" | "2" | "3">]
					  )
					| null;
				polarity: ("Neg" | "Pos") | null;
				tense: ("Fut" | "Past") | null;
				verbForm: ("Inf" | "Part") | null;
				voice: ("Act" | "Mid" | "Pass") | null;
			} | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Lexeme";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: {
					hebBinyan:
						| (
								| "HIFIL"
								| "HITPAEL"
								| "HUFAL"
								| "NIFAL"
								| "PAAL"
								| "PIEL"
								| "PUAL"
						  )
						| null;
					hebExistential: "Yes" | null;
				};
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Lexeme";
					kind: "VERB";
					canonicalForm: string;
					coreFeatures: {
						hebBinyan:
							| (
									| "HIFIL"
									| "HITPAEL"
									| "HUFAL"
									| "NIFAL"
									| "PAAL"
									| "PIEL"
									| "PUAL"
							  )
							| null;
						hebExistential: "Yes" | null;
					};
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					definite: ("Cons" | "Def") | null;
					gender:
						| (
								| ("Fem" | "Masc")
								| ["Fem" | "Masc", ...Array<"Fem" | "Masc">]
						  )
						| null;
					mood: "Imp" | null;
					number: ("Plur" | "Sing") | null;
					person:
						| (
								| ("1" | "2" | "3")
								| ["1" | "2" | "3", ...Array<"1" | "2" | "3">]
						  )
						| null;
					polarity: ("Neg" | "Pos") | null;
					tense: ("Fut" | "Past") | null;
					verbForm: ("Inf" | "Part") | null;
					voice: ("Act" | "Mid" | "Pass") | null;
				} | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/Circumfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Circumfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Circumfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Circumfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Circumfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/Clitic": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Clitic";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Clitic";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Clitic";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Clitic";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/Duplifix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Duplifix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Duplifix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Duplifix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Duplifix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/Infix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Infix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Infix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Infix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Infix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/Interfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Interfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Interfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Interfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Interfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/Prefix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Prefix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Prefix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Prefix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Prefix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/Root": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Root";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Root";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Root";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Root";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/Suffix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Suffix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Suffix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Suffix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Suffix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/Suffixoid": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Suffixoid";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Suffixoid";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Suffixoid";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Suffixoid";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/ToneMarking": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "ToneMarking";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "ToneMarking";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "ToneMarking";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "ToneMarking";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Morpheme/Transfix": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Morpheme";
			kind: "Transfix";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Transfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Morpheme";
				kind: "Transfix";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Morpheme";
					kind: "Transfix";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Phraseme/Aphorism": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Phraseme";
			kind: "Aphorism";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Phraseme";
				kind: "Aphorism";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Phraseme";
				kind: "Aphorism";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Phraseme";
					kind: "Aphorism";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Phraseme/DiscourseFormula": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Phraseme";
			kind: "DiscourseFormula";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Phraseme";
				kind: "DiscourseFormula";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Phraseme";
				kind: "DiscourseFormula";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Phraseme";
					kind: "DiscourseFormula";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Phraseme/Idiom": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Phraseme";
			kind: "Idiom";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Phraseme";
				kind: "Idiom";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Phraseme";
				kind: "Idiom";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Phraseme";
					kind: "Idiom";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"he/Phraseme/Proverb": {
		Lemma: {
			unitKind: "Lemma";
			language: "he";
			family: "Phraseme";
			kind: "Proverb";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "he";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Phraseme";
				kind: "Proverb";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "he";
				family: "Phraseme";
				kind: "Proverb";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			emojiDescription: string;
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "he";
				lemma: {
					unitKind: "Lemma";
					language: "he";
					family: "Phraseme";
					kind: "Proverb";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling: "Canonical" | "Variant";
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				{ attested: string; orthography: "Standard" | "Typo" },
				...Array<{
					attested: string;
					orthography: "Standard" | "Typo";
				}>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
}

export type UnitKind = "Lemma" | "Surface" | "Reading" | "Attestation";
export type Language = UnitMap[keyof UnitMap]["Lemma"]["language"];
export type Family<L extends Language = Language> = L extends Language
	? {
			[R in keyof UnitMap]: UnitMap[R]["Lemma"]["language"] extends L
				? UnitMap[R]["Lemma"]["family"]
				: never;
		}[keyof UnitMap]
	: never;
export type Kind<
	L extends Language = Language,
	F extends Family<L> = Family<L>,
> = L extends Language
	? F extends Family<L>
		? {
				[R in keyof UnitMap]: UnitMap[R]["Lemma"] extends {
					language: L;
					family: F;
				}
					? UnitMap[R]["Lemma"]["kind"]
					: never;
			}[keyof UnitMap]
		: never
	: never;
export type Unit<
	U extends UnitKind = UnitKind,
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> = UnitMap[Extract<`${L}/${F}/${K}`, keyof UnitMap>][U];
export type Lemma<
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> = Unit<"Lemma", L, F, K>;
export type Surface<
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> = Unit<"Surface", L, F, K>;
export type Reading<
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> = Unit<"Reading", L, F, K>;
export type Attestation<
	L extends Language = Language,
	F extends Family<L> = Family<L>,
	K extends Kind<L, F> = Kind<L, F>,
> = Unit<"Attestation", L, F, K>;
export type UnitRoute = {
	[R in keyof UnitMap]: Pick<
		UnitMap[R]["Lemma"],
		"language" | "family" | "kind"
	> & { unitKind: UnitKind };
}[keyof UnitMap];
export type ParsedUnit<R extends UnitRoute = UnitRoute> = R extends UnitRoute
	? {
			[U in R["unitKind"]]: {
				unitKind: U;
				language: R["language"];
				family: R["family"];
				kind: R["kind"];
				value: UnitMap[Extract<
					`${R["language"]}/${R["family"]}/${R["kind"]}`,
					keyof UnitMap
				>][U];
			};
		}[R["unitKind"]]
	: never;

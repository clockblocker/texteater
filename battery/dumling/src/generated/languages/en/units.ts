// Generated from canonical Zod unit schemas. Run bun run generate.
export interface UnitMap {
	"en/Foreign/Foreign": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Foreign";
			kind: "Foreign";
			canonicalForm: string;
			coreFeatures: { sourceLang: string };
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Foreign";
				kind: "Foreign";
				canonicalForm: string;
				coreFeatures: { sourceLang: string };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Foreign";
				kind: "Foreign";
				canonicalForm: string;
				coreFeatures: { sourceLang: string };
			};
		};
		Attestation: {
			unitKind: "Attestation";
			surface: {
				unitKind: "Surface";
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Foreign";
					kind: "Foreign";
					canonicalForm: string;
					coreFeatures: { sourceLang: string };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
				comparable: "Yes" | null;
				extPos: ("ADP" | "ADV" | "SCONJ") | null;
				numForm: ("Combi" | "Word") | null;
				numType: ("Frac" | "Ord") | null;
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
					comparable: "Yes" | null;
					extPos: ("ADP" | "ADV" | "SCONJ") | null;
					numForm: ("Combi" | "Word") | null;
					numType: ("Frac" | "Ord") | null;
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
					comparable: "Yes" | null;
					extPos: ("ADP" | "ADV" | "SCONJ") | null;
					numForm: ("Combi" | "Word") | null;
					numType: ("Frac" | "Ord") | null;
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
						comparable: "Yes" | null;
						extPos: ("ADP" | "ADV" | "SCONJ") | null;
						numForm: ("Combi" | "Word") | null;
						numType: ("Frac" | "Ord") | null;
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					degree: ("Cmp" | "Pos" | "Sup") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence:
				| (
						| { kind: "Owned"; member: number }
						| {
								kind: "Shared";
								article:
									| {
											attested: string;
											orthography:
												| "Standard"
												| "Typo"
												| "Shorthand";
									  }
									| {
											attested: string;
											orthography: "Fused";
											fusion: {
												spelling: string;
												components: [
													{
														span: string;
														surface: string;
													},
													{
														span: string;
														surface: string;
													},
													...Array<{
														span: string;
														surface: string;
													}>,
												];
											};
											component: number;
									  };
						  }
						| {
								kind: "Hidden";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
			valencyEvidence?:
				| Array<{
						member: number | null;
						complement:
							| { kind: "Subject" }
							| { kind: "DirectObject" }
							| { kind: "IndirectObject" }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "en";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: {
											abbr: "Yes" | null;
											extPos:
												| ("ADP" | "ADV" | "SCONJ")
												| null;
										};
									};
							  };
				  }>
				| undefined;
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
				comparable: "Yes" | null;
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
					comparable: "Yes" | null;
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
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
					comparable: "Yes" | null;
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
						comparable: "Yes" | null;
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
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					degree: ("Cmp" | "Pos" | "Sup") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
			coreFeatures: { abbr: "Yes" | null };
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
				coreFeatures: { abbr: "Yes" | null };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				coreFeatures: { abbr: "Yes" | null };
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
					coreFeatures: { abbr: "Yes" | null };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
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
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
				polarity: ("Neg" | "Pos") | null;
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
					polarity: ("Neg" | "Pos") | null;
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
					polarity: ("Neg" | "Pos") | null;
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
						polarity: ("Neg" | "Pos") | null;
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
				numForm: ("Combi" | "Digit" | "Word") | null;
				numType: ("Card" | "Frac" | "Ord") | null;
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
					numForm: ("Combi" | "Digit" | "Word") | null;
					numType: ("Card" | "Frac" | "Ord") | null;
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
					numForm: ("Combi" | "Digit" | "Word") | null;
					numType: ("Card" | "Frac" | "Ord") | null;
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
						numForm: ("Combi" | "Digit" | "Word") | null;
						numType: ("Card" | "Frac" | "Ord") | null;
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					number: ("Plur" | "Ptan" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence:
				| (
						| { kind: "Owned"; member: number }
						| {
								kind: "Shared";
								article:
									| {
											attested: string;
											orthography:
												| "Standard"
												| "Typo"
												| "Shorthand";
									  }
									| {
											attested: string;
											orthography: "Fused";
											fusion: {
												spelling: string;
												components: [
													{
														span: string;
														surface: string;
													},
													{
														span: string;
														surface: string;
													},
													...Array<{
														span: string;
														surface: string;
													}>,
												];
											};
											component: number;
									  };
						  }
						| {
								kind: "Hidden";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
			valencyEvidence?:
				| Array<{
						member: number | null;
						complement:
							| { kind: "Subject" }
							| { kind: "DirectObject" }
							| { kind: "IndirectObject" }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "en";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: {
											abbr: "Yes" | null;
											extPos:
												| ("ADP" | "ADV" | "SCONJ")
												| null;
										};
									};
							  };
				  }>
				| undefined;
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence:
				| (
						| { kind: "Owned"; member: number }
						| {
								kind: "Shared";
								article:
									| {
											attested: string;
											orthography:
												| "Standard"
												| "Typo"
												| "Shorthand";
									  }
									| {
											attested: string;
											orthography: "Fused";
											fusion: {
												spelling: string;
												components: [
													{
														span: string;
														surface: string;
													},
													{
														span: string;
														surface: string;
													},
													...Array<{
														span: string;
														surface: string;
													}>,
												];
											};
											component: number;
									  };
						  }
						| {
								kind: "Hidden";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
				case: ("Acc" | "Gen" | "Nom") | null;
				gender: ("Fem" | "Masc" | "Neut") | null;
				number: ("Plur" | "Sing") | null;
				reflex: "Yes" | null;
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
					case: ("Acc" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
					reflex: "Yes" | null;
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
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
					case: ("Acc" | "Gen" | "Nom") | null;
					gender: ("Fem" | "Masc" | "Neut") | null;
					number: ("Plur" | "Sing") | null;
					reflex: "Yes" | null;
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
						case: ("Acc" | "Gen" | "Nom") | null;
						gender: ("Fem" | "Masc" | "Neut") | null;
						number: ("Plur" | "Sing") | null;
						reflex: "Yes" | null;
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence:
				| (
						| { kind: "Owned"; member: number }
						| {
								kind: "Shared";
								article:
									| {
											attested: string;
											orthography:
												| "Standard"
												| "Typo"
												| "Shorthand";
									  }
									| {
											attested: string;
											orthography: "Fused";
											fusion: {
												spelling: string;
												components: [
													{
														span: string;
														surface: string;
													},
													{
														span: string;
														surface: string;
													},
													...Array<{
														span: string;
														surface: string;
													}>,
												];
											};
											component: number;
									  };
						  }
						| {
								kind: "Hidden";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
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
				article: "Definite" | null;
				extPos: "PROPN" | null;
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
					article: "Definite" | null;
					extPos: "PROPN" | null;
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
					article: "Definite" | null;
					extPos: "PROPN" | null;
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
						article: "Definite" | null;
						extPos: "PROPN" | null;
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					number: ("Plur" | "Ptan" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence:
				| (
						| { kind: "Owned"; member: number }
						| {
								kind: "Shared";
								article:
									| {
											attested: string;
											orthography:
												| "Standard"
												| "Typo"
												| "Shorthand";
									  }
									| {
											attested: string;
											orthography: "Fused";
											fusion: {
												spelling: string;
												components: [
													{
														span: string;
														surface: string;
													},
													{
														span: string;
														surface: string;
													},
													...Array<{
														span: string;
														surface: string;
													}>,
												];
											};
											component: number;
									  };
						  }
						| {
								kind: "Hidden";
								fusion: {
									spelling: string;
									components: [
										{ span: string; surface: string },
										{ span: string; surface: string },
										...Array<{
											span: string;
											surface: string;
										}>,
									];
								};
								component: number;
						  }
				  )
				| null;
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					number: ("Plur" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
				phrasal: "Yes" | null;
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
					phrasal: "Yes" | null;
				};
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
					phrasal: "Yes" | null;
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
						phrasal: "Yes" | null;
					};
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
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
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			valencyEvidence?:
				| Array<{
						member: number | null;
						complement:
							| { kind: "Subject" }
							| { kind: "DirectObject" }
							| { kind: "IndirectObject" }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "en";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: {
											abbr: "Yes" | null;
											extPos:
												| ("ADP" | "ADV" | "SCONJ")
												| null;
										};
									};
							  };
				  }>
				| undefined;
		};
	};
	"en/Locution/ADP": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Locution";
			kind: "ADP";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Locution";
				kind: "ADP";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Locution";
				kind: "ADP";
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
					family: "Locution";
					kind: "ADP";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Locution/ADV": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Locution";
			kind: "ADV";
			canonicalForm: string;
			coreFeatures: { comparable: "Yes" | null };
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Locution";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: { comparable: "Yes" | null };
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				family: "Locution";
				kind: "ADV";
				canonicalForm: string;
				coreFeatures: { comparable: "Yes" | null };
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
					family: "Locution";
					kind: "ADV";
					canonicalForm: string;
					coreFeatures: { comparable: "Yes" | null };
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					degree: ("Cmp" | "Pos" | "Sup") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Locution/INTJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Locution";
			kind: "INTJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Locution";
				kind: "INTJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Locution";
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
				language: "en";
				lemma: {
					unitKind: "Lemma";
					language: "en";
					family: "Locution";
					kind: "INTJ";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Locution/NOUN": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Locution";
			kind: "NOUN";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Locution";
				kind: "NOUN";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				family: "Locution";
				kind: "NOUN";
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
					family: "Locution";
					kind: "NOUN";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
				inflectionalFeatures: {
					number: ("Plur" | "Ptan" | "Sing") | null;
				} | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			articleEvidence?:
				| (
						| (
								| { kind: "Owned"; member: number }
								| {
										kind: "Shared";
										article:
											| {
													attested: string;
													orthography:
														| "Standard"
														| "Typo"
														| "Shorthand";
											  }
											| {
													attested: string;
													orthography: "Fused";
													fusion: {
														spelling: string;
														components: [
															{
																span: string;
																surface: string;
															},
															{
																span: string;
																surface: string;
															},
															...Array<{
																span: string;
																surface: string;
															}>,
														];
													};
													component: number;
											  };
								  }
								| {
										kind: "Hidden";
										fusion: {
											spelling: string;
											components: [
												{
													span: string;
													surface: string;
												},
												{
													span: string;
													surface: string;
												},
												...Array<{
													span: string;
													surface: string;
												}>,
											];
										};
										component: number;
								  }
						  )
						| null
				  )
				| undefined;
			valencyEvidence?:
				| Array<{
						member: number | null;
						complement:
							| { kind: "Subject" }
							| { kind: "DirectObject" }
							| { kind: "IndirectObject" }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "en";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: {
											abbr: "Yes" | null;
											extPos:
												| ("ADP" | "ADV" | "SCONJ")
												| null;
										};
									};
							  };
				  }>
				| undefined;
		};
	};
	"en/Locution/SCONJ": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Locution";
			kind: "SCONJ";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Locution";
				kind: "SCONJ";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Locution";
				kind: "SCONJ";
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
					family: "Locution";
					kind: "SCONJ";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Locution/VERB": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Locution";
			kind: "VERB";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Locution";
				kind: "VERB";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				family: "Locution";
				kind: "VERB";
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
					family: "Locution";
					kind: "VERB";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
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
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
			valencyEvidence?:
				| Array<{
						member: number | null;
						complement:
							| { kind: "Subject" }
							| { kind: "DirectObject" }
							| { kind: "IndirectObject" }
							| {
									kind: "Preposition";
									preposition: {
										unitKind: "Lemma";
										language: "en";
										family: "Lexeme";
										kind: "ADP";
										canonicalForm: string;
										coreFeatures: {
											abbr: "Yes" | null;
											extPos:
												| ("ADP" | "ADV" | "SCONJ")
												| null;
										};
									};
							  };
				  }>
				| undefined;
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
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
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
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
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
	"en/Saying/Saying": {
		Lemma: {
			unitKind: "Lemma";
			language: "en";
			family: "Saying";
			kind: "Saying";
			canonicalForm: string;
			coreFeatures: Record<string, never>;
		};
		Surface: {
			unitKind: "Surface";
			language: "en";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Saying";
				kind: "Saying";
				canonicalForm: string;
				coreFeatures: Record<string, never>;
			};
			normalizedSurface: string;
			spelling:
				| { kind: "Canonical" }
				| {
						kind: "Variant";
						variantTags: [
							(
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							),
							...Array<
								| "Licensed"
								| "Historical"
								| "Regional"
								| "Expressive"
							>,
						];
				  };
			surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
		};
		Reading: {
			unitKind: "Reading";
			lemma: {
				unitKind: "Lemma";
				language: "en";
				family: "Saying";
				kind: "Saying";
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
					family: "Saying";
					kind: "Saying";
					canonicalForm: string;
					coreFeatures: Record<string, never>;
				};
				normalizedSurface: string;
				spelling:
					| { kind: "Canonical" }
					| {
							kind: "Variant";
							variantTags: [
								(
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								),
								...Array<
									| "Licensed"
									| "Historical"
									| "Regional"
									| "Expressive"
								>,
							];
					  };
				surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
			};
			members: [
				(
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				),
				...Array<
					| {
							attested: string;
							orthography: "Standard" | "Typo" | "Shorthand";
					  }
					| {
							attested: string;
							orthography: "Fused";
							fusion: {
								spelling: string;
								components: [
									{ span: string; surface: string },
									{ span: string; surface: string },
									...Array<{ span: string; surface: string }>,
								];
							};
							component: number;
					  }
				>,
			];
			realizationCoverage: "Full" | "Partial";
		};
	};
}

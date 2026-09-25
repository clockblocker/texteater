// Generated private model exchange schemas.
export const modelSchemas: Readonly<Record<string, Record<string, unknown>>> = {
	"grammar/de/Lexeme/ADJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Ord"],
											},
											{ type: "null" },
										],
									},
									variant: {
										anyOf: [
											{ type: "string", enum: ["Short"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"foreign",
									"numType",
									"variant",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											degree: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cmp",
															"Pos",
															"Sup",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"case",
											"degree",
											"gender",
											"number",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
					valencyEvidence: {
						type: "array",
						items: {
							type: "object",
							properties: {
								member: {
									anyOf: [
										{
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991,
										},
										{ type: "null" },
									],
								},
								complement: {
									anyOf: [
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Case",
												},
												case: {
													type: "string",
													enum: [
														"Nom",
														"Acc",
														"Dat",
														"Gen",
													],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Preposition",
												},
												preposition: {
													type: "object",
													properties: {
														unitKind: {
															type: "string",
															const: "Lemma",
														},
														language: {
															type: "string",
															const: "de",
														},
														family: {
															type: "string",
															const: "Lexeme",
														},
														kind: {
															type: "string",
															const: "ADP",
														},
														canonicalForm: {
															type: "string",
															minLength: 1,
														},
														coreFeatures: {
															type: "object",
															properties: {
																abbr: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																adpType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Circ",
																				"Post",
																				"Prep",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																extPos: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"ADV",
																				"SCONJ",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																foreign: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																partType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Vbp",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
															},
															required: [
																"abbr",
																"adpType",
																"extPos",
																"foreign",
																"partType",
															],
															additionalProperties: false,
														},
													},
													required: [
														"unitKind",
														"language",
														"family",
														"kind",
														"canonicalForm",
														"coreFeatures",
													],
													additionalProperties: false,
												},
												case: {
													type: "string",
													enum: ["Acc", "Dat", "Gen"],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"preposition",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
									],
								},
								realizedCase: {
									type: "string",
									enum: ["Nom", "Acc", "Dat", "Gen"],
								},
							},
							required: ["member", "complement", "realizedCase"],
							additionalProperties: false,
						},
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
					"valencyEvidence",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/ADP": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									adpType: {
										anyOf: [
											{
												type: "string",
												enum: ["Circ", "Post", "Prep"],
											},
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADV", "SCONJ"],
											},
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									partType: {
										anyOf: [
											{ type: "string", enum: ["Vbp"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"adpType",
									"extPos",
									"foreign",
									"partType",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
					valencyEvidence: {
						type: "array",
						items: {
							type: "object",
							properties: {
								member: {
									anyOf: [
										{
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991,
										},
										{ type: "null" },
									],
								},
								complement: {
									anyOf: [
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Case",
												},
												case: {
													type: "string",
													enum: [
														"Nom",
														"Acc",
														"Dat",
														"Gen",
													],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Preposition",
												},
												preposition: {
													type: "object",
													properties: {
														unitKind: {
															type: "string",
															const: "Lemma",
														},
														language: {
															type: "string",
															const: "de",
														},
														family: {
															type: "string",
															const: "Lexeme",
														},
														kind: {
															type: "string",
															const: "ADP",
														},
														canonicalForm: {
															type: "string",
															minLength: 1,
														},
														coreFeatures: {
															type: "object",
															properties: {
																abbr: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																adpType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Circ",
																				"Post",
																				"Prep",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																extPos: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"ADV",
																				"SCONJ",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																foreign: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																partType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Vbp",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
															},
															required: [
																"abbr",
																"adpType",
																"extPos",
																"foreign",
																"partType",
															],
															additionalProperties: false,
														},
													},
													required: [
														"unitKind",
														"language",
														"family",
														"kind",
														"canonicalForm",
														"coreFeatures",
													],
													additionalProperties: false,
												},
												case: {
													type: "string",
													enum: ["Acc", "Dat", "Gen"],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"preposition",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
									],
								},
								realizedCase: {
									type: "string",
									enum: ["Nom", "Acc", "Dat", "Gen"],
								},
							},
							required: ["member", "complement", "realizedCase"],
							additionalProperties: false,
						},
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
					"valencyEvidence",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/ADV": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Mult"],
											},
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Dem",
													"Ind",
													"Int",
													"Neg",
													"Rel",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["foreign", "numType", "pronType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											degree: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cmp",
															"Pos",
															"Sup",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["degree"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/AUX": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									verbType: {
										anyOf: [
											{ type: "string", enum: ["Mod"] },
											{ type: "null" },
										],
									},
								},
								required: ["verbType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										anyOf: [
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													participleForm: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Present",
																	"Past",
																],
															},
															{ type: "null" },
														],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"participleForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													participleForm: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Present",
																	"Past",
																],
															},
															{ type: "null" },
														],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"participleForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
										],
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
					expletiveEvidence: {
						anyOf: [
							{
								anyOf: [
									{
										type: "object",
										properties: {
											attested: {
												type: "string",
												minLength: 1,
											},
											orthography: {
												type: "string",
												enum: [
													"Standard",
													"Typo",
													"Shorthand",
												],
											},
										},
										required: ["attested", "orthography"],
										additionalProperties: false,
									},
									{
										type: "object",
										properties: {
											attested: {
												type: "string",
												minLength: 1,
											},
											orthography: {
												type: "string",
												const: "Fused",
											},
											fusion: {
												type: "object",
												properties: {
													spelling: {
														type: "string",
														minLength: 1,
													},
													components: {
														type: "array",
														prefixItems: [
															{
																type: "object",
																properties: {
																	span: {
																		type: "string",
																	},
																	surface: {
																		type: "string",
																		minLength: 1,
																	},
																},
																required: [
																	"span",
																	"surface",
																],
																additionalProperties: false,
															},
															{
																type: "object",
																properties: {
																	span: {
																		type: "string",
																	},
																	surface: {
																		type: "string",
																		minLength: 1,
																	},
																},
																required: [
																	"span",
																	"surface",
																],
																additionalProperties: false,
															},
														],
														items: {
															type: "object",
															properties: {
																span: {
																	type: "string",
																},
																surface: {
																	type: "string",
																	minLength: 1,
																},
															},
															required: [
																"span",
																"surface",
															],
															additionalProperties: false,
														},
													},
												},
												required: [
													"spelling",
													"components",
												],
												additionalProperties: false,
											},
											component: {
												type: "integer",
												minimum: 0,
												maximum: 9007199254740991,
											},
										},
										required: [
											"attested",
											"orthography",
											"fusion",
											"component",
										],
										additionalProperties: false,
									},
								],
							},
							{ type: "null" },
						],
					},
					valencyEvidence: {
						type: "array",
						items: {
							type: "object",
							properties: {
								member: {
									anyOf: [
										{
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991,
										},
										{ type: "null" },
									],
								},
								complement: {
									anyOf: [
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Case",
												},
												case: {
													type: "string",
													enum: [
														"Nom",
														"Acc",
														"Dat",
														"Gen",
													],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Preposition",
												},
												preposition: {
													type: "object",
													properties: {
														unitKind: {
															type: "string",
															const: "Lemma",
														},
														language: {
															type: "string",
															const: "de",
														},
														family: {
															type: "string",
															const: "Lexeme",
														},
														kind: {
															type: "string",
															const: "ADP",
														},
														canonicalForm: {
															type: "string",
															minLength: 1,
														},
														coreFeatures: {
															type: "object",
															properties: {
																abbr: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																adpType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Circ",
																				"Post",
																				"Prep",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																extPos: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"ADV",
																				"SCONJ",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																foreign: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																partType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Vbp",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
															},
															required: [
																"abbr",
																"adpType",
																"extPos",
																"foreign",
																"partType",
															],
															additionalProperties: false,
														},
													},
													required: [
														"unitKind",
														"language",
														"family",
														"kind",
														"canonicalForm",
														"coreFeatures",
													],
													additionalProperties: false,
												},
												case: {
													type: "string",
													enum: ["Acc", "Dat", "Gen"],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"preposition",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
									],
								},
								realizedCase: {
									type: "string",
									enum: ["Nom", "Acc", "Dat", "Gen"],
								},
							},
							required: ["member", "complement", "realizedCase"],
							additionalProperties: false,
						},
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
					"expletiveEvidence",
					"valencyEvidence",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/CCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									conjType: {
										anyOf: [
											{ type: "string", enum: ["Comp"] },
											{ type: "null" },
										],
									},
								},
								required: ["conjType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/DET": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									case: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Acc",
													"Dat",
													"Gen",
													"Nom",
												],
											},
											{ type: "null" },
										],
									},
									definite: {
										anyOf: [
											{
												type: "string",
												enum: ["Def", "Ind"],
											},
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADV", "DET"],
											},
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									gender: {
										anyOf: [
											{
												type: "string",
												enum: ["Fem", "Masc", "Neut"],
											},
											{ type: "null" },
										],
									},
									number: {
										anyOf: [
											{
												type: "string",
												enum: ["Plur", "Sing"],
											},
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Ord"],
											},
											{ type: "null" },
										],
									},
									person: {
										anyOf: [
											{
												type: "string",
												enum: ["1", "2", "3"],
											},
											{ type: "null" },
										],
									},
									polite: {
										anyOf: [
											{
												type: "string",
												enum: ["Form", "Infm"],
											},
											{ type: "null" },
										],
									},
									poss: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Art",
													"Dem",
													"Emp",
													"Exc",
													"Ind",
													"Int",
													"Neg",
													"Prs",
													"Rel",
													"Tot",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"case",
									"definite",
									"extPos",
									"foreign",
									"gender",
									"number",
									"numType",
									"person",
									"polite",
									"poss",
									"pronType",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											degree: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cmp",
															"Pos",
															"Sup",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											"gender[psor]": {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																	"Neut",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																			"Neut",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																		"Neut",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											"number[psor]": {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"case",
											"degree",
											"gender",
											"gender[psor]",
											"number",
											"number[psor]",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/INTJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									partType: {
										anyOf: [
											{ type: "string", enum: ["Res"] },
											{ type: "null" },
										],
									},
								},
								required: ["partType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/NOUN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									gender: {
										anyOf: [
											{
												type: "string",
												enum: ["Fem", "Masc", "Neut"],
											},
											{ type: "null" },
										],
									},
									hyph: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["gender", "hyph"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											article: {
												type: "string",
												enum: [
													"Definite",
													"Indefinite",
													"None",
												],
											},
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["article", "case", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
					articleEvidence: {
						anyOf: [
							{
								anyOf: [
									{
										type: "object",
										properties: {
											kind: {
												type: "string",
												const: "Owned",
											},
											member: {
												type: "integer",
												minimum: 0,
												maximum: 9007199254740991,
											},
										},
										required: ["kind", "member"],
										additionalProperties: false,
									},
									{
										type: "object",
										properties: {
											kind: {
												type: "string",
												const: "Shared",
											},
											article: {
												anyOf: [
													{
														type: "object",
														properties: {
															attested: {
																type: "string",
																minLength: 1,
															},
															orthography: {
																type: "string",
																enum: [
																	"Standard",
																	"Typo",
																	"Shorthand",
																],
															},
														},
														required: [
															"attested",
															"orthography",
														],
														additionalProperties: false,
													},
													{
														type: "object",
														properties: {
															attested: {
																type: "string",
																minLength: 1,
															},
															orthography: {
																type: "string",
																const: "Fused",
															},
															fusion: {
																type: "object",
																properties: {
																	spelling: {
																		type: "string",
																		minLength: 1,
																	},
																	components:
																		{
																			type: "array",
																			prefixItems:
																				[
																					{
																						type: "object",
																						properties:
																							{
																								span: {
																									type: "string",
																								},
																								surface:
																									{
																										type: "string",
																										minLength: 1,
																									},
																							},
																						required:
																							[
																								"span",
																								"surface",
																							],
																						additionalProperties: false,
																					},
																					{
																						type: "object",
																						properties:
																							{
																								span: {
																									type: "string",
																								},
																								surface:
																									{
																										type: "string",
																										minLength: 1,
																									},
																							},
																						required:
																							[
																								"span",
																								"surface",
																							],
																						additionalProperties: false,
																					},
																				],
																			items: {
																				type: "object",
																				properties:
																					{
																						span: {
																							type: "string",
																						},
																						surface:
																							{
																								type: "string",
																								minLength: 1,
																							},
																					},
																				required:
																					[
																						"span",
																						"surface",
																					],
																				additionalProperties: false,
																			},
																		},
																},
																required: [
																	"spelling",
																	"components",
																],
																additionalProperties: false,
															},
															component: {
																type: "integer",
																minimum: 0,
																maximum: 9007199254740991,
															},
														},
														required: [
															"attested",
															"orthography",
															"fusion",
															"component",
														],
														additionalProperties: false,
													},
												],
											},
										},
										required: ["kind", "article"],
										additionalProperties: false,
									},
									{
										type: "object",
										properties: {
											kind: {
												type: "string",
												const: "Hidden",
											},
											fusion: {
												type: "object",
												properties: {
													spelling: {
														type: "string",
														minLength: 1,
													},
													components: {
														type: "array",
														prefixItems: [
															{
																type: "object",
																properties: {
																	span: {
																		type: "string",
																	},
																	surface: {
																		type: "string",
																		minLength: 1,
																	},
																},
																required: [
																	"span",
																	"surface",
																],
																additionalProperties: false,
															},
															{
																type: "object",
																properties: {
																	span: {
																		type: "string",
																	},
																	surface: {
																		type: "string",
																		minLength: 1,
																	},
																},
																required: [
																	"span",
																	"surface",
																],
																additionalProperties: false,
															},
														],
														items: {
															type: "object",
															properties: {
																span: {
																	type: "string",
																},
																surface: {
																	type: "string",
																	minLength: 1,
																},
															},
															required: [
																"span",
																"surface",
															],
															additionalProperties: false,
														},
													},
												},
												required: [
													"spelling",
													"components",
												],
												additionalProperties: false,
											},
											component: {
												type: "integer",
												minimum: 0,
												maximum: 9007199254740991,
											},
										},
										required: [
											"kind",
											"fusion",
											"component",
										],
										additionalProperties: false,
									},
								],
							},
							{ type: "null" },
						],
					},
					valencyEvidence: {
						type: "array",
						items: {
							type: "object",
							properties: {
								member: {
									anyOf: [
										{
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991,
										},
										{ type: "null" },
									],
								},
								complement: {
									anyOf: [
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Case",
												},
												case: {
													type: "string",
													enum: [
														"Nom",
														"Acc",
														"Dat",
														"Gen",
													],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Preposition",
												},
												preposition: {
													type: "object",
													properties: {
														unitKind: {
															type: "string",
															const: "Lemma",
														},
														language: {
															type: "string",
															const: "de",
														},
														family: {
															type: "string",
															const: "Lexeme",
														},
														kind: {
															type: "string",
															const: "ADP",
														},
														canonicalForm: {
															type: "string",
															minLength: 1,
														},
														coreFeatures: {
															type: "object",
															properties: {
																abbr: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																adpType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Circ",
																				"Post",
																				"Prep",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																extPos: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"ADV",
																				"SCONJ",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																foreign: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																partType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Vbp",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
															},
															required: [
																"abbr",
																"adpType",
																"extPos",
																"foreign",
																"partType",
															],
															additionalProperties: false,
														},
													},
													required: [
														"unitKind",
														"language",
														"family",
														"kind",
														"canonicalForm",
														"coreFeatures",
													],
													additionalProperties: false,
												},
												case: {
													type: "string",
													enum: ["Acc", "Dat", "Gen"],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"preposition",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
									],
								},
								realizedCase: {
									type: "string",
									enum: ["Nom", "Acc", "Dat", "Gen"],
								},
							},
							required: ["member", "complement", "realizedCase"],
							additionalProperties: false,
						},
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
					"articleEvidence",
					"valencyEvidence",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/NUM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Card",
													"Frac",
													"Mult",
													"Range",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "foreign", "numType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["case", "gender", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/X": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									hyph: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Mult", "Range"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"foreign",
									"hyph",
									"numType",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											mood: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Imp",
															"Ind",
															"Sub",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											verbForm: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fin",
															"Inf",
															"Part",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"case",
											"gender",
											"mood",
											"number",
											"verbForm",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/PART": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									partType: {
										anyOf: [
											{ type: "string", enum: ["Inf"] },
											{ type: "null" },
										],
									},
									polarity: {
										anyOf: [
											{
												type: "string",
												enum: ["Neg", "Pos"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"foreign",
									"partType",
									"polarity",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/PRON": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									case: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Acc",
													"Dat",
													"Gen",
													"Nom",
												],
											},
											{ type: "null" },
										],
									},
									number: {
										anyOf: [
											{
												type: "string",
												enum: ["Plur", "Sing"],
											},
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{ type: "string", enum: ["DET"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									person: {
										anyOf: [
											{
												type: "string",
												enum: ["1", "2", "3"],
											},
											{ type: "null" },
										],
									},
									polite: {
										anyOf: [
											{
												type: "string",
												enum: ["Form", "Infm"],
											},
											{ type: "null" },
										],
									},
									poss: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Dem",
													"Ind",
													"Int",
													"Neg",
													"Prs",
													"Rcp",
													"Rel",
													"Tot",
												],
											},
											{ type: "null" },
										],
									},
									gender: {
										anyOf: [
											{
												type: "string",
												enum: ["Fem", "Masc", "Neut"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"case",
									"number",
									"extPos",
									"foreign",
									"person",
									"polite",
									"poss",
									"pronType",
									"gender",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											"gender[psor]": {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																	"Neut",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																			"Neut",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																		"Neut",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											"number[psor]": {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											reflex: {
												anyOf: [
													{
														type: "string",
														enum: ["Yes"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"case",
											"gender",
											"number",
											"gender[psor]",
											"number[psor]",
											"reflex",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/PROPN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									gender: {
										anyOf: [
											{
												type: "string",
												enum: ["Fem", "Masc", "Neut"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "foreign", "gender"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["case", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/PUNCT": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									punctType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Brck",
													"Colo",
													"Comm",
													"Dash",
													"Elip",
													"Excl",
													"Peri",
													"Qest",
													"Quot",
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["punctType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/SCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									conjType: {
										anyOf: [
											{ type: "string", enum: ["Comp"] },
											{ type: "null" },
										],
									},
								},
								required: ["conjType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/SYM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Range"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["foreign", "numType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											case: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Acc",
															"Dat",
															"Gen",
															"Nom",
														],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fem",
															"Masc",
															"Neut",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["case", "gender", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Lexeme/VERB": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									hasSepPrefix: {
										anyOf: [
											{ type: "string", minLength: 1 },
											{ type: "null" },
										],
									},
									lexicallyReflexive: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									verbType: {
										anyOf: [
											{ type: "string", enum: ["Mod"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"hasSepPrefix",
									"lexicallyReflexive",
									"verbType",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										anyOf: [
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													participleForm: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Present",
																	"Past",
																],
															},
															{ type: "null" },
														],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"participleForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													participleForm: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Present",
																	"Past",
																],
															},
															{ type: "null" },
														],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"participleForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
										],
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
					expletiveEvidence: {
						anyOf: [
							{
								anyOf: [
									{
										type: "object",
										properties: {
											attested: {
												type: "string",
												minLength: 1,
											},
											orthography: {
												type: "string",
												enum: [
													"Standard",
													"Typo",
													"Shorthand",
												],
											},
										},
										required: ["attested", "orthography"],
										additionalProperties: false,
									},
									{
										type: "object",
										properties: {
											attested: {
												type: "string",
												minLength: 1,
											},
											orthography: {
												type: "string",
												const: "Fused",
											},
											fusion: {
												type: "object",
												properties: {
													spelling: {
														type: "string",
														minLength: 1,
													},
													components: {
														type: "array",
														prefixItems: [
															{
																type: "object",
																properties: {
																	span: {
																		type: "string",
																	},
																	surface: {
																		type: "string",
																		minLength: 1,
																	},
																},
																required: [
																	"span",
																	"surface",
																],
																additionalProperties: false,
															},
															{
																type: "object",
																properties: {
																	span: {
																		type: "string",
																	},
																	surface: {
																		type: "string",
																		minLength: 1,
																	},
																},
																required: [
																	"span",
																	"surface",
																],
																additionalProperties: false,
															},
														],
														items: {
															type: "object",
															properties: {
																span: {
																	type: "string",
																},
																surface: {
																	type: "string",
																	minLength: 1,
																},
															},
															required: [
																"span",
																"surface",
															],
															additionalProperties: false,
														},
													},
												},
												required: [
													"spelling",
													"components",
												],
												additionalProperties: false,
											},
											component: {
												type: "integer",
												minimum: 0,
												maximum: 9007199254740991,
											},
										},
										required: [
											"attested",
											"orthography",
											"fusion",
											"component",
										],
										additionalProperties: false,
									},
								],
							},
							{ type: "null" },
						],
					},
					valencyEvidence: {
						type: "array",
						items: {
							type: "object",
							properties: {
								member: {
									anyOf: [
										{
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991,
										},
										{ type: "null" },
									],
								},
								complement: {
									anyOf: [
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Case",
												},
												case: {
													type: "string",
													enum: [
														"Nom",
														"Acc",
														"Dat",
														"Gen",
													],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Preposition",
												},
												preposition: {
													type: "object",
													properties: {
														unitKind: {
															type: "string",
															const: "Lemma",
														},
														language: {
															type: "string",
															const: "de",
														},
														family: {
															type: "string",
															const: "Lexeme",
														},
														kind: {
															type: "string",
															const: "ADP",
														},
														canonicalForm: {
															type: "string",
															minLength: 1,
														},
														coreFeatures: {
															type: "object",
															properties: {
																abbr: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																adpType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Circ",
																				"Post",
																				"Prep",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																extPos: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"ADV",
																				"SCONJ",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																foreign: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																partType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Vbp",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
															},
															required: [
																"abbr",
																"adpType",
																"extPos",
																"foreign",
																"partType",
															],
															additionalProperties: false,
														},
													},
													required: [
														"unitKind",
														"language",
														"family",
														"kind",
														"canonicalForm",
														"coreFeatures",
													],
													additionalProperties: false,
												},
												case: {
													type: "string",
													enum: ["Acc", "Dat", "Gen"],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"preposition",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
									],
								},
								realizedCase: {
									type: "string",
									enum: ["Nom", "Acc", "Dat", "Gen"],
								},
							},
							required: ["member", "complement", "realizedCase"],
							additionalProperties: false,
						},
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
					"expletiveEvidence",
					"valencyEvidence",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Circumfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Duplifix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Infix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Interfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Prefix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									hasSepPrefix: {
										anyOf: [
											{ type: "string", minLength: 1 },
											{ type: "null" },
										],
									},
								},
								required: ["hasSepPrefix"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Root": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Suffix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Suffixoid": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Morpheme/Transfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Phraseme/Aphorism": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Phraseme/Collocation": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										anyOf: [
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													participleForm: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Present",
																	"Past",
																],
															},
															{ type: "null" },
														],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"participleForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													participleForm: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Present",
																	"Past",
																],
															},
															{ type: "null" },
														],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"participleForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
										],
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
					expletiveEvidence: {
						anyOf: [
							{
								anyOf: [
									{
										type: "object",
										properties: {
											attested: {
												type: "string",
												minLength: 1,
											},
											orthography: {
												type: "string",
												enum: [
													"Standard",
													"Typo",
													"Shorthand",
												],
											},
										},
										required: ["attested", "orthography"],
										additionalProperties: false,
									},
									{
										type: "object",
										properties: {
											attested: {
												type: "string",
												minLength: 1,
											},
											orthography: {
												type: "string",
												const: "Fused",
											},
											fusion: {
												type: "object",
												properties: {
													spelling: {
														type: "string",
														minLength: 1,
													},
													components: {
														type: "array",
														prefixItems: [
															{
																type: "object",
																properties: {
																	span: {
																		type: "string",
																	},
																	surface: {
																		type: "string",
																		minLength: 1,
																	},
																},
																required: [
																	"span",
																	"surface",
																],
																additionalProperties: false,
															},
															{
																type: "object",
																properties: {
																	span: {
																		type: "string",
																	},
																	surface: {
																		type: "string",
																		minLength: 1,
																	},
																},
																required: [
																	"span",
																	"surface",
																],
																additionalProperties: false,
															},
														],
														items: {
															type: "object",
															properties: {
																span: {
																	type: "string",
																},
																surface: {
																	type: "string",
																	minLength: 1,
																},
															},
															required: [
																"span",
																"surface",
															],
															additionalProperties: false,
														},
													},
												},
												required: [
													"spelling",
													"components",
												],
												additionalProperties: false,
											},
											component: {
												type: "integer",
												minimum: 0,
												maximum: 9007199254740991,
											},
										},
										required: [
											"attested",
											"orthography",
											"fusion",
											"component",
										],
										additionalProperties: false,
									},
								],
							},
							{ type: "null" },
						],
					},
					valencyEvidence: {
						type: "array",
						items: {
							type: "object",
							properties: {
								member: {
									anyOf: [
										{
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991,
										},
										{ type: "null" },
									],
								},
								complement: {
									anyOf: [
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Case",
												},
												case: {
													type: "string",
													enum: [
														"Nom",
														"Acc",
														"Dat",
														"Gen",
													],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Preposition",
												},
												preposition: {
													type: "object",
													properties: {
														unitKind: {
															type: "string",
															const: "Lemma",
														},
														language: {
															type: "string",
															const: "de",
														},
														family: {
															type: "string",
															const: "Lexeme",
														},
														kind: {
															type: "string",
															const: "ADP",
														},
														canonicalForm: {
															type: "string",
															minLength: 1,
														},
														coreFeatures: {
															type: "object",
															properties: {
																abbr: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																adpType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Circ",
																				"Post",
																				"Prep",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																extPos: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"ADV",
																				"SCONJ",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																foreign: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																partType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Vbp",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
															},
															required: [
																"abbr",
																"adpType",
																"extPos",
																"foreign",
																"partType",
															],
															additionalProperties: false,
														},
													},
													required: [
														"unitKind",
														"language",
														"family",
														"kind",
														"canonicalForm",
														"coreFeatures",
													],
													additionalProperties: false,
												},
												case: {
													type: "string",
													enum: ["Acc", "Dat", "Gen"],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"preposition",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
									],
								},
								realizedCase: {
									type: "string",
									enum: ["Nom", "Acc", "Dat", "Gen"],
								},
							},
							required: ["member", "complement", "realizedCase"],
							additionalProperties: false,
						},
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
					"expletiveEvidence",
					"valencyEvidence",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Phraseme/DiscourseFormula": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									discourseFormulaRole: {
										anyOf: [
											{
												type: "string",
												enum: [
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
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["discourseFormulaRole"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Phraseme/Idiom": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										anyOf: [
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Ind",
																	"Sub",
																],
															},
															{ type: "null" },
														],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Past",
																	"Pres",
																],
															},
															{ type: "null" },
														],
													},
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: {
														type: "string",
														enum: ["Imp"],
													},
													number: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Plur",
																	"Sing",
																],
															},
															{ type: "null" },
														],
													},
													person: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{ type: "null" },
														],
													},
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Fin"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Inf"],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													participleForm: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Present",
																	"Past",
																],
															},
															{ type: "null" },
														],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: { type: "null" },
													passive: { type: "null" },
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"participleForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
											{
												type: "object",
												properties: {
													mood: { type: "null" },
													number: { type: "null" },
													person: { type: "null" },
													tense: { type: "null" },
													verbForm: {
														type: "string",
														enum: ["Part"],
													},
													participleForm: {
														anyOf: [
															{
																type: "string",
																enum: [
																	"Present",
																	"Past",
																],
															},
															{ type: "null" },
														],
													},
													expletive: {
														anyOf: [
															{
																type: "string",
																const: "Subject",
															},
															{ type: "null" },
														],
													},
													perfect: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													future: {
														anyOf: [
															{
																type: "string",
																const: "Yes",
															},
															{ type: "null" },
														],
													},
													voice: {
														type: "string",
														enum: ["Pass"],
													},
													passive: {
														type: "string",
														enum: [
															"Process",
															"Recipient",
														],
													},
												},
												required: [
													"mood",
													"number",
													"person",
													"tense",
													"verbForm",
													"participleForm",
													"expletive",
													"perfect",
													"future",
													"voice",
													"passive",
												],
												additionalProperties: false,
											},
										],
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
					expletiveEvidence: {
						anyOf: [
							{
								anyOf: [
									{
										type: "object",
										properties: {
											attested: {
												type: "string",
												minLength: 1,
											},
											orthography: {
												type: "string",
												enum: [
													"Standard",
													"Typo",
													"Shorthand",
												],
											},
										},
										required: ["attested", "orthography"],
										additionalProperties: false,
									},
									{
										type: "object",
										properties: {
											attested: {
												type: "string",
												minLength: 1,
											},
											orthography: {
												type: "string",
												const: "Fused",
											},
											fusion: {
												type: "object",
												properties: {
													spelling: {
														type: "string",
														minLength: 1,
													},
													components: {
														type: "array",
														prefixItems: [
															{
																type: "object",
																properties: {
																	span: {
																		type: "string",
																	},
																	surface: {
																		type: "string",
																		minLength: 1,
																	},
																},
																required: [
																	"span",
																	"surface",
																],
																additionalProperties: false,
															},
															{
																type: "object",
																properties: {
																	span: {
																		type: "string",
																	},
																	surface: {
																		type: "string",
																		minLength: 1,
																	},
																},
																required: [
																	"span",
																	"surface",
																],
																additionalProperties: false,
															},
														],
														items: {
															type: "object",
															properties: {
																span: {
																	type: "string",
																},
																surface: {
																	type: "string",
																	minLength: 1,
																},
															},
															required: [
																"span",
																"surface",
															],
															additionalProperties: false,
														},
													},
												},
												required: [
													"spelling",
													"components",
												],
												additionalProperties: false,
											},
											component: {
												type: "integer",
												minimum: 0,
												maximum: 9007199254740991,
											},
										},
										required: [
											"attested",
											"orthography",
											"fusion",
											"component",
										],
										additionalProperties: false,
									},
								],
							},
							{ type: "null" },
						],
					},
					valencyEvidence: {
						type: "array",
						items: {
							type: "object",
							properties: {
								member: {
									anyOf: [
										{
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991,
										},
										{ type: "null" },
									],
								},
								complement: {
									anyOf: [
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Case",
												},
												case: {
													type: "string",
													enum: [
														"Nom",
														"Acc",
														"Dat",
														"Gen",
													],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
										{
											type: "object",
											properties: {
												kind: {
													type: "string",
													const: "Preposition",
												},
												preposition: {
													type: "object",
													properties: {
														unitKind: {
															type: "string",
															const: "Lemma",
														},
														language: {
															type: "string",
															const: "de",
														},
														family: {
															type: "string",
															const: "Lexeme",
														},
														kind: {
															type: "string",
															const: "ADP",
														},
														canonicalForm: {
															type: "string",
															minLength: 1,
														},
														coreFeatures: {
															type: "object",
															properties: {
																abbr: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																adpType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Circ",
																				"Post",
																				"Prep",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																extPos: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"ADV",
																				"SCONJ",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																foreign: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Yes",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
																partType: {
																	anyOf: [
																		{
																			type: "string",
																			enum: [
																				"Vbp",
																			],
																		},
																		{
																			type: "null",
																		},
																	],
																},
															},
															required: [
																"abbr",
																"adpType",
																"extPos",
																"foreign",
																"partType",
															],
															additionalProperties: false,
														},
													},
													required: [
														"unitKind",
														"language",
														"family",
														"kind",
														"canonicalForm",
														"coreFeatures",
													],
													additionalProperties: false,
												},
												case: {
													type: "string",
													enum: ["Acc", "Dat", "Gen"],
												},
												referent: {
													type: "string",
													enum: [
														"Someone",
														"Something",
														"Either",
													],
												},
											},
											required: [
												"kind",
												"preposition",
												"case",
												"referent",
											],
											additionalProperties: false,
										},
									],
								},
								realizedCase: {
									type: "string",
									enum: ["Nom", "Acc", "Dat", "Gen"],
								},
							},
							required: ["member", "complement", "realizedCase"],
							additionalProperties: false,
						},
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
					"expletiveEvidence",
					"valencyEvidence",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/de/Phraseme/Proverb": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/ADJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADP", "ADV", "SCONJ"],
											},
											{ type: "null" },
										],
									},
									numForm: {
										anyOf: [
											{
												type: "string",
												enum: ["Combi", "Word"],
											},
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Frac", "Ord"],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{ type: "string", enum: ["Expr"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"numForm",
									"numType",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											degree: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cmp",
															"Pos",
															"Sup",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["degree"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/ADP": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADP", "ADV", "SCONJ"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "extPos"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/ADV": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: [
													"ADP",
													"ADV",
													"CCONJ",
													"SCONJ",
												],
											},
											{ type: "null" },
										],
									},
									numForm: {
										anyOf: [
											{ type: "string", enum: ["Word"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Frac", "Mult", "Ord"],
											},
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												anyOf: [
													{
														type: "string",
														enum: [
															"Dem",
															"Ind",
															"Int",
															"Neg",
															"Rel",
															"Tot",
														],
													},
													{
														type: "array",
														prefixItems: [
															{
																type: "string",
																enum: [
																	"Dem",
																	"Ind",
																	"Int",
																	"Neg",
																	"Rel",
																	"Tot",
																],
															},
														],
														items: {
															type: "string",
															enum: [
																"Dem",
																"Ind",
																"Int",
																"Neg",
																"Rel",
																"Tot",
															],
														},
													},
												],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{
												type: "string",
												enum: ["Expr", "Slng"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"numForm",
									"numType",
									"pronType",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											degree: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cmp",
															"Pos",
															"Sup",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["degree"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/AUX": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{
												type: "string",
												enum: ["Arch", "Vrnc"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "style"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											mood: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Imp",
															"Ind",
															"Sub",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											person: {
												anyOf: [
													{
														type: "string",
														enum: ["1", "2", "3"],
													},
													{ type: "null" },
												],
											},
											tense: {
												anyOf: [
													{
														type: "string",
														enum: ["Past", "Pres"],
													},
													{ type: "null" },
												],
											},
											verbForm: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fin",
															"Inf",
															"Part",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"mood",
											"number",
											"person",
											"tense",
											"verbForm",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/CCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									polarity: {
										anyOf: [
											{ type: "string", enum: ["Neg"] },
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "polarity"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/DET": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									definite: {
										anyOf: [
											{
												type: "string",
												enum: ["Def", "Ind"],
											},
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADV", "PRON"],
											},
											{ type: "null" },
										],
									},
									numForm: {
										anyOf: [
											{ type: "string", enum: ["Word"] },
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{ type: "string", enum: ["Frac"] },
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												anyOf: [
													{
														type: "string",
														enum: [
															"Art",
															"Dem",
															"Ind",
															"Int",
															"Neg",
															"Rcp",
															"Rel",
															"Tot",
														],
													},
													{
														type: "array",
														prefixItems: [
															{
																type: "string",
																enum: [
																	"Art",
																	"Dem",
																	"Ind",
																	"Int",
																	"Neg",
																	"Rcp",
																	"Rel",
																	"Tot",
																],
															},
														],
														items: {
															type: "string",
															enum: [
																"Art",
																"Dem",
																"Ind",
																"Int",
																"Neg",
																"Rcp",
																"Rel",
																"Tot",
															],
														},
													},
												],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{ type: "string", enum: ["Vrnc"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"definite",
									"extPos",
									"numForm",
									"numType",
									"pronType",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/INTJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									polarity: {
										anyOf: [
											{
												type: "string",
												enum: ["Neg", "Pos"],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{ type: "string", enum: ["Expr"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"foreign",
									"polarity",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/NOUN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADV", "PROPN"],
											},
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									numForm: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Combi",
													"Digit",
													"Word",
												],
											},
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Frac", "Ord"],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{
												type: "string",
												enum: ["Expr", "Vrnc"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"foreign",
									"numForm",
									"numType",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											article: {
												type: "string",
												enum: [
													"Definite",
													"Indefinite",
													"None",
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Plur",
															"Ptan",
															"Sing",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["article", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/NUM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{ type: "string", enum: ["PROPN"] },
											{ type: "null" },
										],
									},
									numForm: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Digit",
													"Roman",
													"Word",
												],
											},
											{ type: "null" },
										],
									},
									numType: {
										anyOf: [
											{
												type: "string",
												enum: ["Card", "Frac"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"numForm",
									"numType",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/X": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									extPos: {
										anyOf: [
											{ type: "string", enum: ["PROPN"] },
											{ type: "null" },
										],
									},
									foreign: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["extPos", "foreign"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/PART": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{ type: "string", enum: ["CCONJ"] },
											{ type: "null" },
										],
									},
									polarity: {
										anyOf: [
											{ type: "string", enum: ["Neg"] },
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "extPos", "polarity"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/PRON": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADV", "PRON"],
											},
											{ type: "null" },
										],
									},
									person: {
										anyOf: [
											{
												type: "string",
												enum: ["1", "2", "3"],
											},
											{ type: "null" },
										],
									},
									poss: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												anyOf: [
													{
														type: "string",
														enum: [
															"Dem",
															"Emp",
															"Ind",
															"Int",
															"Neg",
															"Prs",
															"Rcp",
															"Rel",
															"Tot",
														],
													},
													{
														type: "array",
														prefixItems: [
															{
																type: "string",
																enum: [
																	"Dem",
																	"Emp",
																	"Ind",
																	"Int",
																	"Neg",
																	"Prs",
																	"Rcp",
																	"Rel",
																	"Tot",
																],
															},
														],
														items: {
															type: "string",
															enum: [
																"Dem",
																"Emp",
																"Ind",
																"Int",
																"Neg",
																"Prs",
																"Rcp",
																"Rel",
																"Tot",
															],
														},
													},
												],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Arch",
													"Coll",
													"Expr",
													"Slng",
													"Vrnc",
												],
											},
											{ type: "null" },
										],
									},
									case: {
										anyOf: [
											{
												type: "string",
												enum: ["Acc", "Gen", "Nom"],
											},
											{ type: "null" },
										],
									},
									gender: {
										anyOf: [
											{
												type: "string",
												enum: ["Fem", "Masc", "Neut"],
											},
											{ type: "null" },
										],
									},
									number: {
										anyOf: [
											{
												type: "string",
												enum: ["Plur", "Sing"],
											},
											{ type: "null" },
										],
									},
									reflex: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"person",
									"poss",
									"pronType",
									"style",
									"case",
									"gender",
									"number",
									"reflex",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/PROPN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{ type: "string", enum: ["PROPN"] },
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{ type: "string", enum: ["Expr"] },
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "extPos", "style"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											number: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Plur",
															"Ptan",
															"Sing",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/PUNCT": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/SCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADP", "SCONJ"],
											},
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{ type: "string", enum: ["Vrnc"] },
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "extPos", "style"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/SYM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADP", "PROPN"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "extPos"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Lexeme/VERB": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									extPos: {
										anyOf: [
											{
												type: "string",
												enum: ["ADP", "CCONJ", "PROPN"],
											},
											{ type: "null" },
										],
									},
									phrasal: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									style: {
										anyOf: [
											{
												type: "string",
												enum: ["Expr", "Vrnc"],
											},
											{ type: "null" },
										],
									},
								},
								required: [
									"abbr",
									"extPos",
									"phrasal",
									"style",
								],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											mood: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Imp",
															"Ind",
															"Sub",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											person: {
												anyOf: [
													{
														type: "string",
														enum: ["1", "2", "3"],
													},
													{ type: "null" },
												],
											},
											tense: {
												anyOf: [
													{
														type: "string",
														enum: ["Past", "Pres"],
													},
													{ type: "null" },
												],
											},
											verbForm: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Fin",
															"Ger",
															"Inf",
															"Part",
														],
													},
													{ type: "null" },
												],
											},
											voice: {
												anyOf: [
													{
														type: "string",
														enum: ["Pass"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"mood",
											"number",
											"person",
											"tense",
											"verbForm",
											"voice",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Circumfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Duplifix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Infix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Interfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Prefix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Root": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Suffix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Suffixoid": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/ToneMarking": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Morpheme/Transfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Phraseme/Aphorism": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Phraseme/DiscourseFormula": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									discourseFormulaRole: {
										anyOf: [
											{
												type: "string",
												enum: [
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
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["discourseFormulaRole"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Phraseme/Idiom": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/en/Phraseme/Proverb": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/ADJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["abbr"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											definite: {
												anyOf: [
													{
														type: "string",
														enum: ["Cons", "Def"],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"definite",
											"gender",
											"number",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/ADP": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									case: {
										anyOf: [
											{
												type: "string",
												enum: ["Acc", "Gen"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "case"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/ADV": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									prefix: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["prefix"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/AUX": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									verbType: {
										anyOf: [
											{
												type: "string",
												enum: ["Cop", "Mod"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["verbType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											person: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"1",
																			"2",
																			"3",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"1",
																		"2",
																		"3",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											polarity: {
												anyOf: [
													{
														type: "string",
														enum: ["Neg", "Pos"],
													},
													{ type: "null" },
												],
											},
											tense: {
												anyOf: [
													{
														type: "string",
														enum: ["Fut", "Past"],
													},
													{ type: "null" },
												],
											},
											verbForm: {
												anyOf: [
													{
														type: "string",
														enum: ["Inf", "Part"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"gender",
											"number",
											"person",
											"polarity",
											"tense",
											"verbForm",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/CCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/DET": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									pronType: {
										anyOf: [
											{
												type: "string",
												enum: ["Art", "Int"],
											},
											{ type: "null" },
										],
									},
								},
								required: ["pronType"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											definite: {
												anyOf: [
													{
														type: "string",
														enum: ["Cons", "Def"],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"definite",
											"gender",
											"number",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/INTJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/NOUN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									gender: {
										anyOf: [
											{
												anyOf: [
													{
														type: "string",
														enum: ["Fem", "Masc"],
													},
													{
														type: "array",
														prefixItems: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
														],
														items: {
															type: "string",
															enum: [
																"Fem",
																"Masc",
															],
														},
													},
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "gender"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											definite: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Cons",
															"Def",
															"Ind",
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Dual",
																	"Plur",
																	"Sing",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Dual",
																			"Plur",
																			"Sing",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Dual",
																		"Plur",
																		"Sing",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
										},
										required: ["definite", "number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/NUM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											definite: {
												anyOf: [
													{
														type: "string",
														enum: ["Cons", "Def"],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Dual",
																	"Plur",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Dual",
																			"Plur",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Dual",
																		"Plur",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"definite",
											"gender",
											"number",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/X": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/PART": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/PRON": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									definite: {
										anyOf: [
											{ type: "string", enum: ["Def"] },
											{ type: "null" },
										],
									},
									pronType: {
										anyOf: [
											{
												type: "string",
												enum: [
													"Dem",
													"Ind",
													"Int",
													"Prs",
												],
											},
											{ type: "null" },
										],
									},
									reflex: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["definite", "pronType", "reflex"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											person: {
												anyOf: [
													{
														type: "string",
														enum: ["1", "2", "3"],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"gender",
											"number",
											"person",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/PROPN": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									abbr: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
									gender: {
										anyOf: [
											{
												anyOf: [
													{
														type: "string",
														enum: ["Fem", "Masc"],
													},
													{
														type: "array",
														prefixItems: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
														],
														items: {
															type: "string",
															enum: [
																"Fem",
																"Masc",
															],
														},
													},
												],
											},
											{ type: "null" },
										],
									},
								},
								required: ["abbr", "gender"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
										},
										required: ["number"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/PUNCT": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/SCONJ": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									case: {
										anyOf: [
											{ type: "string", enum: ["Tem"] },
											{ type: "null" },
										],
									},
								},
								required: ["case"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/SYM": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Lexeme/VERB": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {
									hebBinyan: {
										anyOf: [
											{
												type: "string",
												enum: [
													"HIFIL",
													"HITPAEL",
													"HUFAL",
													"NIFAL",
													"PAAL",
													"PIEL",
													"PUAL",
												],
											},
											{ type: "null" },
										],
									},
									hebExistential: {
										anyOf: [
											{ type: "string", enum: ["Yes"] },
											{ type: "null" },
										],
									},
								},
								required: ["hebBinyan", "hebExistential"],
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
							inflectionalFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											definite: {
												anyOf: [
													{
														type: "string",
														enum: ["Cons", "Def"],
													},
													{ type: "null" },
												],
											},
											gender: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"Fem",
																	"Masc",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"Fem",
																			"Masc",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"Fem",
																		"Masc",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											mood: {
												anyOf: [
													{
														type: "string",
														enum: ["Imp"],
													},
													{ type: "null" },
												],
											},
											number: {
												anyOf: [
													{
														type: "string",
														enum: ["Plur", "Sing"],
													},
													{ type: "null" },
												],
											},
											person: {
												anyOf: [
													{
														anyOf: [
															{
																type: "string",
																enum: [
																	"1",
																	"2",
																	"3",
																],
															},
															{
																type: "array",
																prefixItems: [
																	{
																		type: "string",
																		enum: [
																			"1",
																			"2",
																			"3",
																		],
																	},
																],
																items: {
																	type: "string",
																	enum: [
																		"1",
																		"2",
																		"3",
																	],
																},
															},
														],
													},
													{ type: "null" },
												],
											},
											polarity: {
												anyOf: [
													{
														type: "string",
														enum: ["Neg", "Pos"],
													},
													{ type: "null" },
												],
											},
											tense: {
												anyOf: [
													{
														type: "string",
														enum: ["Fut", "Past"],
													},
													{ type: "null" },
												],
											},
											verbForm: {
												anyOf: [
													{
														type: "string",
														enum: ["Inf", "Part"],
													},
													{ type: "null" },
												],
											},
											voice: {
												anyOf: [
													{
														type: "string",
														enum: [
															"Act",
															"Mid",
															"Pass",
														],
													},
													{ type: "null" },
												],
											},
										},
										required: [
											"definite",
											"gender",
											"mood",
											"number",
											"person",
											"polarity",
											"tense",
											"verbForm",
											"voice",
										],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: [
							"spelling",
							"surfaceFeatures",
							"inflectionalFeatures",
						],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Circumfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Duplifix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Infix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Interfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Prefix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Root": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Suffix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Suffixoid": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/ToneMarking": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Morpheme/Transfix": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Phraseme/Aphorism": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Phraseme/DiscourseFormula": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Phraseme/Idiom": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
	"grammar/he/Phraseme/Proverb": {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		anyOf: [
			{
				type: "object",
				properties: {
					lemma: {
						type: "object",
						properties: {
							canonicalForm: { type: "string", minLength: 1 },
							coreFeatures: {
								type: "object",
								properties: {},
								additionalProperties: false,
							},
						},
						required: ["canonicalForm", "coreFeatures"],
						additionalProperties: false,
					},
					surface: {
						type: "object",
						properties: {
							spelling: {
								type: "string",
								enum: ["Canonical", "Variant"],
							},
							surfaceFeatures: {
								anyOf: [
									{
										type: "object",
										properties: {
											historicalStatus: {
												anyOf: [
													{
														type: "string",
														const: "Archaic",
													},
													{ type: "null" },
												],
											},
										},
										required: ["historicalStatus"],
										additionalProperties: false,
									},
									{ type: "null" },
								],
							},
						},
						required: ["spelling", "surfaceFeatures"],
						additionalProperties: false,
					},
					normalizedMembers: {
						minItems: 1,
						type: "array",
						items: { type: "string", minLength: 1 },
					},
					memberOrthographies: {
						minItems: 1,
						type: "array",
						items: {
							type: "string",
							enum: ["Standard", "Typo", "Fused", "Shorthand"],
						},
					},
					realizationCoverage: {
						type: "string",
						enum: ["Full", "Partial"],
					},
				},
				required: [
					"lemma",
					"surface",
					"normalizedMembers",
					"memberOrthographies",
					"realizationCoverage",
				],
				additionalProperties: false,
			},
			{
				type: "object",
				properties: {
					decision: { type: "string", const: "Unresolved" },
				},
				required: ["decision"],
				additionalProperties: false,
			},
		],
	},
};

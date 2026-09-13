export const unitKinds=["Lemma","Surface","Reading","Attestation"] as const;
export function sample(i=0,unitKind:string="Surface") {
 const language=`l${i%5}`,family=`F${Math.floor(i/5)%4}`,kind=`K${Math.floor(i/20)}`;
 const lemma={language,family,kind,canonicalForm:"Haus",coreFeatures:{code:`r${i}`,gender:"Neut",hyph:null,flags:["Rare"]}};
 const surface={lemma,normalizedSurface:"Häuser",spelling:"Canonical",inflectionalFeatures:{case:"Nom",number:"Plur",person:null}};
 const value=unitKind==="Lemma"?lemma:unitKind==="Surface"?surface:unitKind==="Reading"?{lemma,emojiDescription:"🏠"}:{surface,members:[{attested:"Häuser",orthography:"Canonical"}],realizationCoverage:"Full"};
 return {unitKind,language,family,kind,value};
}

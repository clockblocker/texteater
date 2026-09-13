export type Result<T> = {success:true;data:T}|{success:false;issues:unknown};
export type Expected={unitKind:string;language:string;family:string;kind:string};
const fail=():Result<never>=>({success:false,issues:[{path:[],message:"Unsupported unit route or envelope"}]});
export function dispatch(input:unknown, registry:object, parse:(schema:unknown,value:unknown)=>Result<unknown>,expected?:Expected):Result<unknown>{
 if(typeof input!=="object"||input===null||Array.isArray(input))return fail();
 const obj=input as Record<string,unknown>;
 if(Object.keys(obj).length!==5||!Object.hasOwn(obj,"value"))return fail();
 for(const key of ["unitKind","language","family","kind"] as const){if(!Object.hasOwn(obj,key)||typeof obj[key]!=="string"||(expected&&obj[key]!==expected[key]))return fail();}
 if(typeof obj.value!=="object"||obj.value===null||Array.isArray(obj.value))return fail();
 const route=`${obj.language}/${obj.family}/${obj.kind}`;
 if(!Object.hasOwn(registry,route))return fail();
 const selected=(registry as Record<string,Record<string,unknown>>)[route]!;
 if(!Object.hasOwn(selected,obj.unitKind as string))return fail();
 return parse(selected[obj.unitKind as string],obj.value);
}

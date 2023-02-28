import * as bp from "./bodyParser";
import * as parser from "./parser";
import {Op} from "./helperParser";


/*
> one-byte section id
> uint32 size of the contents, in bytes
> actual contents, whose structure is depended on the section id
*/
export type WASMModule = {
    version: number;
    sections: WASMSection<any>[];
}
export enum WASMSectionID {
    WACustom=0,
    WAType,
    WAImport,
    WAFunction,
    WATable,
    WAMemory,
    WAGlobal,
    WAExport,
    WAStart,
    WAElement,
    WACode,
    WAData,
    WADataCount
}
export type WASMSection<A> = {
    id: WASMSectionID,
    size: number,
    content:A[] | A | null
}

//***to be defined***
// CUSTOM SECTION [ID 00]
export type custom = {
    name: namesVector,
    bytes: number[]

}
// TYPE SECTION [ID 01]
//payload of function signatures
export type funcType = {
    parameters:bytesVector,
    returns:bytesVector
}
// IMPORT SECTION [ID 02]
// vector of imports
// (import "module_name" "function_name" (func ...)) <== that's an import in .wat format
export type imports = {
    module:namesVector,
    name:namesVector,
    description: descTypes
}
// GLOBAL SECTION [ID 06]
export type global = {
    gt:globalType,
    expr:Op[]
}
// EXPORT SECTION [ID 07]
export type exports = {
    name:namesVector,
    description: descTypes
}
// ELEMENT SECTION [ID 09]
export type elem = {
    type: refType,
    init: number[],
    mode: elemmode,
    activemode: {table: number, offset: number[]} | null // just for active elemmode
}

// CODE SECTION [ID 10]
export type code = {
    codeSize: number,
    content: funcComponent
}
export type block = {
    bt:blockType,
    expr:Op[]
}

// DATA SECTION [ID 11]
export type data = {
    init: number[],
    mode: elemmode,
    activemode: {memory: number, offset: number[]} | null // just for active elemmode
}

// helper types

export type bytesVector = [count:number, bytes:Uint8Array];
export type namesVector = [count:number, bytes:string];
export type limits = { // also encoding for memory types
    flag: flag,
    min: number,
    max: number | undefined
}
export type flag = 0x00 | 0x01; // 0 => min | 1 => min, max
export type numType = 0x7F | 0x7E | 0x7D | 0x7C;
export type refType = funcref | externref;
export type funcref = 0x70;
export type externref = 0x6f;
export type vecType = 0x7B;
export type valType = numType | vecType | refType;
export const valTypeSet = new Set([0x7F, 0x7E, 0x7D, 0x7C, 0x7B, 0x70, 0x6f]); // used for blocktype parsing

export type descTypes = number | tableType | limits | globalType;
export type elemmode = 0x00 | 0x01 | 0x02 // passive | active | declarative
export type blockType = 0x40 | valType | number;
export type memarg = [number, number]; //align, offset
export type tableType = {
    et: refType, //element reference type
    lim: limits
}
// {kind: "globaltype", valtype: any, mutable: boolean}
export type globalType = {
    valtype: valType,
    mutability: flag // 0 => constant | 1 => variable 
}

export type funcComponent = {
    locals: localsVal[],
    body: Op[]
}
export type localsVal = {
    value: number | bigint,
    type: valType
}
export type globalsVal = {

    value: number | bigint
    type: globalType,
    
}
// 0x00:func, 0x01:table, 0x02:mem, 0x03:global
// export type importDesc = 0x00 | 0x01 | 0x02 | 0x03

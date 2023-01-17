import * as bp from "./bodyParser";
import * as parser from "./parser";
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
    content:A[]
}

//***to be defined***

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


// helper types

export type bytesVector = [count:number, bytes:Uint8Array];
export type namesVector = [count:number, bytes:string];
export type limits = {
    min: number,
    max: number | undefined
}
export type numType = 0x7F | 0x7E | 0x7D | 0x7C;
export type refType = 0x70 | 0x6f;
export type valType = numType | Array<any> | refType;

export type tableType = {
    et:refType, //element reference type
    lim: limits
}
export type memType = {
    lim: limits
}
// {kind: "globaltype", valtype: any, mutable: boolean}
export type globalType = {
    valtype: valType,
    mutability: boolean //0 => constant | 1 => variable 
}

export type descTypes = number | tableType | memType | globalType;

// 0x00:func, 0x01:table, 0x02:mem, 0x03:global
// export type importDesc = 0x00 | 0x01 | 0x02 | 0x03

import * as bp from "./bodyParser";
import * as parser from "./parser";
/*
> one-byte section id
> uint32 size of the contents, in bytes
> actual contents, whose structure is depended on the section id
*/
export type WASMModule = {
    version: number;
    sections: WASMSection[];
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
export type WASMSection = {
    id: WASMSectionID,
    size: number,
    content:bp.ParsedBody | Object
}

//***to be defined***

// export type valType = numberType | vectorType | resultType;
// export type resultType = valType[];


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
    description:parser.Section
}

// helper types

// //this is used for inner vectors, the body class is already a vector
// export type vectorType = {

//     // count of entries in the vector, needed because it is a converted leb128
//     count: number,
//     elements: []
// }

export type bytesVector = [count:number, bytes:Uint8Array];
export type namesVector = [count:number, bytes:string];

// 0x00:func, 0x01:table, 0x02:mem, 0x03:global
// export type importDesc = 0x00 | 0x01 | 0x02 | 0x03

import * as bp from "./bodyParser";
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
    content:bp.TypeParsedBody | Object
}

//WASM Types

export type numberTypes =  0x7F | 0x7E | 0x7D | 0x7C // i32, i64, f32, f64

//***to be defined***

// export type valType = numberType | vectorType | resultType;
// export type vectorType = {
//     length: number, //to decode with leb128
//     elements:[];
// }
// export type resultType = valType[];

//payload of function signatures

export type funcType = {
    parameters:tupleType,
    returns:tupleType
}
export type tupleType = [count:number, types:Uint8Array];

// export type vectorType = {
//     // count of entries in the vector
//     count: number,
//     elements: []
// }
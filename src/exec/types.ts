import { valType, namesVector, limits, tableType, globalType, refType } from "../types"
import { Op } from "../helperParser"
import {WasmFuncType, WasmType} from "./wasmm"

// Instances
export type FuncInst = {
    type: WasmFuncType,
    module: WebAssemblyMtsModule,
    code: Op[]
}
export type TableInst = {
    type: tableType,
    elem: number[] // vector of ref
}
export type MemInst = {
    type: limits,
    data: number[]
}
export type GlobalInst = {
    mut: "const" | "mut"
    type: WasmType,
    value: number | BigInt // | internalfunction references | external function refs
    init: Op[]
}
export type ElemInst = {
    type: refType,
    data: number[]
}
export type DataInst = {
    data: number[]
}

// export type func = {
//     type: number, // typeidx
//     locals: valType[],
//     body: number[]
// }

// Addresses
export type Addr = valType[] | FuncAddr | TableAddr | MemAddr | GlobalAddr | ElemAddr | DataAddr | ExportInst;
export type ExternVal = FuncAddr | TableAddr | MemAddr | GlobalAddr;
export type FuncAddr = {
    kind: "funcaddr",
    val: number
}
export type TableAddr = {
    kind: "tableaddr",
    val: number
}
export type MemAddr = {
    kind: "memaddr",
    val: number
}
export type GlobalAddr = {
    kind: "globaladdr",
    val: number
}
export type ElemAddr = {
    kind: "elemaddr",
    val: number
}
export type DataAddr = {
    kind: "dataaddr",
    val: number
}
export type ExportInst = {
    name: namesVector,
    value: ExternVal
}

// Module addresses
export type WebAssemblyMtsModule = {
    types: WasmFuncType[],
    funcs: FuncAddr[],
    tables: TableAddr[],
    mems: MemAddr[],
    globals: GlobalAddr[],
    elems: ElemAddr[],
    datas: DataAddr[],
    exports: ExportInst[]
}
export type Store = {
    funcs: FuncInst[],
    tables: TableInst[],
    mems: MemInst[],
    globals: GlobalInst[],
    
    
    // globals: 

}
export type WebAssemblyMtsInstantiatedSource = {
    module: WebAssemblyMtsModule,
    instance: WebAssemblyMtsInstantiatedSource
}



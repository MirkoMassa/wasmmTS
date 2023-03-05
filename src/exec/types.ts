import { valType, namesVector, limits, tableType, globalType, refType, funcType, funcComponent } from "../types"
import { Op } from "../helperParser"
import {WasmFuncType, WasmType} from "./wasmm"
export enum ValTypeEnum {
     i32 = 0x7F,
     i64 = 0x7E,
     f32 = 0x7D,
     f64 = 0x7C,
     funcref = 0x70,
     externref = 0x6f,
     vectype = 0x7B
}
// Instances
export type FuncInst = {
    type: WasmFuncType,
    module: WebAssemblyMtsModule,
    code: funcComponent
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
    valName: string,
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

// export type ExportValue = {
//     name: string,
//     value: ExternVal
// }
export type WebAssemblyMtsInstance = {
    exports: {[key: string]:Function},
    object: object | undefined
}
export type Store = {
    funcs: FuncInst[],
    tables: TableInst[],
    mems: MemInst[],
    globals: GlobalInst[],
}

export type WebAssemblyMtsInstantiatedSource = {
    module: WebAssemblyMtsModule,
    instance: WebAssemblyMtsInstance
}

export type FuncRef = {value: number, type:0x70};
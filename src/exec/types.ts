import {
  valType,
  namesVector,
  limits,
  tableType,
  globalType,
  refType,
  funcType,
  funcComponent,
} from "../types";
import { Op } from "../helperParser";
import {
  MaskedArrayObject,
  WasmFuncType,
  WasmType,
  WebAssemblyMtsStore,
} from "./wasmm";
import { Opcode } from "../opcodes";
export enum ValTypeEnum {
  i32 = 0x7f,
  i64 = 0x7e,
  f32 = 0x7d,
  f64 = 0x7c,
  funcref = 0x70,
  externref = 0x6f,
  vectype = 0x7b,
}
export const rawConstBits = {
  [Opcode.I32Const]: 32,
  [Opcode.I64Const]: 64,
  [Opcode.F32Const]: 32,
  [Opcode.F64Const]: 64,
};
export type WasmConsts =
  | Opcode.I32Const
  | Opcode.I64Const
  | Opcode.F32Const
  | Opcode.F64Const;

// Instances
export type FuncInst = {
  type: WasmFuncType;
  module: WebAssemblyMtsModule;
  code: funcComponent;
};
export type TableInst = {
  type: tableType;
  elem: number[]; // vector of ref
};
export type MemInst = {
  type: limits;
  data: MaskedArrayObject | {};
  // data: Uint8Array,
  length: number;
};
export type GlobalInst = {
  mut: "const" | "mut";
  type: WasmType;
  value: number | BigInt; // | internalfunction references | external function refs
  init: Op[];
};
export type ElemInst = {
  type: refType;
  data: number[];
  offset: number;
  table: number;
};
export type DataInst = {
  data: number[];
};

// Addresses
export type Addr =
  | valType[]
  | FuncAddr
  | TableAddr
  | MemAddr
  | GlobalAddr
  | ElemAddr
  | DataAddr
  | ExportInst;
export type ExternVal = FuncAddr | TableAddr | MemAddr | GlobalAddr;
export type FuncAddr = {
  kind: "funcaddr";
  val: number;
};
export type TableAddr = {
  kind: "tableaddr";
  val: number;
};
export type MemAddr = {
  kind: "memaddr";
  val: number;
};
export type GlobalAddr = {
  kind: "globaladdr";
  val: number;
};
export type ElemAddr = {
  kind: "elemaddr";
  val: number;
};
export type DataAddr = {
  kind: "dataaddr";
  val: number;
};
export type ExportInst = {
  valName: string;
  value: ExternVal;
};

// Module addresses
export type WebAssemblyMtsModule = {
  types: WasmFuncType[];
  funcs: FuncAddr[];
  tables: TableAddr[];
  mems: MemAddr[];
  globals: GlobalAddr[];
  elems: ElemAddr[];
  datas: DataAddr[];
  exports: ExportInst[];
};

// export type ExportValue = {
//     name: string,
//     value: ExternVal
// }
export type WebAssemblyMtsInstance = {
  exports: { [key: string]: any };
  exportsTT: { [key: string]: any };
  object: object | undefined;
  custom: object;
};
export type Store = {
  funcs: FuncInst[];
  tables: TableInst[];
  mems: MemInst[];
  globals: GlobalInst[];
};

export type WebAssemblyMtsInstantiatedSource = {
  module: WebAssemblyMtsModule;
  instance: WebAssemblyMtsInstance;
};

export type FuncRef = { value: number; type: 0x70 };

export type ops = "replace" | "add" | "remove";
export type patchPath = (string | number)[];
export type patchValues = number | Op | number[];

export type patch = { op: ops; path: patchPath; value: patchValues };

export type storeProducePatches = {
  states: WebAssemblyMtsStore[];
  patches: patch[][];
  previousPatches: any[][];
};

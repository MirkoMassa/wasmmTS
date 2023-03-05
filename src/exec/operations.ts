import { assert } from 'console';
import { Op, IfElseOp, BlockOp } from '../helperParser';
import {Opcode} from "../opcodes"
import { valType, localsVal } from '../types';
import { FuncRef } from './types';
import { ValTypeEnum } from './types'
import { WebAssemblyMtsStore, WasmType, WasmFuncType, Label } from './wasmm';
// utils
export function checkDualArityFn(x:Op, y:Op, opcode:Opcode) {
    if(x.id != opcode || y.id != opcode) 
    throw new Error (`Invalid number types expect (${Opcode[opcode]}, ${Opcode[opcode]}) got [${Opcode[x.id]},${Opcode[y.id]}]`);
}
export function checkTypeOpcode(x:Op, opcode:Opcode) {
    if(x.id != opcode) 
    throw new Error (`Invalid number types expect (${Opcode[opcode]}) got [${Opcode[x.id]}]`);
}
export function checkValTypeAndOp(x:Op, y:valType){
    const valToOp = convertValTypeToOpCode(y)
    if(x.id != valToOp) 
    throw new Error (`Invalid valType expect (${ValTypeEnum[y]}) got [${Opcode[x.id]}]`);
}
export function convertValTypeToOpCode(vt:valType):Opcode{
    switch(vt){
        case 0x7F: return Opcode.I32Const;
        case 0x7E: return Opcode.I64Const;
        case 0x7D: return Opcode.F32Const;
        case 0x7C: return Opcode.F64Const;
        case 0x70: return Opcode.RefFunc;
        // case 0x6f: return //externref
        default: throw new Error ('Unexpected valType');
    }
}

function isFuncRef(x: unknown): x is FuncRef {
    // @ts-ignore
    return typeof x == "object" && x != null && x.type !== undefined && x.type === 0x70;
}
function isValType(type: unknown): boolean{
    switch(type){
        case 0x7F:
        case 0x7E:
        case 0x7D:
        case 0x7C:
        case 0x70:
        case 0x6f: 
            return true;
        default: return false;
    }
}

export function processParams(arity:number, types: WasmType[], args: unknown[], locals:localsVal[]){
    if(arity<args.length) throw new Error (`Unexpected number of parameters. Got ${args.length}, expected ${arity}.`);
    for (let i = 0; i < args.length; i++) {
        let currentArg = args[i];
        if(typeof args[i] == "number") {
            // i32 f32 f64
            switch(types[i]){
                case 'i32':
                case 'f32':
                case 'f64':
                //All ok
                locals[i].value = currentArg as number; break;
                default: throw new Error();
            }
        }else if(typeof args[i] == "bigint") {
            // i64
            if(types[i] != 'i64') throw new Error();
            locals[i].value = currentArg as bigint;

        }else if(isFuncRef(currentArg)) {
            if(types[i] != "funcref" && typeof types[i] !== "function") throw new Error();
            // idk @todo
        }
    }
}

export function executeBlock(block:BlockOp, moduleTypes:WasmFuncType[]){
    // // if bt is the actual numType of the block
    // if(isValType(block.bt)) return new Label(1, block.expr);
    // // if bt is the index of moduleTypes (normal type reference)
    // const blockTypes = moduleTypes[block.bt];
    // return new Label(, block.expr);

    
}

// OPERATIONS

// math op
export function i32add(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.I32Const);
    const res:number = (x.args as number) + (y.args as number);
    return new Op(Opcode.I32Const, res)
}
export function i32sub(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.I32Const);
    const res:number = (x.args as number) - (y.args as number);
    return new Op(Opcode.I32Const, res)
}
export function i32mul(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.I32Const);
    const res:number = (x.args as number) * (y.args as number);
    return new Op(Opcode.I32Const, res)
}
export function i32div(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.I32Const);
    const res:number = Math.floor((x.args as number) / (y.args as number));
    return new Op(Opcode.I32Const, res)
}

export function i64add(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.I64Const);
    const res:number = (x.args as number) + (y.args as number);
    return new Op(Opcode.I64Const, res)
}
export function i64sub(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.I64Const);
    const res:number = (x.args as number) - (y.args as number);
    return new Op(Opcode.I64Const, res)
}
export function i64mul(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.I64Const);
    const res:number = (x.args as number) * (y.args as number);
    return new Op(Opcode.I64Const, res)
}
export function i64div(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.I64Const);
    const res:number = Math.floor((x.args as number) / (y.args as number));
    return new Op(Opcode.I64Const, res)
}

export function f32add(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.F32Const);
    const res:number = (x.args as number) + (y.args as number);
    return new Op(Opcode.F32Const, res)
}
export function f32sub(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.F32Const);
    const res:number = (x.args as number) - (y.args as number);
    return new Op(Opcode.F32Const, res)
}
export function f32mul(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.F32Const);
    const res:number = (x.args as number) * (y.args as number);
    return new Op(Opcode.F32Const, res)
}
export function f32div(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.F32Const);
    const res:number = (x.args as number) / (y.args as number);
    return new Op(Opcode.F32Const, res)
}

export function f64add(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.F64Const);
    const res:number = (x.args as number) + (y.args as number);
    return new Op(Opcode.F64Const, res)
}
export function f64sub(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.F64Const);
    const res:number = (x.args as number) - (y.args as number);
    return new Op(Opcode.F64Const, res)
}
export function f64mul(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.F64Const);
    const res:number = (x.args as number) * (y.args as number);
    return new Op(Opcode.F64Const, res)
}
export function f64div(x:Op, y:Op):Op{
    checkDualArityFn(x,y, Opcode.F64Const);
    const res:number = (x.args as number) / (y.args as number);
    return new Op(Opcode.F64Const, res)
}
// local get and set op

//global get/set op

//comparisons op

//eqz
export function i32eqz(x:Op) {
    checkTypeOpcode(x, Opcode.I32Const);
    if(x.args==0) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i64eqz(x:Op) {
    checkTypeOpcode(x, Opcode.I64Const);
    if(x.args==0) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}

// metaprogramming/ macros - text subsitution/program that makes programs
// let ops = {};
// ["i32","i64","f32","f64"].forEach(numtype => {
//     ops[`${numtype}eq`] = (x: Op, y: Op) => {
//         const opstr: keyof Opcode = `${numtype.toUpperCase()}Const`;
//         const opType: Opcode = Opcode;
//         checkDualArityFn(x,y, opType);
//         if(x.args==y.args) return new Op(opType, 1)
//         return new Op(opType, 0);
//     }
// })

//eq
export function i32eq(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I32Const);
    if(x.args==y.args) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i64eq(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I64Const);
    if(x.args==y.args) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}
export function f32eq(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F32Const);
    if(x.args==y.args) return new Op(Opcode.F32Const, 1)
    return new Op(Opcode.F32Const, 0);
}
export function f64eq(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F64Const);
    if(x.args==y.args) return new Op(Opcode.F64Const, 1)
    return new Op(Opcode.F64Const, 0);
}
//ne
export function i32ne(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I32Const);
    if(x.args!=y.args) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i64ne(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I64Const);
    if(x.args!=y.args) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}
export function f32ne(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F32Const);
    if(x.args!=y.args) return new Op(Opcode.F32Const, 1)
    return new Op(Opcode.F32Const, 0);
}
export function f64ne(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F64Const);
    if(x.args!=y.args) return new Op(Opcode.F64Const, 1)
    return new Op(Opcode.F64Const, 0);
}
//lt
export function i32lts(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I32Const);
    if(x.args<y.args) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i64lts(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I64Const);
    if(x.args<y.args) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}
export function i32ltu(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I32Const);
    if(Math.abs(x.args as number)<Math.abs(y.args as number)) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i64ltu(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I64Const);
    if(Math.abs(x.args as number)<Math.abs(y.args as number)) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}
export function f32lt(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F32Const);
    if(x.args<y.args) return new Op(Opcode.F32Const, 1)
    return new Op(Opcode.F32Const, 0);
}
export function f64lt(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F64Const);
    if(x.args<y.args) return new Op(Opcode.F64Const, 1)
    return new Op(Opcode.F64Const, 0);
}
//gt
export function i32gts(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I32Const);
    if(x.args>y.args) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i32gtu(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I32Const);
    if(Math.abs(x.args as number)>Math.abs(y.args as number)) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i64gts(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I64Const);
    if(x.args>y.args) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}
export function i64gtu(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I64Const);
    if(Math.abs(x.args as number)>Math.abs(y.args as number)) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}
export function f32gt(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F32Const);
    if(Math.abs(x.args as number)>(y.args as number)) return new Op(Opcode.F32Const, 1)
    return new Op(Opcode.F32Const, 0);
}
export function f64gt(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F64Const);
    if(Math.abs(x.args as number)>(y.args as number)) return new Op(Opcode.F64Const, 1)
    return new Op(Opcode.F64Const, 0);
}
//le
export function i32les(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I32Const);
    if(x.args<=y.args) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i32leu(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I32Const);
    if(Math.abs(x.args as number)<=Math.abs(y.args as number)) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i64les(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I64Const);
    if(x.args<=y.args) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}
export function i64leu(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I64Const);
    if(Math.abs(x.args as number)<=Math.abs(y.args as number)) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}
export function f32le(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F32Const);
    if(x.args<=y.args) return new Op(Opcode.F32Const, 1)
    return new Op(Opcode.F32Const, 0);
}
export function f64le(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F64Const);
    if(x.args<=y.args) return new Op(Opcode.F64Const, 1)
    return new Op(Opcode.F64Const, 0);
}
//ge
export function i32ges(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I32Const);
    if(x.args>=y.args) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i32geu(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I32Const);
    if(Math.abs(x.args as number)>=Math.abs(y.args as number)) return new Op(Opcode.I32Const, 1)
    return new Op(Opcode.I32Const, 0);
}
export function i64ges(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I64Const);
    if(x.args>=y.args) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}
export function i64geu(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.I64Const);
    if(Math.abs(x.args as number)>=Math.abs(y.args as number)) return new Op(Opcode.I64Const, 1)
    return new Op(Opcode.I64Const, 0);
}
export function f32ge(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F32Const);
    if(x.args>=y.args) return new Op(Opcode.F32Const, 1)
    return new Op(Opcode.F32Const, 0);
}
export function f64ge(x:Op, y:Op) {
    checkDualArityFn(x,y, Opcode.F64Const);
    if(x.args>=y.args) return new Op(Opcode.F64Const, 1)
    return new Op(Opcode.F64Const, 0);
}

//control instruction

export function ifinstr(bool: Op, ifop:IfElseOp, moduleTypes:WasmFuncType[]) {
    checkTypeOpcode(bool, Opcode.I32Const);
    const block =  bool ? ifop.ifBlock : ifop.elseBlock;
    return executeBlock(block!, moduleTypes);
}

// getters and setters

export function setLocal(local:localsVal, val:Op) {
    checkValTypeAndOp(val, local.type);
    local.value = val.args as number | bigint;
}
export function getLocal(local:localsVal):Op {
    return new Op(convertValTypeToOpCode(local.type), local.value);
}

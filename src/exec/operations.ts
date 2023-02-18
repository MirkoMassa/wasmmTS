import { assert } from 'console';
import { Op } from '../helperParser';
import {Opcode} from "../opcodes"

// used for operations with 2 arguments
export function checkDualArityFn(x:Op, y:Op, opcode:Opcode) {
    if(x.id != opcode || y.id != opcode) 
    throw new Error (`Invalid number types expect (${Opcode[opcode]}, ${Opcode[opcode]}) got [${Opcode[x.id]},${Opcode[y.id]}]`);
}

// math operations funcs
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
// local get and set

// export function getLocal(localidx:number):Op{
//     // check current function 
// }
// export function setLocal
// Helper functions for the description in the Section 2 parsing and for some other sections
import  * as types from "./types";
import {decodeUnsignedLeb128 as lebToInt} from "./leb128ToInt"
import {decodeSignedLeb128 as slebToInt} from "./leb128ToInt"
import * as op from "./opcodes"
import {parseBlock, parseMemArg, parseNumber, parseFC, parseFD} from "./instructionsParser"
import { logAsHex } from "./utils";
import * as assert from "assert";

export function parseidx(bytes: Uint8Array, index: number): [number, number] { //thats literally a parse int
    const [id, width] = lebToInt(bytes.slice(index, index+4));
    return [id, index+width];
}
export function parseTableType(bytes: Uint8Array, index: number):[types.tableType, number]{

    // reftype
    if(bytes[index] != 0x70 && bytes[index] != 0x6f) throw new Error("Invalid refType value.");
    const et:types.refType = bytes[index] as types.refType;
    index++;
    // limits
    let lim:types.limits;
    [lim, index] = parseLimits(bytes, index);
    
    return [{et, lim}, index];
}

export function parseLimits(bytes: Uint8Array, index: number):[types.limits, number]{
    // limits flag
    if(bytes[index] != 0x00 && bytes[index] != 0x01) throw new Error("Invalid flag in tableType.");
    const flag:types.flag = bytes[index] as types.flag;
    index++;
    // limits min and max
    let [min, width1] = lebToInt(bytes.slice(index, index+4));
    if(flag == 0x00) return [{flag, min, max:undefined}, index+= width1];
    index+=width1;
    let [max, width2] = lebToInt(bytes.slice(index, index+4));
    index+=width2;
    return [{flag, min, max}, index];
}

export function parseGlobalType(bytes: Uint8Array, index: number):[types.globalType, number]{
    let valtype:types.valType;
    [valtype, index] = parseValType(bytes, index);
    // console.log(valtype!);
    if(bytes[index] != 0 && bytes[index] != 1) throw new Error("Invalid mutability.");
    return [{valtype, mutability:bytes[index] as types.flag}, index+1];
}

export function parseValType(bytes: Uint8Array, index: number):[types.valType, number]{
    switch(bytes[index]){
        case 0x7F: 
        case 0x7E: 
        case 0x7D: 
        case 0x7C:
            return [bytes[index] as types.numType, index+1];
        case 0x70:
        case 0x6f:
            return [bytes[index] as types.refType, index+1];
        case 0x7B:
            return [bytes[index] as types.vecType, index+1];
        default: 
            let error = new Error(`Invalid valType at ${index} ${bytes[index].toString(16)}, ${Array.from(bytes.slice(index-5, index+1)).map(x => x.toString(16))}`);
            throw error;
    }
}

export class Op {
    kind: string;
    constructor(public id: op.Opcode, public args: number[] | number | Op[] | types.block | types.memarg | BigInt | [types.memarg, number] | types.refType, public indexNum = 0) {
        this.kind = op.Opcode[id];
    }
}
export class prefixedOp {
    constructor(public id: op.Opcode, public kind: string, public args: number[] | number | types.memarg | BigInt | [types.memarg, number] | [], public indexNum = 0) {}
}

export function parseExpr(bytes: Uint8Array, index: number, length: number = 0):[Op[], number]{
    let expr: Op[] = [];
    let baseIndex = index;
    if(length!=0){
        while(index < baseIndex+length){
            console.log("CASE 1")
            let op: Op;
            let oldIndex = index;
            [op, index] = parseInstruction(bytes, index);
            console.log(op);
            assert.notEqual(index, oldIndex, "parseInstruction did not increment the index");
            expr.push(op);
        }
        if(bytes[index-1] !== 0x0B){
            console.warn("Invalid parsing expression array", expr);
            throw new Error(`Invalid expression (passed length). ${bytes[index]}`);
        }
    }
        // while((length != 0 && i < length) || bytes[index] != 0x0B){
    else{
        // not explicit length of expression
        while(bytes[index] != 0x0B){
            console.log("CASE 2")
            let op: Op;
            let oldIndex = index;
            [op, index] = parseInstruction(bytes, index);
            console.log(op);
            assert.notEqual(index, oldIndex, "parseInstruction did not increment the index");
            expr.push(op);
        }
        if(bytes[index] !== 0x0B) throw new Error("Invalid expression.");
        index++;
    }
    return [expr, index];
}

export function parseInstruction(bytes: Uint8Array, index: number): [Op, number] {

// Control Instructions and single idx (ref.func, variable instructions, table get and set)
    if(op.blockInstr.has(bytes[index])){
        const newOp = new Op(bytes[index], [], index);
        let args:types.block;
        [args, index] = parseBlock(bytes, index+1);
        newOp.args = args;
        return [newOp, index];
    }
    // else has non explicit length
    else if(bytes[index] == op.Opcode.Else){
        const newOp = new Op(bytes[index], [], index);
        [newOp.args, index] = parseExpr(bytes, index+1);
        return [newOp, index];
    }
    else if(op.idxInstr.has(bytes[index])){
        const newOp = new Op(bytes[index], [], index);
        let idx:number;
        [idx, index] = parseidx(bytes, index+1);
        newOp.args = idx;
        return [newOp, index];
    }
    else if (bytes[index] == op.Opcode.BrTable){
        index++;
        // vector of lableidx
        let [size, width] = lebToInt(bytes.slice(index, index+4));
        index+= width;
        const lableidxVec = new Array(size+1);
        for (let j = 0; j < size; j++) {
            const [lableidx, width] = lebToInt(bytes.slice(index, index+4));
            index+= width;
            lableidxVec[j] = lableidx;
        }
        //single extra lableidx
        let lableidx;
        [lableidx, width] = lebToInt(bytes.slice(index, index+4));
        index+= width;
        const args = new Array(2); // [number[], number]
        args[0] = lableidxVec;
        args[1] = lableidx;
        return [new Op(op.Opcode.BrTable, args, index), index];
    }
    else if (bytes[index] == op.Opcode.CallIndirect){
        index++;
        //single typeidx
        let [typeidx, width] = lebToInt(bytes.slice(index, index+4));
        index+= width;
        //single tableidx
        let tableidx;
        [tableidx, width] = lebToInt(bytes.slice(index, index+4));
        index+= width;
        return [new Op(op.Opcode.CallIndirect, [typeidx, tableidx], index), index];
    }
// Reference Instructions
    else if(bytes[index] == op.Opcode.RefNull){
        index++;
        // reftype
        if(bytes[index] != 0x70 && bytes[index] != 0x6f) throw new Error("Invalid refType value.");
        const t:types.refType = bytes[index] as types.refType;
        index++;
        return [new Op(op.Opcode.RefNull, t, index), index];
    }
// Parametric Instructions
    else if(bytes[index] == op.Opcode.SelectArgs){
        index++;
        // vector of valtypes
        let [size, width] = lebToInt(bytes.slice(index, index+4));
        index+= width;
        const valtypeVec = new Array(size); // @review if size needs to be size+1
        for (let j = 0; j < size; j++) {
            let valtype:types.valType;
            [valtype, index] = parseValType(bytes, index);
            valtypeVec[j] = valtype;
        }
        return [new Op(op.Opcode.Select, valtypeVec, index), index];
    }
// Table and Memory Instructions with 0xFC
    else if (bytes[index] == op.Opcode.prefixedFC){
        return parseFC(bytes, index+1);
    }
// Memory Instructions
    else if(op.memoryInstr.has(bytes[index])){
        const newOp = new Op(bytes[index], [], index);
        let args:types.memarg;
        [args, index] = parseMemArg(bytes, index+1);
        newOp.args = args;
        return [newOp, index];
    }
    else if(bytes[index] == op.Opcode.memorySize || bytes[index] == op.Opcode.memoryGrow){
        return [new Op(bytes[index], 0, index), index+1];
    }
// Numeric Instructions (and some more single bytes ones from other Instruction groups)
    else if(op.numericInstr.has(bytes[index])){
        const newOp = new Op(bytes[index], [], index);
        let args:number;
        [args, index] = parseNumber(bytes, index);
        newOp.args = args;
        console.log("args",newOp.args)
        return [newOp, index];
    }
    else if(op.singleByteInstr.has(bytes[index])){
        return [new Op(bytes[index], [], index), index+1];
    } 
// Vector Instructions
    else if(bytes[index] == op.Opcode.prefixedFD){
        return parseFD(bytes, index+1);
    }
    else{ // Temporary
        return [new Op(bytes[index], [], index), index+1];
    }
}

export function parseLocals(bytes: Uint8Array, index: number):[types.locals, number]{
    const [number, width] = lebToInt(bytes.slice(index, index+4));
    index+=width;
    let valtype:types.valType;
    [valtype, index] = parseValType(bytes, index);
    return [{number, type:valtype}, index];
}
export function parseName(bytes: Uint8Array, index: number):[types.namesVector, number]{
    let [size, width] = lebToInt(bytes.slice(index, index+4));
    index+= width;
    let name:types.namesVector = [size, ""];
    for (let i = 0; i < size; i++){
        name[1] = name[1].concat(String.fromCharCode(bytes[index+i]));
    }
    index+=size;
    return [name, index]; 
}

export function parsePrefix(bytes: Uint8Array, index: number):[string, number]{
    const [prefix, width] = lebToInt(bytes.slice(index, index+4));
    index+=width;
    const opName = op.FCPrefixes[prefix];
    return [opName, index];
}
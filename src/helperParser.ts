// Helper functions for the description in the Section 2 parsing and for some other sections
import  * as types from "./types";
import {decodeUnsignedLeb128 as lebToInt} from "./leb128ToInt"
import {decodeSignedLeb128 as slebToInt} from "./leb128ToInt"
import * as op from "./opcodes"
import {parseBlock, parseMemArg, parseNumber, parseFC} from "./instructionsParser"
import { logAsHex } from "./utils";
import { arrayBuffer } from "stream/consumers";

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
    constructor(public id: op.Opcode, public args: number[] | number | Op[] | types.block | types.memarg | types.refType, public indexNum = 0) {
        this.kind = op.Opcode[id];
    }
}
export class prefixedOp {
    constructor(public id: op.Opcode, public kind: string, public args: number[] | number | types.memarg | [], public indexNum = 0) {}
}

export function parseExpr(bytes: Uint8Array, index: number, length: number = 0):[Op[], number]{
    let expr: Op[] = [];
    let i = 0;
    if(length!=0){
        while(i < length){
            if(op.singleByteInstr.has(bytes[index])){
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                index++;
                i++;
            } 
            else if(op.blockInstr.has(bytes[index])){
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                const oldIndex = index;
                let args:types.block;
                [args, index] = parseBlock(bytes, index+1);
                newOp.args = args;
                i = i + (index - oldIndex);
            }
            else if (bytes[index] == 0x0E){
                // vector of lableidx
                let [size, width] = lebToInt(bytes.slice(index, index+4));
                index+= width;
                const lableidxVec = new Array(size+1);
                    for (let j = 0; j < size; j++) {
                        const [lableidx, width] = lebToInt(bytes.slice(index, index+4));
                        index+= width;
                        i+= width;
                        lableidxVec[j] = lableidx;
                    }
                //single extra lableidx
                let lableidx;
                [lableidx, width] = lebToInt(bytes.slice(index, index+4));
                index+= width;
                i+= width;
                const args = new Array(2);
                args[0] = lableidxVec;
                args[1] = lableidx;
                const newOp = new Op(bytes[index], args, index);
                expr.push(newOp);
            }
            else if (bytes[index] == 0x11){
                //single typeidx
                let [typeidx, width] = lebToInt(bytes.slice(index, index+4));
                index+= width;
                i+= width;
                //single tableidx
                let tableidx;
                [tableidx, width] = lebToInt(bytes.slice(index, index+4));
                index+= width;
                i+= width;
                const newOp = new Op(bytes[index], [typeidx, tableidx], index);
                expr.push(newOp);
            }
            else if(bytes[index] == 0xD0){
                // reftype
                if(bytes[index] != 0x70 && bytes[index] != 0x6f) throw new Error("Invalid refType value.");
                const t:types.refType = bytes[index] as types.refType;
                const newOp = new Op(bytes[index], t, index);
                expr.push(newOp);
                i++;
                index++;
            }
            else if(op.numericInstr.has(bytes[index])){
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                const oldIndex = index;
                let args:number;
                [args, index] = parseNumber(bytes, index);
                newOp.args = args;
                i = i + (index - oldIndex);
            }
            else if(op.memoryInstr.has(bytes[index])){
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                const oldIndex = index;
                let args:types.memarg;
                [args, index] = parseMemArg(bytes, index+1);
                newOp.args = args;
                i = i + (index - oldIndex);
            }
            else if(op.idxInstr.has(bytes[index])){
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                let idx:number;
                [idx, index] = parseidx(bytes, index+1);
                newOp.args = idx;
                i++;
            }
            else if (bytes[index] == 0xFC){
                let newOp:Op;
                const oldIndex = index;
                [newOp, index] = parseFC(bytes, index+1);
                expr.push(newOp);
                i = i + (index - oldIndex);
            }
            else{ // Temporary
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                index++;
                i++;
            }
            
        }
        if(bytes[index-1] !== 0x0B){
            console.warn("Invalid parsing expression array", expr);
            throw new Error(`Invalid expression (passed length). ${bytes[index]}`);
        }
    }

    else{
        // not explicit length of expression
        while(bytes[index] != 0x0B){
            if(op.singleByteInstr.has(bytes[index])){
                expr.push(new Op(bytes[index], [], index));
                index++;
            }
            else if(op.blockInstr.has(bytes[index])){ // (block | loop | if)
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                [newOp.args, index] = parseBlock(bytes, index+1);
            } 
            else if(op.numericInstr.has(bytes[index])){ // memarg
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                [newOp.args, index] = parseNumber(bytes, index+1);
            }
            else if(op.memoryInstr.has(bytes[index])){ // memarg
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                [newOp.args, index] = parseMemArg(bytes, index+1);
            }
            else if(op.idxInstr.has(bytes[index])){ // memarg
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                [newOp.args, index] = parseidx(bytes, index+1);
            }
            else if(bytes[index] == 0x05){ // else block
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                [newOp.args, index] = parseExpr(bytes, index+1);
            }
            else{ // default
                const newOp = new Op(bytes[index], [], index);
                expr.push(newOp);
                index++;
            }
            i++;
        }
        if(bytes[index] !== 0x0B) throw new Error("Invalid expression.");
        index++;
    }
    return [expr, index];
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
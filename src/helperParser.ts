// Helper functions for the description in the Section 2 parsing and for some other sections
import  * as types from "./types";
import {decodeUnsignedLeb128 as lebToInt} from "./leb128ToInt"
import {decodeSignedLeb128 as slebToInt} from "./leb128ToInt"
import { immerable } from "immer";
import * as op from "./opcodes"
import {parseBlock, parseMemArg, parseNumber, parseFC, parseFD, parseBlockType, parseIfBlock} from "./instructionsParser"
import { logAsHex } from "./utils";
import * as assert from "assert";
import { Block } from "typescript";

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
    [immerable] = true;
    kind: string;
    constructor(public id: op.Opcode, public args: number[] | number | Op[] | types.block | types.memarg | bigint | [types.memarg, number] | types.refType, public indexNum = 0) {
        this.kind = op.Opcode[id];
    }
}
export class prefixedOp {
    [immerable] = true;
    constructor(public id: op.Opcode, public kind: string, public args: number[] | number | types.memarg | bigint | [types.memarg, number] | [], public indexNum = 0) {}
}


export function parseExpr(bytes: Uint8Array, index: number, length: number = 0):[Op[], number]{
    // console.log("case 1");
    // console.log("PE", index, length)
    let expr: Op[] = [];
    let baseIndex = index;
    while(index < baseIndex + length){
        let op: Op;
        let oldIndex = index;
        [op, index] = parseInstruction(bytes, index);
        // console.log(op);
        assert.notEqual(index, oldIndex, "parseInstruction did not increment the index");
        expr.push(op);
    }
    if(bytes[index-1] !== 0x0B){
        console.warn("Invalid parsing expression array", expr);
        throw new Error(`Invalid expression (passed length). ${bytes[index]}`);
    }
    
    return [expr, index];
}
export function parseBlockExpr(bytes: Uint8Array, index: number, parentBlockType: types.blockType):[Op[], number]{
    // not explicit length of expression (used for blocks)
    // console.log("case 2");
    // console.log("BLOCK EXPR", index);
    let expr: Op[] = [];
    while(bytes[index] != 0x0B){
        // console.log("current instr",bytes[index].toString(16), index)
        let op: Op;
        let oldIndex = index;
        [op, index] = parseInstruction(bytes, index, parentBlockType);
        // console.log("INCREMENTED INDEX to", index);
        assert.notEqual(index, oldIndex, "parseInstruction did not increment the index");
        expr.push(op);
    }
    if(bytes[index] !== 0x0B) throw new Error("Invalid expression.");
    index++;
    // console.log("expression", expr)
    return [expr, index];
}
export class IfElseOp extends Op {
    
    constructor(public ifBlock: BlockOp, public elseBlock: BlockOp | undefined, public indexNum = 0) {
        super(op.Opcode.If, [], indexNum)
        this.id = op.Opcode.If;
    }
}
export class BlockOp extends Op {
    constructor(public bt: types.blockType, public expr: Op[], public indexNum = 0) {
        super(op.Opcode.Block, [], indexNum)
        this.id = op.Opcode.Block;
    }
}
export class LoopOp extends Op {
    constructor(public bt: types.blockType, public expr: Op[], public indexNum = 0) {
        super(op.Opcode.Loop, [], indexNum)
        this.id = op.Opcode.Loop;
    }
}
export class ElseOp extends Op {
    constructor(public bt: types.blockType, public expr: Op[], public indexNum = 0) {
        super(op.Opcode.Else, [], indexNum)
        this.id = op.Opcode.Else;
    }
}

export function parseInstruction(bytes: Uint8Array, index: number, parentBlockType?: types.blockType): [Op, number] {
    // Control Instructions 
    // console.log("current",bytes[index].toString(16))
    if(bytes[index] == op.Opcode.If){
        let blockType: types.blockType;
        [blockType, index] = parseBlockType(bytes, index+1);
        const IfBlock = parseIfBlock(bytes, index, blockType);
        return IfBlock;
    }
    else if(bytes[index] == op.Opcode.Else){
        if(parentBlockType == undefined) throw new Error ("No parent blocktype.");
        // console.log("elsebt",parentBlockType)
        // [elseBlock, index] = parseBlock(bytes, index+1, parentBlockType);
        // elseBlock.id = op.Opcode.Else;
        return [new Op(op.Opcode.Else,[],index), index+1];
    }
    else if(bytes[index] == op.Opcode.Block || bytes[index] == op.Opcode.Loop){
        const opId = bytes[index];
        let blockType:types.blockType;
        [blockType, index] = parseBlockType(bytes, index+1);
        return parseBlock(bytes, index, blockType, opId);
    }
    
    // single idx (ref.func, variable instructions, table get and set)
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

export function parseLocals(bytes: Uint8Array, index: number):[types.localsVal, number]{
    const [value, width] = lebToInt(bytes.slice(index, index+4));
    index+=width;
    let valtype:types.valType;
    [valtype, index] = parseValType(bytes, index);
    return [{value, type:valtype}, index];
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

export function parseCustomNameSection(bytes:Uint8Array, index:number):[types.custom, number]{
    let subsecId, size, width;
    [subsecId, width] = lebToInt(bytes.slice(index, index+4));
    index += width;

    // size of the subsection (in bytes)
    [size, width] = lebToInt(bytes.slice(index, index+4));
    index += width;
    let names:types.allNames[] | types.namesVector;
    switch(subsecId){
        case 0: {
            [names, index] = parseName(bytes, index); break;
        }
        case 1: {
            [names, index] = parseFunctionNames(bytes, index); break;
        }
        case 2: {
            [names, index] = parseLocalNames(bytes, index); 
            // return [null, index+=size];// temp
            break;
        }
        default:{
            throw new Error(`Unrecognized custom subSection ID (got ${subsecId})`);
        }
    }
    return [{subsecId, names}, index];
}

export function parseFunctionNames(bytes:Uint8Array, index:number):[types.nameAssoc[], number]{
    // number of name elements
    const [count, width] = lebToInt(bytes.slice(index, index+4));
    const names:types.nameAssoc[] = new Array(count);
    index += width;

    // name maps
    for (let i = 0; i < count; i++) {
        const [idx, width] = lebToInt(bytes.slice(index, index+4));
        index += width;
        let name:types.namesVector;
        [name, index] = parseName(bytes, index);
        names[i] = [idx, name];
    }

    return [names, index];
}

export function parseLocalNames(bytes:Uint8Array, index:number):[types.indirectNameAssoc[], number]{
    let functionCount, localCount, width;

    [functionCount, width] = lebToInt(bytes.slice(index, index+4));
    index += width;

    const names:types.indirectNameAssoc[] = [];
    for (let i = 0; i < functionCount; i++) {
        let funcidx;
        [funcidx, width] = lebToInt(bytes.slice(index, index+4));
        index += width;
        [localCount, width] = lebToInt(bytes.slice(index, index+4));
        index += width;

        let localNames:types.nameAssoc[] = [];
        for (let j = 0; j < localCount; j++) {
            let localidx;
            [localidx, width] = lebToInt(bytes.slice(index, index+4));
            index += width;
            let name;
            [name, index] = parseName(bytes, index);
            localNames.push([localidx, name]);
        }
        names.push([funcidx, localNames]);
    }
    return [names, index];
}
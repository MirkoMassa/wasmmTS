// Helper functions for the description in the Section 2 parsing and for some other sections
import  * as types from "./types";
import {decodeSignedLeb128 as lebToInt} from "./Leb128ToInt";

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
    console.log(bytes[index])
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
export function parseExpr(bytes: Uint8Array, index: number, length: number = 0):[number[], number]{
    let expr:number[] = [];
    let i = 0;
    while(i < length){
        expr[i] = bytes[index];
        i++;
        index++;
    }
    console.log(bytes[index].toString(16))
    if(bytes[index] !== 0x0B) throw new Error("Invalid expression.");
    // expr[i] = 0x0B;

    logAsHex(expr);
    return [expr, index+1];
}

export function parseLocals(bytes: Uint8Array, index: number):[types.locals, number]{
    const [number, width] = lebToInt(bytes.slice(index, index+4));
    index+=width;
    let valtype:types.valType;
    [valtype, index] = parseValType(bytes, index);
    return [{number, type:valtype}, index];
}

// test

export function logAsHex(numbers:number[]){
    
    let res = "";
    numbers.forEach(num => {res = res.concat(num.toString(16)+", ")});
    res = res.slice(0, res.length-2)
    console.log(res);
}

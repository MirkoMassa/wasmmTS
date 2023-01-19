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
    switch(bytes[index]){
        case 0x7F: 
        case 0x7E: 
        case 0x7D: 
        case 0x7C:
            valtype = bytes[index] as types.numType;
            index++;
            break;
        case 0x70:
        case 0x6f:
            valtype = bytes[index] as types.refType;
            index++;
            break;
        case 0x7B:
            valtype = bytes[index] as types.vecType;
            index++;
            break;
        default: throw new Error("Invalid valType.")
    }
    // console.log(valtype!);
    if(bytes[index] != 0 && bytes[index] != 1) throw new Error("Invalid mutability.");
    return [{valtype, mutability:bytes[index] as types.flag}, index+1];
}

export function parseExpr(bytes: Uint8Array, index: number):[Uint8Array, number]{
    let expr = new Uint8Array;
    let i = 0;
    while(bytes[index] !== 0x0B){
        expr[i] = bytes[index];
        i++;
        index++;
    }
    // if(bytes[index] !== 0x0B) throw new Error("Invalid expression.");
    expr[i] = bytes[index];
    return [expr, index];
}
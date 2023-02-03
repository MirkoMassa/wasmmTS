import {decodeUnsignedLeb128, decodeUnsignedLeb128 as lebToInt} from "./leb128ToInt";
import {decodeSignedLeb128 as slebToInt} from "./leb128ToInt"
import  * as types from "./types";
import * as helperParser from "./helperParser";
import {prefixedOp} from "./helperParser";
import { enumRange, logAsHex } from "./utils";
import {Op} from "./helperParser";
import * as op from "./opcodes"

export function parseBlock(bytes: Uint8Array, index: number):[types.block, number] {
    // parse block type
    let bt:types.blockType;
    if(bytes[index] == 0x40){
        bt = 0x40;
        index++;
    } 
    else if(types.valTypeSet.has(bytes[index])){
        [bt, index] = helperParser.parseValType(bytes, index);
        index++;
    }  
    else{
        let width;
        [bt, width] = slebToInt(bytes.slice(index, index+4));
        index+=width;
    }
    //parse inner expression
let expr:Op[];
[expr, index] = helperParser.parseExpr(bytes, index);
return [{bt, expr}, index];
}

export function parseMemArg(bytes: Uint8Array, index: number):[types.memarg, number] {
    const [align, width] = lebToInt(bytes.slice(index, index+4));
    index += width;
    const [offset, width2] = lebToInt(bytes.slice(index, index+4));
    index += width2;
    // console.log("align offset and index",align, offset, index);
    return [[align, offset], index];
}
export function parseFC(bytes: Uint8Array, index: number):[prefixedOp, number] {
    const [prefix, width] = lebToInt(bytes.slice(index, index+4));
    index+=width;
    const opName = op.FCPrefixes[prefix];
    switch(prefix){
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:{ 
            // numeric FC instructions (no args)
            return [new prefixedOp(bytes[index-1], opName, []), index];
        }
        case 8:
        case 9:{ // memory init and data drop
            const [idx, width] = lebToInt(bytes.slice(index, index+4));
            index+=width;
            if(prefix == 8){
                return [new prefixedOp(bytes[index-1], opName, [idx, 0x00]), index+1];
            }
            return [new prefixedOp(bytes[index-1], opName, idx), index];
        }
        case 10:{ // memory.copy (two 0 bytes)
            if(bytes[index] != 0x00 && bytes[index+1] != 0x00) throw new Error("Invalid args.");
            return [new prefixedOp(bytes[index-1], opName, [0x00, 0x00]), index+2];
        }
        case 11:{ // memory.fill (one 0 byte)
            if(bytes[index] != 0x00) throw new Error("Invalid args.");
            return [new prefixedOp(bytes[index-1], opName, 0x00), index+1];
        }
        case 13:
        case 15:
        case 16:
        case 17:{
            // table FC instructions single idx
            const [idx, width] = lebToInt(bytes.slice(index, index+4));
            index+=width;
            return [new prefixedOp(bytes[index-1], opName, idx), index];
        }
        case 12:
        case 14:{
            // table FC instructions multiple idx
            const args = [];
            let [idx, width] = lebToInt(bytes.slice(index, index+4));
            index+=width;
            args.push(idx);
            [idx, width] = lebToInt(bytes.slice(index, index+4));
            index+=width;
            args.push(idx);
            return [new prefixedOp(bytes[index-1], opName, args), index];
        }
        default: throw new Error("Invalid prefix.")
    }
    
}
export function parseNumber(bytes: Uint8Array, index: number):[number, number] {
    switch(bytes[index]){
        case 0x41:
        case 0x42:{
            const [num, width] = slebToInt(bytes.slice(index, index+4));
            return [num, index+width];
        }
        case 0x43:{
            const num =parseFloat32(bytes.slice(index, index+4));
            return [num, index+4];
        }
        case 0x44:{
            const num = parseFloat64(bytes.slice(index, index+4));
            return [num, index+8];
        }
        default: throw new Error ("Invalid number type.")

    }
}

export function parseFloat32(bytes: Uint8Array): number {
    let value = 0n;
    let result = 0;
    for(let i=0; i < 4; i++) {
        value = value | (BigInt(bytes[i]) << BigInt(8*i));
    }
 
    let mantissa = 0n;
    const exponentBias = 127n;
    const exponentMask = 0xffn << BigInt(23);
    let exponent = ((value & exponentMask) >> BigInt(23)) - exponentBias;
    const mantissaMask = 0b0111_1111_1111_1111_1111_1111n;
    mantissa = (value & mantissaMask) | (1n << BigInt(23));
    //console.log("f32~", result, exponent, mantissa);
    // some notes
    //[0x00,0x40, 0x16, 0x43] = 150.25
    //f32~ 1 7n 100101100100000000000000 => 1.00101100100000000000000 * 2^7 => 10010110.0100000000000000
    //2^7 6 5 4 3 2 1 0  -1-2    
    //  1 0 0 1 0 1 1 0 . 0 1 00000000000000
    // 7 - (23-23) 7 - (23-22) 
    // 100101100100000000000000n
    // 000000000000000000000001n << (23)
    // 100000000000000000000000n
    // _________________________ &
    // 100000000000000000000000n
    for(let i=23; i >= 0; i--) {
        if(Number((mantissa & (1n << BigInt(i))))) result += (2 ** (Number(exponent)-(23-i)))
    }
    if(value & 1n << BigInt(31)) {
        result *= -1;
    }
    return result;
}
// export function parseFloat32(bytes: Uint8Array): number {
//     let value = 0;
//     for (let i = 0; i < 4; i++) {
//         value |= bytes[i] << (8 * i);
//     }
//     const sign = value >>> 31 ? -1 : 1;
//     const exponent = (value & 0x7f800000) >>> 23;
//     const mantissa = value & 0x007fffff;
//     return sign * (1 + mantissa / (1 << 23)) * (2 ** (exponent - 127));
    // return Math.round(sign * (1 + mantissa / (1 << 23)) * (2 ** (exponent - 127)) * 100) /100;
// }

// export function parseFloat64(bytes: Uint8Array): number {
//     let value = 0n;
//     for (let i = 0; i < 8; i++) {
//         value |= BigInt(bytes[i]) << BigInt(8 * i);
//     }
//     const sign = value >> BigInt(63) ? -1n : 1n;
//     const exponent = (value & 0x7ff0000000000000n) >> 52n;
//     const mantissa = value & 0x000fffffffffffffn;
//     return Number(sign * (1n + (mantissa / (1n << 52n))) * (2n ** (exponent - 1023n)));
// }

export function parseFloat64(bytes: Uint8Array): number {
    let value = 0n;
    let result = 0;
    for(let i=0; i < 8; i++) {
        value = value | (BigInt(bytes[i]) << BigInt(8*i));
    }
    let mantissa = 0n;
    const exponentBias = 1023n;
    const exponentMask = 0x7ffn << BigInt(52);
    let exponent = ((value & exponentMask) >> BigInt(52)) - exponentBias;
    const mantissaMask = 0x000fffffffffffffn;
    mantissa = (value & mantissaMask) | (1n << BigInt(52));
    console.log("f32~", result, exponent, mantissa);
    for(let i=52; i >= 0; i--) {
        if(Number((mantissa & (1n << BigInt(i))))) result += (2 ** (Number(exponent)-(52-i)))
    }
    if(value & 1n << BigInt(63)) {
        result *= -1;
    }
    return result;
}
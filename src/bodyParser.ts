import {decodeSignedLeb128 as lebToInt} from "./Leb128ToInt"
import  * as types  from "./types";
//Type Section (1)
export class parsedBody{
    constructor (public count:number, public elements:types.funcType[] = []){}
}
export function parseType(bytes: Uint8Array, index: number): parsedBody{
    //checking the number of function signatures
    const [size, width] = lebToInt(bytes.slice(index+1, index+1+4)); //size is the number of functions signatures in the module
    index+= width; //offset after the number of function signatures declaration
    console.log(bytes[index])
    if(bytes[index] != 0x60) throw new Error("No vector of function signatures.")

    const pb = new parsedBody(size, []);
    index++; //offset at the start of the first function signature

    for (let i = 0; i < size; i++) {
            
            // parameter (number and types)
            let [size, width] = lebToInt(bytes.slice(index, index+4));
            index+=width;
            const params:types.tupleType = [size, bytes.slice(index+1, index+1+size)];
            index+=size;
            // return values (number and types)
            [size, width] = lebToInt(bytes.slice(index, index+4));
            index+=width;
            const returns:types.tupleType = [size, bytes.slice(index+1, index+1+size)];
            // function
            const func:types.funcType = {parameters:params, returns:returns}
            pb.elements.push(func)
        }
    return pb; 
}
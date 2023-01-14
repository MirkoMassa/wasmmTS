import {decodeSignedLeb128 as lebToInt} from "./Leb128ToInt"
import  * as types  from "./types";
//Type Section (1)
export class parsedBody{
    constructor (public count:number, public elements:types.funcType[] = []){}
}
export function parseType(bytes: Uint8Array, index: number): parsedBody{
    //checking the number of function signatures
    const [size, width] = lebToInt(bytes.slice(index, index+4)); //size is the number of functions signatures in the module
    index+= width; //offset after the number of function signatures declaration
    const pb = new parsedBody(size, []);
    

    for (let i = 0; i < size; i++) {
        console.log(bytes[index])
        if(bytes[index] != 0x60) throw new Error("No vector of function signatures.")
        index++; //offset at the start of the first function signature
        let [size, width] = [0, 0];
        let params:types.tupleType;
        let returns:types.tupleType;
        if(bytes[index] == 0) index++; //checking if there are any parameters
        else{
            // parameter (number and types)
            [size, width] = lebToInt(bytes.slice(index, index+4));
            index+=width;
            params = [size, bytes.slice(index, index+size)];
            index+=size;
        }
        if(bytes[index] == 0) index++; //checking if there are any parameters
        else{
            // return values (number and types)
            [size, width] = lebToInt(bytes.slice(index, index+4));
            index+=width;
            returns = [size, bytes.slice(index, index+size)];
            index+=size;
        }
        
        // function
        const func:types.funcType = {parameters:params!, returns:returns!}
        pb.elements.push(func);
    }
    return pb; 
}

// console.log(JSON.stringify(parseType(new Uint8Array([0x01, 0x60, 0x02, 0x7F, 0x7F, 0x01, 0x7F]), 0)))
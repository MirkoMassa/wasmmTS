// convert store, frame and label elements to more human-readable things
import { patchPath, storeProducePatches, ValTypeEnum } from "../exec/types";
import { Op } from "../helperParser";
import { Opcode } from "../opcodes";
import { custom, indirectNameAssoc, nameAssoc, namesVector, valType, WASMSectionID } from "../types";
import { lookForLabel, lookForFrame, Frame, Label, WasmFuncType, WebAssemblyMtsStore, lookForFrameNoError, MaskedArrayObject, instantiateLocals } from "../exec/wasmm";
import { WasmModule } from "../parser";
import { current } from "immer";
import path from "path";
import { objectIsEmpty } from "../utils";
export type descriptionTypes = "frame" | "label" | "instr" | "stackelem";
export type elemDescriptor = { 
    type:descriptionTypes, 
    description:string
}
export type stateDescriptor = {
    stateNumber:Number,
    elemDescriptors:elemDescriptor[]
}

export function buildStateStrings(stores:storeProducePatches, customSec: custom[]):stateDescriptor[]{
    const stateDescriptors:stateDescriptor[] = [];
    // console.log("stack",stores.states);
    const [moduleCustom, funcsCustom, localsCustom] = getCustoms(customSec);
    for (let i = 0; i < stores.states.length; i++) {
        
        const currStore = stores.states[i];
        let elemDescriptors:elemDescriptor[] = [];
        // console.log(i,currStore.stack);
        for(let j = currStore.stack.length-1; j>=0; j--){
            const elem = currStore.stack[j];
            
            const [type, description] = stringBuilder(elem, currStore, moduleCustom, funcsCustom, localsCustom);
            elemDescriptors.push({
                type,
                description
            })
        }
        stateDescriptors.push({
            stateNumber: i,
            elemDescriptors
        });
    }
    return stateDescriptors;
}

export function descCurrentLabel(currStore:WebAssemblyMtsStore, currLabel:Label | undefined = undefined):string{
    if (currLabel == undefined){
        currLabel = lookForLabel(currStore.stack)!;
    }
    if(currLabel != undefined){
        let funcType;
        if(currLabel.type instanceof WasmFuncType){
            funcType = currLabel.type.toString();
        }
        else if(typeof currLabel.type == 'number'){
            const valTypeStr = ValTypeEnum[currLabel.type];
            funcType = `() => ${valTypeStr}`;
        }
        else{
            funcType = "absent";
        }
        let instrName = "unknown";
        if(currLabel.instr[currLabel.instrIndex] != undefined){
            instrName = currLabel.instr[currLabel.instrIndex].kind;
        }
    return `Label, instruction index: ${currLabel.instrIndex} (${instrName}), type: ${funcType}.`;
    }else{
        return 'No label found.';
    }
}

export function descCurrentFrame(currStore:WebAssemblyMtsStore, currFrame:Frame | undefined = undefined, funcsCustom:nameAssoc[], localsCustom:indirectNameAssoc[]):string{
    // when called outside (with just the current store) looks for the last frame
    if (currFrame == undefined){
        currFrame = lookForFrameNoError(currStore.stack)!;
    }
    if(currFrame != undefined){
        const funcidx = currFrame.currentFunc;
        const funcName = funcsCustom[funcidx][1][1];
        // locals
        let localsStringified:string = "";
        console.log('currframe',currFrame);
        const currentLocal = localsCustom[funcidx][1];
        for (let j = 0; j < currFrame.locals.length; j++) {
            let localName = '';
            if(currentLocal[j] == undefined){
                localName = 'unnamed';
            }else{
                localName = currentLocal[j][1][1];
            }
            console.log(localName)
            const localType = ValTypeEnum[currFrame.locals[j].type];
            localsStringified = localsStringified.concat(`'${localName}'= ${currFrame.locals[j].value} (${localType}), `)
        }
        localsStringified = localsStringified.slice(0, localsStringified.length-2).concat(".");

        return `Frame, function:'${funcName}' (idx: ${funcidx}), locals:${localsStringified}`;
    }else{
        return 'No frame found.'
    }
}

export function getCustoms(customSec: custom[]):[namesVector, nameAssoc[], indirectNameAssoc[]]{
    const moduleCustom = customSec.find(subsec => subsec.subsecId == 0)?.names as namesVector;
    const funcsCustom = customSec.find(subsec => subsec.subsecId == 1)?.names as nameAssoc[];
    const localsCustom = customSec.find(subsec => subsec.subsecId == 2)?.names as indirectNameAssoc[];
    return [moduleCustom, funcsCustom, localsCustom]
}

export function stringBuilder(elem:Op, currStore: WebAssemblyMtsStore, moduleCustom:namesVector, funcsCustom:nameAssoc[], localsCustom:indirectNameAssoc[]):[descriptionTypes, string]{
    let type:descriptionTypes, description = "";
    if(elem instanceof Frame){
        type = "frame";
        description = descCurrentFrame(currStore, elem, funcsCustom, localsCustom);
    }else if(elem instanceof Label){
        type = "label";
        description = descCurrentLabel(currStore, elem);              
    }else if (elem instanceof Op){
    switch(elem.id){
        case Opcode.I32Const:
        case Opcode.I64Const:
        case Opcode.F32Const:
        case Opcode.F64Const:{
            type = "stackelem";
            description = `Element ${elem.kind}: ${elem.args}`;
            break;
        }
        default:{
            type = "instr";
            const currFrame = lookForFrame(currStore.stack)!;
            const funcidx = currFrame?.currentFunc;
            
            if(elem.kind.includes("Local")){
                // local name for local instructions
                const localName:string = localsCustom[funcidx][1][elem.args as number][1][1];
                description = `Instruction ${elem.kind}, args ${localName}`;
            }else{
                description = `Instruction ${elem.kind}, args ${elem.args}`;
            }
            break;
        }
    }
    }else{
        //@ts-ignore
        console.error(elem instanceof Op);
        console.error(elem);
        throw new Error(`Invalid object "${JSON.stringify(elem)}"`);
    }
    return [type, description];
}


export type patchesDescriptor = {
    stateNumber:Number,
    description:string[]
}
export function buildPatchesStrings(stores:storeProducePatches, customSec: custom[]):patchesDescriptor[]{ 
    const [moduleCustom, funcsCustom, localsCustom] = getCustoms(customSec);
    const changes:patchesDescriptor[] = [];
    // console.log("stores",stores);
    stores.patches.forEach((patch, i) => {
        const operations:string[] = [];
        patch.forEach((operation, j) => {
            let value:string = "";
            if(operation.value instanceof Frame) {
                value = descCurrentFrame(stores.states[i], operation.value, funcsCustom, localsCustom);
            }else if(operation.value instanceof Label) {
                value = descCurrentLabel(stores.states[i], operation.value);  
            }else if(operation.value instanceof Op){ // constants
                value = `Stack element '${operation.value.kind}': ${operation.value.args}`;
            }else{ // plain numbers
                value = operation.value.toString();
            }
            if(operation.op == 'replace'){
                operations.push(`REPLACE: ${patchesPaths(operation.path)}. Value = ${value}`);
            }else if(operation.op == 'add'){
                operations.push(`ADD: ${patchesPaths(operation.path)}. Value = ${value}`);
            }else if(operation.op == 'remove'){
                operations.push(`REMOVE: ${patchesPaths(operation.path)}. Value = ${value}`);
            }
        });
        changes.push({stateNumber:i, description:operations});
    });
    return changes;
}

function patchesPaths(path:patchPath):string{
    let pathDescription = "Changes on ";
    for (let i = 0; i < path.length; i++) {
        const elem = path[i];
        if(i == 0){
            pathDescription = `${pathDescription}${elem}`;
            continue;
        }
        if(typeof elem == "number" && i%2 == 1){
            pathDescription = `${pathDescription} at index ${elem.toString()}`;
        }else if(typeof elem == "string" && i%2 == 1){
            pathDescription = `${pathDescription}, element changed: '${elem}'`;
        }else if (typeof elem == "string" && i%2 == 0){
            pathDescription = `${pathDescription}, on '${elem}'`;
        }
    }
    return pathDescription;
}
export type memDescriptors = string[][];
export function buildMemStatesStrings(stores:storeProducePatches):memDescriptors{
    
    const memStates:memDescriptors = [];
    stores.states.forEach((state, i) => {

        const currentMems:string[] = [];
        state.mems.forEach(memInst => {
            if(objectIsEmpty(memInst.data)){
                currentMems.push("empty")
            }else{
                const memBuffer = memInst.data as MaskedArrayObject;
                let memBufferString = "";
                for(let cell in memBuffer){
                    memBufferString = memBufferString.concat(`[${cell}] 0x`+memBuffer[cell].toString(16)+' ')
                }
                memBufferString = memBufferString.slice(0, memBufferString.length-1)
                currentMems.push(memBufferString);
            }
            
        })
        memStates.push(currentMems);
    });
   return memStates;
}

export function buildMemStatesArrays(stores:storeProducePatches):number[][][] {

    const memStates:number[][][] = [];

    stores.states.forEach((state, i) => {

        const currentMems:number[][] = [];
        state.mems.forEach(memInst => {
            if(objectIsEmpty(memInst.data)){
                currentMems.push([]);
            }else{
                const memBuffer = memInst.data as MaskedArrayObject;
                const currentMem = [];
                for(let cell in memBuffer){
                    currentMem.push(memBuffer[cell]);
                }
                currentMems.push(currentMem);
            }
        })
        memStates.push(currentMems);
    });
    return memStates;
}

// export function getLocalNames(customSec:custom[]) {
//     instantiateLocals()
//     const [moduleCustom, funcsCustom, localsCustom] = getCustoms(customSec);
//     // locals
//     let localsStringified:string = "";
//     for (let j = 0; j < currFrame.locals.length; j++) {
//         const localName = localsCustom[funcidx][1][j][1][1];
//         const localType = ValTypeEnum[currFrame.locals[j].type];
//         localsStringified = localsStringified.concat(`'${localName}'= ${currFrame.locals[j].value} (${localType}), `)
//     }
//     localsStringified = localsStringified.slice(0, localsStringified.length-2).concat(".");
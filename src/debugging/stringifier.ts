// convert store, frame and label elements to more human-readable things
import { storeProducePatches, ValTypeEnum } from "../exec/types";
import { Op } from "../helperParser";
import { Opcode } from "../opcodes";
import { custom, indirectNameAssoc, nameAssoc, namesVector, valType, WASMSectionID } from "../types";
import { lookForLabel, lookForFrame, Frame, Label, WasmFuncType, WebAssemblyMtsStore } from "../exec/wasmm";
import { WasmModule } from "../parser";
import { current } from "immer";
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
    const moduleCustom = customSec.find(subsec => subsec.subsecId == 0)?.names as namesVector;
    const funcsCustom = customSec.find(subsec => subsec.subsecId == 1)?.names as nameAssoc[];
    const localsCustom = customSec.find(subsec => subsec.subsecId == 2)?.names as indirectNameAssoc[];

    for (let i = 0; i < stores.states.length; i++) {
        const currStore = stores.states[i];
        let elemDescriptors:elemDescriptor[] = [];

        currStore.stack.forEach(elem => {
            let type:descriptionTypes, description:string = "";
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
                throw new Error(`Invalid object "${elem}"`);
            }
            elemDescriptors.push({
                type,
                description
            })
        });
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
}
export function descCurrentFrame(currStore:WebAssemblyMtsStore, currFrame:Frame | undefined = undefined, funcsCustom:nameAssoc[], localsCustom:indirectNameAssoc[]):string{
    // when called outside (with just the current store) looks for the last frame
    if (currFrame == undefined){
        currFrame = lookForFrame(currStore.stack)!;
    }
    const funcidx = currFrame.currentFunc;
    const funcName = funcsCustom[funcidx][1][1];
    // locals
    let localsStringified:string = "";
    for (let j = 0; j < currFrame.locals.length; j++) {
        const localName = localsCustom[funcidx][1][j][1][1];
        const localType = ValTypeEnum[currFrame.locals[j].type];
        localsStringified = localsStringified.concat(`'${localName}'= ${currFrame.locals[j].value} (${localType}), `)
    }
    localsStringified = localsStringified.slice(0, localsStringified.length-2).concat(".");

    return `Frame, function:'${funcName}' (idx: ${funcidx}), locals:${localsStringified}`;
}
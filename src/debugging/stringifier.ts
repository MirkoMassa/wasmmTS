// convert store, frame and label elements to more human-readable things
import { storeProducePatches } from "../exec/types";
import { Op } from "../helperParser";
import { Opcode } from "../opcodes";
import { valType, WASMSectionID } from "../types";
import { lookForLabel, lookForFrame, Frame, Label, WasmFuncType } from "../exec/wasmm";
import { WasmModule } from "../parser";
export type descriptionTypes = "frame" | "label" | "instr" | "stackelem";
export type elemDescriptor = { 
    type:descriptionTypes, 
    description:string
} 
export type stateDescriptor = {
    stateNumber:Number,
    elemDescriptors:elemDescriptor[]
}

export function buildStateStrings(stores:storeProducePatches, moduleTree: WasmModule):stateDescriptor[]{
    const stateDescriptors:stateDescriptor[] = [];

    for (let i = 0; i < stores.states.length; i++) {
        const currStore = stores.states[i];
        let elemDescriptors:elemDescriptor[] = [];
        const customSec = moduleTree.sections.find(sec => sec.id == WASMSectionID.WACustom)?.content;
        console.log(customSec)
        currStore.stack.forEach(elem => {
            let type:descriptionTypes, description:string = "";
            if(elem instanceof Frame){
                // locals
                let localsStringified:string = "";
                for (let j = 0; j < elem.locals.length; j++) {
                    localsStringified.concat(`${elem.locals[j].type} (${elem.locals[j].type}), `)
                }
                localsStringified = localsStringified.slice(0, localsStringified.length-3);
                type = "frame";
                description = "Frame, funcAddress(IDX): " + elem.currentFunc + ", " + 
                "locals: " + localsStringified;

            }else if(elem instanceof Label){
                let funcType;
                if(elem.type instanceof WasmFuncType) funcType = elem.type.toString;
                else if(typeof elem.type == 'number') funcType = `() => ${elem.type}`;
                else funcType = "absent";
                type = "label";
                description = "Label, instruction index: " + elem.instrIndex + ", " + 
                "type: " + funcType;
            }else{
                type = "instr";
                description = "other";
                // switch(elem.id){
                //     case Opcode.I32Const:
                //     case Opcode.I64Const:
                //     case Opcode.F32Const:
                //     case Opcode.F64Const:{
                //         type = "stackelem";
                //         break;
                //     }
                //     default:{
                //         type = "instr";
                //         break;
                //     }
                // }
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
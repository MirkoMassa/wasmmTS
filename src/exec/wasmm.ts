import { Immer, produce, produceWithPatches, immerable } from 'immer';
import { current } from 'immer';
import {enablePatches} from "immer"
enablePatches();
import  * as types from "./types";
import  * as parserTypes from "../types";
import { ExportSection, parseModule }from "../parser";
import { assert } from 'console';
import { Op, IfElseOp, BlockOp } from '../helperParser';
import { Opcode } from "../opcodes"
import { checkTypeOpcode } from './operations';
import * as execute from "./operations"
export type WasmType = "i32" | "i64" | "f32" | "f64" | "funcref" | "externref" | "vectype";

export class Label extends Op{
    [immerable] = true;
    constructor(public arity:number, public instr: Op[], public type:WasmFuncType | parserTypes.valType | undefined, 
        public instrIndex: number = 0, public isblock:Boolean = false, public parameters:Op[] = []){
        super(Opcode.Label, []);
    }
}
export class Frame extends Op{
    [immerable] = true;
    constructor(public locals:parserTypes.localsVal[], public module:types.WebAssemblyMtsModule, public currentFunc: number){
        super(Opcode.Frame, []);
    }
}

export class WasmFuncType {
    [immerable] = true;
    parameters: WasmType[];
    returns: WasmType[];
    constructor(rawType: parserTypes.funcType) {
        this.parameters = [];
        if(rawType.parameters != undefined){
            for(let i=0; i < rawType.parameters[0]; i++) {
                switch(rawType.parameters[1][i]) {
                    case 0x7F: this.parameters.push("i32"); break;
                    case 0x7E: this.parameters.push("i64"); break;
                    case 0x7D: this.parameters.push("f32"); break;
                    case 0x7C: this.parameters.push("f64"); break;
                    case 0x70: this.parameters.push("funcref"); break;
                    case 0x6f: this.parameters.push("externref"); break;
                    case 0x7B: this.parameters.push("vectype"); break;
                    default: throw new Error("Invalid parameter type");
                }
            }
        }
        this.returns = [];
        if(rawType.returns != undefined){
            for(let i=0; i < rawType.returns[0]; i++) {
                switch(rawType.returns[1][i]) {
                    case 0x7F: this.returns.push("i32"); break;
                    case 0x7E: this.returns.push("i64"); break;
                    case 0x7D: this.returns.push("f32"); break;
                    case 0x7C: this.returns.push("f64"); break;
                    case 0x70: this.returns.push("funcref"); break;
                    case 0x6f: this.returns.push("externref"); break;
                    case 0x7B: this.returns.push("vectype"); break;
                    default: throw new Error("Invalid return type");
                }
            }
        }
    }
    toString() {
        return `(${this.parameters.join(",")}) => ${this.returns.join(",")}`;
    }
    toInstantiation() {
        const params:parserTypes.localsVal[] = [];

        for(let i=0; i < this.parameters.length; i++) {
            switch(this.parameters[i]) {
                case "i32": params.push({value:0, type:0x7F}); break;
                case "i64": params.push({value:0n, type:0x7E}); break;
                case "f32": params.push({value:0, type:0x7D}); break;
                case "f64": params.push({value:0, type:0x7C}); break;
                case "funcref": params.push({value:0, type:0x70}); break;
                case "externref": params.push({value:0, type:0x6f}); break;
                case "vectype": params.push({value:0, type:0x7B}); break;
                default: throw new Error("Invalid return type");
            }
        }
        return params;
    }
}
// export class WasmTableType {
//     table: parserTypes.tableType;
//     references: number[];

//     constructor(rawTable:parserTypes.tableType) {
//         this.table = 
//     }
// }

export class WebAssemblyMtsStore implements types.Store {
    [immerable] = true;
    public stack: Op[];
    constructor(public funcs: types.FuncInst[]=[], public tables: types.TableInst[]=[], public mems: types.MemInst[]=[], 
        public globals: types.GlobalInst[]=[], public exports: types.ExportInst[]=[]) {
        this.stack = [];
    }
    takeMem(): types.MemInst{
        const frame = lookForFrame(this.stack);
        memCheck(frame!);
        const addr = frame!.module.mems[0].val;
        return this.mems[addr];
    }

    executeOp(op: Op | IfElseOp, currLabel:Label):void | Op[] {
        const len = this.stack.length;
        switch(op.id){
            case Opcode.Call:{
                const frame = lookForFrame(this.stack);
                if(frame?.module.funcs[op.args as number] == undefined) throw new Error(`Function (typeidx ${op.args} doesn't exists.`);
                debugger;
                let funcInstance:types.FuncInst;
                let funcAddress: number;
                let label:Label, newFrame:Frame;
                funcAddress = op.args as number;
                funcInstance = this.funcs[funcAddress-1];
                label = new Label(funcInstance!.type.returns.length, funcInstance!.code.body, funcInstance!.type);
                const params:parserTypes.localsVal[] = funcInstance!.type.toInstantiation();
                const locals:parserTypes.localsVal[] = funcInstance!.code.locals;
                const allLocals:parserTypes.localsVal[] = params.concat(locals);
                newFrame = new Frame(allLocals, funcInstance!.module, funcAddress!);
                const parametersArity = funcInstance!.type.parameters.length;

                const args:Op[] = new Array(parametersArity);
                for (let i = 0; i < parametersArity; i++) {
                    args[i] = this.stack.pop()!;
                }
                execute.processParams(parametersArity, funcInstance!.type.parameters, args, newFrame.locals);
                
                this.stack.push(newFrame);
                this.stack.push(label);
                break;
            }
            case Opcode.Return:{
                //Find the current Frame
                const frame = lookForFrame(this.stack);
                if(frame! == undefined) throw new Error("No frame on stack found");
                //get the number of return values
                let funcTypeAddr = frame.module.funcs[frame.currentFunc];
                const returns = frame.module.types[funcTypeAddr.val].returns.length;
                let returnArity = returns;
  
                // console.log("returns",returns);
                let results: Op[] = [];
                //turn this into a check for type of the return values from returns (check from top of the stack until Frame)
                if (this.stack.length < returnArity) throw new Error("Missing return values");
               
                //Maybe the following could be replaced with result = this.stack.slice(this.stack.length-returnArity);
                for(let i = 0; i < returnArity; i++) {
                    results.push(this.stack.pop()!);
                }
                do {
                    this.stack.pop();
                } while(!(this.stack[this.stack.length-1] instanceof Frame) || this.stack.length == 0)
                assert(this.stack[this.stack.length-1] instanceof Frame, "No frame found") 
                //pop the frame
                debugger;
                this.stack.pop();
                this.stack.push(...results);
                // console.log("stack after pop", current(this.stack));
                // console.log("stack after return", JSON.stringify(current(this.stack), null, 2))
                break;
            }
            // control instructions
            case Opcode.If:{ // else is handled inside
                const frame = lookForFrame(this.stack);
                const moduleTypes = frame!.module.types;
                // passing the boolean (constant numtype), the ifop (containing the block), the store and the module types reference
                const labelRes = execute.ifinstr(this.stack.pop()!, op as IfElseOp, moduleTypes, this.stack);
                this.stack.push(labelRes);
                break;
            }
            case Opcode.Block:{
                // a br will branch at the end of it
                const frame = lookForFrame(this.stack);
                const moduleTypes = frame!.module.types;
                const labelRes = execute.executeBlock(op as BlockOp, moduleTypes, this.stack);
                labelRes.isblock = true;
                this.stack.push(labelRes);
                break;
            }
            case Opcode.Loop:{
                // debugger;
                // a br will branch at the start of it
                const frame = lookForFrame(this.stack);
                const moduleTypes = frame!.module.types;
                const labelRes = execute.executeBlock(op as BlockOp, moduleTypes, this.stack);
                this.stack.push(labelRes);
                break;
            }
            case Opcode.Br:{
                execute.br(this.stack, op.args as number);
                break;
            }
            case Opcode.BrIf:{
                execute.br_if(this.stack.pop()!, this.stack, op.args as number);
                break;
            }
            case Opcode.End:{
                break;
            }
            // consts
            case Opcode.I32Const:
            case Opcode.I64Const:
            case Opcode.F32Const:
            case Opcode.F64Const:{
                this.stack.push(op)
                break;
            }
            // math
            case Opcode.i32add:{
                // console.log("params are: ",currLabel.parameters);
                debugger;
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                // console.log("obtained values are",x, y);
                this.stack.push(execute.i32add(x, y))
                break;
            }
            case Opcode.i32sub:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i32sub(x, y))
                break;
            }
            case Opcode.i32mul:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i32mul(x, y))
                break;
            }
            case Opcode.i32divU:
            case Opcode.i32divS:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i32div(x, y))
                break;
            }
            case Opcode.i64add:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i64add(x, y))
                break;
            }
            case Opcode.i64sub:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i64sub(x, y))
                break;
            }
            case Opcode.i64mul:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i64mul(x, y))
                break;
            }
            case Opcode.i64divU:
            case Opcode.i64divS:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.i64div(x, y))
                break;
            }
            case Opcode.f32add:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f32add(x, y))
                break;
            }
            case Opcode.f32sub:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f32sub(x, y))
                break;
            }
            case Opcode.f32mul:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f32mul(x, y))
                break;
            }
            case Opcode.f32div:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f32div(x, y))
                break;
            }
            case Opcode.f64add:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f64add(x, y))
                break;
            }
            case Opcode.f64sub:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f64sub(x, y))
                break;
            }
            case Opcode.f64mul:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f64mul(x, y))
                break;
            }
            case Opcode.f64div:{
                let [y, x] = constParamsOperationValues(this.stack, currLabel);
                if(this.stack.length<2) throw new Error(`Expecting 2 arguments, got ${this.stack.length}`);
                this.stack.push(execute.f64div(x, y))
                break;
            }

            // comparisons
            //EQZ
            case Opcode.I32Eqz:{
                this.stack.push(execute.i32eqz(this.stack.pop()!))
                break;
            }
            case Opcode.I64Eqz:{
                this.stack.push(execute.i64eqz(this.stack.pop()!))
                break;
            }
            //EQ
            case Opcode.I32Eq:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i32eq(x, y))
                break;
            }
            case Opcode.I64Eq:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i64eq(x, y))
                break;
            }
            case Opcode.F32Eq:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f32eq(x, y))
                break;
            }
            case Opcode.F64Eq:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f64eq(x, y))
                break;
            }
            //NE
            case Opcode.I32Ne:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i32ne(x, y))
                break;
            }
            case Opcode.I64Ne:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i64ne(x, y))
                break;
            }
            case Opcode.F32Ne:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f32ne(x, y))
                break;
            }
            case Opcode.F64Ne:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f64ne(x, y))
                break;
            }
            //LT
            case Opcode.I32LtS:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i32lts(x, y))
                break;
            }
            case Opcode.I32LtU:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i32ltu(x, y))
                break;
            }
            case Opcode.I64LtS:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i64lts(x, y))
                break;
            }
            case Opcode.I64LtU:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i64ltu(x, y))
                break;
            }
            case Opcode.F32Lt:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f32lt(x, y))
                break;
            }
            case Opcode.F64Lt:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f64lt(x, y))
                break;
            }
            //GT
            case Opcode.I32GtS:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i32gts(x, y))
                break;
            }
            case Opcode.I32GtU:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i32gtu(x, y))
                break;
            }
            case Opcode.I64GtS:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i64gts(x, y))
                break;
            }
            case Opcode.I64GtU:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i64gtu(x, y))
                break;
            }
            case Opcode.F32Gt:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f32gt(x, y))
                break;
            }
            case Opcode.F64Gt:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f64gt(x, y))
                break;
            }
            //LE
            case Opcode.I32LeS:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i32les(x, y))
                break;
            }
            case Opcode.I32LeU:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i32leu(x, y))
                break;
            }
            case Opcode.I64LeS:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i64les(x, y))
                break;
            }
            case Opcode.I64LeU:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i64leu(x, y))
                break;
            }
            case Opcode.F32Le:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f32le(x, y))
                break;
            }
            case Opcode.F64Le:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f64le(x, y))
                break;
            }
            //GE
            case Opcode.I32GeS:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i32ges(x, y))
                break;
            }
            case Opcode.I32GeU:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i32geu(x, y))
                break;
            }
            case Opcode.I64GeS:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i64ges(x, y))
                break;
            }
            case Opcode.I64GeU:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.i64geu(x, y))
                break;
            }
            case Opcode.F32Ge:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f32ge(x, y))
                break;
            }
            case Opcode.F64Ge:{
                let [x, y] = constParamsOperationValues(this.stack, currLabel);
                this.stack.push(execute.f64ge(x, y))
                break;
            }
            //getters and setters
            // local get/set
            case Opcode.SetLocal:{
                const frame = lookForFrame(this.stack);
                const localToSet:parserTypes.localsVal = frame!.locals[op.args as number];
                execute.setLocal(localToSet, this.stack.pop()!);
                break;
            }
            case Opcode.GetLocal:{
                const frame = lookForFrame(this.stack);
                const localToGet:parserTypes.localsVal = frame!.locals[op.args as number];
                this.stack.push(execute.getLocal(localToGet));
                break;
            }
            case Opcode.TeeLocal:{ // like set but keeping the const
                const frame = lookForFrame(this.stack);

                const localToSet:parserTypes.localsVal = frame!.locals[op.args as number];
                const valToKeep = this.stack.pop();
                this.stack.push(valToKeep!);
                execute.setLocal(localToSet, valToKeep!);
                break;
            }
            // memory instructions
            // load
            case Opcode.I32Load:{
                const memInst = this.takeMem();
                execute.load(this.stack, Opcode.I32Const, memInst, op.args as parserTypes.memarg, 32);
                break;
            }
            case Opcode.I64Load:{
                const memInst = this.takeMem();
                execute.load(this.stack, Opcode.I64Const, memInst, op.args as parserTypes.memarg, 64);
                break;
            }
            case Opcode.F32Load:{
                const memInst = this.takeMem();
                execute.load(this.stack, Opcode.F32Const, memInst, op.args as parserTypes.memarg, 32);
                break;
            }
            case Opcode.F64Load:{
                const memInst = this.takeMem();
                execute.load(this.stack, Opcode.F64Const, memInst, op.args as parserTypes.memarg, 64);
                break;
            }

            // store
            case Opcode.I32Store:{
                const memInst = this.takeMem();
                execute.store(this.stack, Opcode.I32Const, memInst, op.args as parserTypes.memarg, false, 32);
                break;
            }
            case Opcode.I32Store8:{
                const memInst = this.takeMem();
                execute.store(this.stack, Opcode.I32Const, memInst, op.args as parserTypes.memarg, true, 8);
                break;
            }
            case Opcode.I32Store16:{
                const memInst = this.takeMem();
                execute.store(this.stack, Opcode.I32Const, memInst, op.args as parserTypes.memarg, true, 16);
                break;
            }
            case Opcode.I64Store:{
                const memInst = this.takeMem();
                execute.store(this.stack, Opcode.I64Const, memInst, op.args as parserTypes.memarg, true, 64);
                break;
            }
            case Opcode.I64Store8:{
                const memInst = this.takeMem();
                execute.store(this.stack, Opcode.I64Const, memInst, op.args as parserTypes.memarg, true, 8);
                break;
            }
            case Opcode.I64Store16:{
                const memInst = this.takeMem();
                execute.store(this.stack, Opcode.I64Const, memInst, op.args as parserTypes.memarg, true, 16);
                break;
            }
            case Opcode.I64Store32:{
                const memInst = this.takeMem();
                execute.store(this.stack, Opcode.I64Const, memInst, op.args as parserTypes.memarg, true, 32);
                break;
            }
            case Opcode.F32Store:{
                const memInst = this.takeMem();
                execute.store(this.stack, Opcode.F32Const, memInst, op.args as parserTypes.memarg, false, 32);
                break;
            }
            case Opcode.F64Store:{
                const memInst = this.takeMem();
                execute.store(this.stack, Opcode.F64Const, memInst, op.args as parserTypes.memarg, false, 64);
                break;
            }


            // global get/set
            // case Opcode.SetGlobal:{
            //     const frame = this.stack[1] as Frame;
            //     const globalFromModule =  [this.stack.pop()?.args as number]; // NEED TO TAKE GLOBALS FROM THE STORE (GLOBAL INST)
            //     const globalToSet:parserTypes.globalsVal = {

            //         value: globalFromModule.val, //wrong
            //         type: globalFromModule.kind //wrong
            //     }
            // }
            // case Opcode.GetGlobal:{
                
            // }

        }
    }
}

export class WebAssemblyMts {
    static store: WebAssemblyMtsStore;
    [immerable] = true;
    static async compile(bytes:Uint8Array): Promise<types.WebAssemblyMtsModule> {
        //call parser on the bytes
        let [moduleTree, length] = parseModule(bytes);

        assert(length == bytes.byteLength, "Module byte length error.");
        if(WebAssemblyMts.store == undefined) WebAssemblyMts.store = new WebAssemblyMtsStore();
        let mtsModule: types.WebAssemblyMtsModule = {
            types: [],
            funcs: [],
            tables: [],
            mems: [],
            globals: [],
            elems: [],
            datas: [],
            exports: []
        }
        let typesSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAType)
        let functionSignatures = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAFunction)
        let functionCodes = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WACode)
        let tableSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WATable)
        let memorySection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAMemory)
        let globalSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAGlobal)
        let elemSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAElement)
        let dataSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAData)
        let exportSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAExport)

        for(let type of typesSection!.content) {
            mtsModule.types.push(new WasmFuncType(type));
        }
        // FuncInst
        const funcTypeSignatures = functionSignatures?.content;
        // console.log("signatures",funcTypeSignatures)
        for (let i = 0; i < funcTypeSignatures.length; i++) {
            let func:types.FuncInst= {
                type: mtsModule.types[funcTypeSignatures[i]],
                module: mtsModule,
                code: functionCodes?.content[i].content
            }
            WebAssemblyMts.store.funcs.push(func)
            //every instance reference addrs is with respect to the store indices
            mtsModule.funcs.push(
                {kind: "funcaddr", val: funcTypeSignatures[i]}
            )
        }
        // TableInst
        
        //tables seems to be arrays of function references/functions
        // for(let index in tableSection?.content) {
            
        //     let table:types.TableInst= {
        //         type: tableSection?.content[index],
        //         elem: 
        //     }
        //     let length = WebAssemblyMts.store.funcs.push(table)
        //     mtsModule.tables.push(
        //         {kind: "tableaddr", val: length-1}
        //     )
        // }

        // MemInst
        for(let index in memorySection?.content) {
            
            const vecLength = 65536 * memorySection?.content[index].min;
            // > 127 into a cell of an Int8arry then it will be read back as a negative number
            // javascript numbers are 64 floating points numbers
            // negative floating point numbers will all the left most bits to 1. 
            // 1110 + 1 = 0000
            const data = new Uint8Array(vecLength);
            let mem:types.MemInst= {
                type: memorySection?.content[index],
                data
            }
            let length = WebAssemblyMts.store.mems.push(mem)
            mtsModule.mems.push(
                {kind: "memaddr", val: length-1}
            )
        }
        // GlobalInst
        for(let index in globalSection?.content) {
            let global:types.GlobalInst= {
                mut: globalSection?.content[index].gt.mutability == 0 ? "const" : "mut",
                type: globalSection?.content[index].gt,
                value: 0, //concrete value
                init: globalSection?.content[index].expr //op
            }
            let length = WebAssemblyMts.store.globals.push(global)
            mtsModule.globals.push(
                {kind: "globaladdr", val: length-1}
            )
        }
        // ElemInst

        // for(let index in elemSection?.content) {
        //     let elem:types.ElemInst= {
        //         type: elemSection?.content[index].type
        //         data: // vector of ref
        //     }
        // }

        // ExportInst
        for(let index in exportSection?.content) {
            // parsing the address type (exportdesc[0] is the desctype)
            let value:types.ExternVal;
            const exportdesc = exportSection?.content[index].exportdesc;
            const exportedType = exportdesc[0];
            const exportedAddress = exportdesc[1];
            switch(exportedType){
                case 0: value = {kind:"funcaddr", val: exportedAddress}; break;
                //NEED TO CHANGE OTHER CASES with mtsModule.table/mem/global ...
                // case 1: value = {kind:"tableaddr", val: exportedAddress}; break;
                case 2: value = {kind:"memaddr", val: exportedAddress}; break;
                // case 3: value = {kind:"globaladdr", val: exportedAddress}; break;
                default: throw new Error(`Invalid export description type`);
            }
            let exports:types.ExportInst= {
                valName: exportSection?.content[index].name[1],
                value
            }
            // console.log("exp",exports)
            WebAssemblyMts.store.exports.push(exports)
            mtsModule.exports.push(exports)
        }
        return mtsModule;
        //returned module is basically the parse tree
        //compile does not run the code at all
        //will add values to the global store
        //will return references/basically the index in the store for each object in the module.
    }
    static async instantiate(moduleMts: types.WebAssemblyMtsModule, importObject?: object): Promise<types.WebAssemblyMtsInstance>;
    static async instantiate(bytes:Uint8Array, importObject?: object): Promise<types.WebAssemblyMtsInstantiatedSource>;

    static async instantiate(moduleOrBytes: unknown, importObject?: object): Promise<types.WebAssemblyMtsInstantiatedSource | types.WebAssemblyMtsInstance> {
        //import object is how many page of memory there are
        if(moduleOrBytes instanceof Uint8Array) {
            const wmodule = await this.compile(moduleOrBytes);
            const instance:types.WebAssemblyMtsInstance = {exports: {}, exportsTT: {}, object: undefined};
            const instantiatedSource: types.WebAssemblyMtsInstantiatedSource = {module: wmodule, instance};
            
            wmodule.exports.forEach(exp => {
                if(exp.value.kind == "funcaddr"){
                    instantiatedSource.instance.exports[exp.valName] = (...args: any[]) => {
                        const funcRes:Op | Op[] = WebAssemblyMts.run(exp, ...args);

                        // \/ this is to return directly vals, not Op consts \/
                        if(funcRes instanceof Op){
                            return funcRes.args;
                        }else{
                            // console.log("func res",funcRes)
                            const returns:parserTypes.valType[] = [];
                            funcRes.forEach(op=> {
                                returns.push(op.args as parserTypes.valType)
                            });
                            return returns;
                        }
                        
                    }
                    // time travel
                    instantiatedSource.instance.exportsTT[exp.valName] = (...args: any[]) => {
                        const funcRes:{val: Op | Op[], stores: types.storeProducePatches} = WebAssemblyMts.runTT(exp, ...args);
                        return funcRes;
                    }
                }
                else if(exp.value.kind == "memaddr"){
                    instantiatedSource.instance.exports[exp.valName] = WebAssemblyMts.store.mems[exp.value.val].data;
                }
            })
            return instantiatedSource;

        }else if(isWebAssemblyModule(moduleOrBytes)) {
            // need to implement importobject  
            const instantiatedSource: types.WebAssemblyMtsInstantiatedSource =
            {module: moduleOrBytes, instance:{exports: {}, exportsTT: {}, object: undefined}};
            moduleOrBytes.exports.forEach(exp => {
                if(exp.value.kind == "funcaddr"){
                    instantiatedSource.instance.exports[exp.valName] = (...args: any) => {
                        return WebAssemblyMts.run(exp, ...args);
                    }
                    // time travel
                    instantiatedSource.instance.exportsTT[exp.valName] = (...args: any) => {
                        return WebAssemblyMts.runTT(exp, ...args);
                    }
                }
            })
            // moduleOrBytes.exports.forEach(exp =>{
            //     if(exp.value.kind == "funcaddr"){
            //         instantiatedSource.instance.exportsTT[exp.valName] = (...args: any) => {
            //             return WebAssemblyMts.runTT(exp, ...args);
            //         }
            //     }
            // })
            return instantiatedSource;
        }
        throw new Error("Bad input data");
    }

    static run(func:types.ExportInst, ...args: unknown[]):any;
    static run(func:types.FuncAddr, ...args: unknown[]):any;

    static run(func:unknown, ...args: unknown[]){
        let funcInstance:types.FuncInst;
        let funcAddress: number;
        let label:Label, frame:Frame;
        if(isExportInst(func)){
            funcAddress = func.value.val;
            funcInstance = this.store.funcs[funcAddress-1];
        }else if(isFuncAddr(func)){
            funcAddress = func.val;
            funcInstance = this.store.funcs[funcAddress-1];
        // }else if(isLabel(func)){
        }else{
            throw new Error("Bad function reference.")
        }
        // label (arity and code)
        label = new Label(funcInstance!.type.returns.length, funcInstance!.code.body, funcInstance!.type);
        // activation frame (locals and module)
        const params:parserTypes.localsVal[] = funcInstance!.type.toInstantiation();
        const locals:parserTypes.localsVal[] = funcInstance!.code.locals;
        const allLocals:parserTypes.localsVal[] = params.concat(locals);
        frame = new Frame(allLocals, funcInstance!.module, funcAddress!);
        this.store.stack.push(frame);
        const parametersArity = funcInstance!.type.parameters.length;
        const returnsArity = funcInstance!.type.returns.length;
        execute.processParams(parametersArity, funcInstance!.type.parameters, args, frame.locals);
        return this.executeInstructions(label, returnsArity);
    }

    static executeInstructions(label:Label, returnsArity:number):Op | Op[]{
        this.store.stack.push(label);
        // OLD CODE
        //with function calls I'll call the run method passing n args (popping values from the stack)
        // label.instr.forEach(op => {
        //     // take n parameters (arity) from the call
        //     this.store.executeOp(op)
        //     label.instrIndex++;
        //     // console.log("stackstatus ",this.store.stack);
        // });
        try {
        while(lookForLabel(this.store.stack) != undefined) {
            const currLabel = lookForLabel(this.store.stack)!;
            // console.log("stack after label",this.store.stack);

            if(currLabel.instrIndex < currLabel.instr.length){
                // console.log("instrindex",currLabel.instrIndex);
                // console.log("Instruction:",currLabel.instr[currLabel.instrIndex].kind)
                this.store.executeOp(currLabel.instr[currLabel.instrIndex], currLabel);
                currLabel.instrIndex++;
            }else{
                const labelRes: Op[] = [];
                for (let i = 0; i < currLabel.arity; i++) {
                    labelRes.push(this.store.stack.pop()!);
                }
                // console.log("popped",labelRes)
                // console.log("current last element",this.store.stack[this.store.stack.length-1]);
                if(this.store.stack[this.store.stack.length-1] != currLabel) throw new Error("No label on top of the stack.");
                this.store.stack.pop();
                labelRes.forEach(val => {
                    this.store.stack.push(val);
                });
            }
        }
        } catch(err) {
            console.log("UNEXPECTED ERROR. Stack:",this.store.stack);
            throw err;
        }
        if(this.store.stack.length < returnsArity) throw new Error("Not enough return elements in the stack");
        if(returnsArity > 1){
            const res = new Array(returnsArity);
            for (let i = returnsArity-1; i >=0 ; i--) {
                res[i] = this.store.stack.pop();
            }
            // console.log("multires", res);
            return res;
        }else{
            // console.log("singleres", this.store.stack.pop());
            return this.store.stack.pop()!;
        }
    }

    static runTT(func:types.ExportInst, ...args: unknown[]):any;
    static runTT(func:types.FuncAddr, ...args: unknown[]):any;

    static runTT(func:unknown, ...args: unknown[]){
        let funcInstance:types.FuncInst;
        let funcAddress: number;
        let label:Label, frame:Frame;
        if(isExportInst(func)){
            funcAddress = func.value.val;
            funcInstance = this.store.funcs[funcAddress-1];
        }else if(isFuncAddr(func)){
            funcAddress = func.val;
            funcInstance = this.store.funcs[funcAddress-1];
        // }else if(isLabel(func)){
        }else{
            throw new Error("Bad function reference.")
        }
        // creating states array of store, pushing the base store and an empty patch
        const stores:types.storeProducePatches = {
            states: [],
            patches: [],
            previousPatches: []
        };
        const parametersArity = funcInstance!.type.parameters.length;
        const returnsArity = funcInstance!.type.returns.length;
        const produced = produceWithPatches(this.store, (state)=>{
            label = new Label(funcInstance!.type.returns.length, funcInstance!.code.body, funcInstance!.type);
            // activation frame (locals and module)
            const params:parserTypes.localsVal[] = funcInstance!.type.toInstantiation();
            const locals:parserTypes.localsVal[] = funcInstance!.code.locals;
            const allLocals:parserTypes.localsVal[] = params.concat(locals);
            frame = new Frame(allLocals, funcInstance!.module, funcAddress!);
            state.stack.push(frame);
            state.stack.push(label);
            // debugger;
            execute.processParams(parametersArity, funcInstance!.type.parameters, args, frame.locals);
            return state;
        })
        stores.states.push(produced[0]);
        stores.patches.push(produced[1]);
        stores.previousPatches.push(produced[2]);
        // console.log("stores",JSON.stringify(stores.patches, null, 2));
        // label (arity and code)
        return this.executeInstructionsTT(returnsArity, stores);
    }

    static executeInstructionsTT(returnsArity:number, stores:types.storeProducePatches): { stores: types.storeProducePatches, val: Op | Op[]} {
        let currStore = stores.states[stores.states.length-1];
        // console.log("store:",currStore)
        try {
            
        while(lookForLabel(currStore.stack) != undefined) {
            // debugger;
            // console.log("stack after label",this.store.stack);
            const produced = produceWithPatches(currStore, (state)=>{
                const currLabel = lookForLabel(state.stack)!;
                if(currLabel.instrIndex < currLabel.instr.length){
                    // console.log("instrindex",currLabel.instrIndex);
                    // console.log("Instruction:",currLabel.instr[currLabel.instrIndex].kind)
                    // console.log("curr op",currLabel.instr[currLabel.instrIndex].kind, "len",state.stack.length)
                    state.executeOp(currLabel.instr[currLabel.instrIndex], currLabel);
                    currLabel.instrIndex++;
                }else{
                    const labelRes: Op[] = [];
                    for (let i = 0; i < currLabel.arity; i++) {
                        labelRes.push(state.stack.pop()!);
                    }
                    // console.log("popped",labelRes)
                    // console.log("current last element",state.stack[state.stack.length-1]);
                    if(state.stack[state.stack.length-1] != currLabel) throw new Error("No label on top of the stack.");
                    state.stack.pop();
                    labelRes.forEach(val => {
                        state.stack.push(val);
                    });
                }
                return state;
            })
            stores.states.push(produced[0]);
            stores.patches.push(produced[1]);
            stores.previousPatches.push(produced[2]);
            currStore = stores.states[stores.states.length-1];
        }
        } catch(err) {
            console.log("UNEXPECTED ERROR. Stack:", currStore.stack);
            throw err;
        }
        if(currStore.stack.length < returnsArity) throw new Error("Not enough return elements in the stack");
        if(returnsArity > 1){
            const res = new Array(returnsArity);
            for (let i = returnsArity-1; i >=0 ; i--) {
                // res[i] = currStore.stack.pop();
                res[i] = currStore.stack[i];
            }
            // console.log("multires", res);
            return {stores, val: res}
        }else{
            // console.log("store",currStore)
            const res: Op = currStore.stack[currStore.stack.length-1];
            // console.log("singleres", res);
            return {stores, val: res}
        }
    }
}

// helper funcs
export function isWebAssemblyModule(data: unknown): data is types.WebAssemblyMtsModule {
    //runtime test of the data: if it is true assert something about the type of data to typescript
    return (data as types.WebAssemblyMtsModule).types !== undefined;
}
export function isExportInst(func: unknown): func is types.ExportInst {
    return (func as types.ExportInst).valName !== undefined;
}
export function isFuncAddr(func: unknown): func is types.FuncAddr {
    return (func as types.FuncAddr).val !== undefined;
}
//look from the top of the stack til you find a frame
export function lookForFrame(stack:Op[]){
    let frame: Frame;
    for (let i = stack.length; i >= 0; i--) {
        if(stack[i] instanceof Frame) {
            frame = stack[i] as Frame;
            return frame;
        }
    }
    if(frame! == undefined) throw new Error("No frame on stack found");
}
export function lookForLabel(stack:Op[], labelidx:number = 0){
    // looks for the n label from the top of the stack, where n is the labelidx
    let label: Label;
    let labelPointer = 0;
    for (let i = stack.length-1; i >= 0; i--) {
        if(stack[i] instanceof Label) {
            if(labelPointer == labelidx){
                label = stack[i] as Label;
                return label;
            }
            labelPointer++;
        }
    }
}
export function labelCount(stack:Op[]){
    let counter = 0;
    for (let i = stack.length-1; i >= 0; i--) {
        if(stack[i] instanceof Label) {
            counter++;
        }
    }
    return counter;
}
export function doublePopConst(stack:Op[]){
    const res = [];
    let savedLabel:Label | undefined = undefined;
    if(stack[stack.length-1] instanceof Label){
        savedLabel = stack.pop() as Label;
    }
    for (let i = stack.length-1; i >= 0; i--) {
            res.push(stack.pop());
        
        if(res.length == 2){
            if(savedLabel != undefined) stack.push(savedLabel);
            return res as [Op, Op];
        } 
    }
}
export function constParamsOperationValues(stack:Op[], currLabel:Label): [Op, Op]{
    if(currLabel.parameters.length > 0){
        return [currLabel.parameters.pop()!, currLabel.parameters.pop()!];
    } else{
        return doublePopConst(stack)!;
    }
}
export function memCheck(frame:Frame){
    if(frame.module.mems[0] == undefined) throw new Error("Undefined memory.");
}
import { Immer, produce, produceWithPatches, immerable, setAutoFreeze, enableMapSet,  } from 'immer';
import { current } from 'immer';
import {enablePatches} from "immer"
enablePatches();
enableMapSet();

import  * as types from "./types";
import  * as parserTypes from "../types";
import { ExportSection, parseModule }from "../parser";
import { Op, IfElseOp, BlockOp } from '../helperParser';
import { Opcode } from "../opcodes"
import { checkTypeOpcode } from './operations';
import * as execute from "./operations"
import { WritableDraft } from 'immer/dist/types/types-external';
import { createExports } from './export';
export type WasmType = "i32" | "i64" | "f32" | "f64" | "funcref" | "externref" | "vectype";

export class Label extends Op{
    [immerable] = true;
    setAutoFreeze = false;
    constructor(public arity:number, public instr: Op[], public type:WasmFuncType | parserTypes.valType | undefined, 
        public instrIndex: number = 0, public isblock:Boolean = false, public parameters:Op[] = []){
        super(Opcode.Label, []);
    }
}
export class Frame extends Op{
    [immerable] = true;
    setAutoFreeze = false;
    constructor(public locals:parserTypes.localsVal[], public module:types.WebAssemblyMtsModule, public currentFunc: number){
        super(Opcode.Frame, []);
    }
}

export class WasmFuncType {
    [immerable] = true;
    setAutoFreeze = false;
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
    toString():string {
        return `(${this.parameters.join(",")}) => ${this.returns.join(",")}`;
    }
    
}

export function instantiateParams(parameters:WasmType[]):parserTypes.localsVal[] {
    const params:parserTypes.localsVal[] = [];
    for(let i=0; i < parameters.length; i++) {
        switch(parameters[i]) {
            case "i32": params[i] = {value:0, type:0x7F}; break;
            case "i64": params[i] = {value:0n, type:0x7E}; break;
            case "f32": params[i] = {value:0, type:0x7D}; break;
            case "f64": params[i] = {value:0, type:0x7C}; break;
            case "funcref": params[i] = {value:0, type:0x70}; break;
            case "externref": params[i] = {value:0, type:0x6f}; break;
            case "vectype": params[i] = {value:0, type:0x7B}; break;
            default: throw new Error("Invalid return type");
        }
    }
    return params;
}
export function instantiateLocals(locals:parserTypes.valType[]){
    let instantiatedLocals:parserTypes.localsVal[] = [];
    for(let i=0; i < locals.length; i++) {
        instantiatedLocals.push({value:0, type:locals[i]});
    }
    return instantiatedLocals;
}


export class WebAssemblyMtsStore implements types.Store {
    [immerable] = true;
    setAutoFreeze = false;
    public stack: Op[];
    constructor(public funcs: types.FuncInst[]=[], public tables: types.TableInst[]=[], public mems: types.MemInst[]=[], 
        public globals: types.GlobalInst[]=[], public elems: types.ElemInst[]=[], public exports: types.ExportInst[]=[]) {
        this.stack = [];
    }
    takeMem(): types.MemInst{
        const frame = lookForFrame(this.stack);
        memCheck(frame!);
        const addr = frame!.module.mems[0].val;
        return this.mems[addr];
    }
    executeOp(op: Op | IfElseOp, currLabel:Label):void | Op[] | Label {
        const len = this.stack.length;
        switch(op.id){
            // Control instructions
            case Opcode.Unreachable:{
                //@TODO add error specs
                throw new Error(`Unreachable.`);
            }
            case Opcode.Nop:{
                break;
            }
            case Opcode.Block:{
                // a br will branch at the end of it
                const frame = lookForFrame(this.stack);
                const moduleTypes = frame!.module.types;
                const labelRes = execute.executeBlock(op as BlockOp, moduleTypes, this.stack)!;
                labelRes.isblock = true;
                this.stack.push(labelRes);
                break;
            }
            case Opcode.Loop:{
                // debugger;
                // a br will branch at the start of it
                const frame = lookForFrame(this.stack);
                const moduleTypes = frame!.module.types;
                const labelRes = execute.executeBlock(op as BlockOp, moduleTypes, this.stack)!;
                this.stack.push(labelRes);
                break;
            }
            case Opcode.If:{ // else is handled inside
                const frame = lookForFrame(this.stack);
                const moduleTypes = frame!.module.types;
                // passing the boolean (constant numtype), the ifop (containing the block), the store and the module types reference
                const labelRes:Label | undefined = execute.ifinstr(this.stack.pop()!, op as IfElseOp, moduleTypes, this.stack);
                if(labelRes == undefined) break;
                this.stack.push(labelRes);
                break;
            }
            case Opcode.End:{
                break;
            }
            case Opcode.Br:{
                currLabel = execute.br(this.stack, op.args as number);
                return currLabel;
            }
            case Opcode.BrIf:{
                const loopLabel = execute.br_if(this.stack.pop()!, this.stack, op.args as number);
                if (loopLabel != undefined) return loopLabel;
            }
            case Opcode.BrTable:{

               break; 
            }
            case Opcode.Return:{
                //Find the current Frame
                const frame = lookForFrame(this.stack);
                if(frame! == undefined) throw new Error("No frame on stack found");
                // console.log("locals before return",current(frame.locals))
                //get the number of return values
                let funcTypeAddr = frame.module.funcs[frame.currentFunc];
                const type = frame.module.types[funcTypeAddr.val];
                const returnArity = type.returns.length;
  
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
                // assert(this.stack[this.stack.length-1] instanceof Frame, "No frame found")
                //pop the frame
                this.stack.pop();
                // console.log("res", results)
                this.stack.push(...results);
                // console.log("stack", current(this.stack))
                break;
            }
            case Opcode.Call:{
                const frame = lookForFrame(this.stack);
                if(frame?.module.funcs[op.args as number] == undefined) throw new Error(`Function (typeidx ${op.args} doesn't exists.`);
                
                let funcidx: number;
                funcidx = op.args as number;

                const funcInstance = this.funcs[funcidx];
                execute.funcCall(funcInstance, funcidx, this);
                break;
            }
            case Opcode.CallIndirect:{
                const frame = lookForFrame(this.stack);                
                // in the current specs AT MOST 1 table can be defined, so the table will always be tableinst[0]
                
                let tableidx:number, typeidx: number;
                console.log("args:",op.args);
                [typeidx, tableidx] = op.args as number[];
                console.log("stack currently",this.stack);
                const table = this.tables[0];
                if(table == undefined) throw new Error (`No table found at tableidx '${tableidx}'`);
                const tableAddr = this.stack.pop()!;
                if(tableAddr.id != Opcode.I32Const) throw new Error (`Invalid table address, expected I32Const, got ${tableAddr.kind}`) 
                const funcidx = table.elem[tableAddr.args as number];
                const funcInstance = this.funcs[funcidx];

                execute.funcCall(funcInstance, funcidx, this);
                break;
            }
            // Reference Instructions
            case Opcode.RefNull: {
                this.stack.push(op); // pushing self null op and his argument
                break;
            }
            case Opcode.RefIsNull: {
                const val = this.stack.pop();
                if(val?.id != Opcode.RefNull && val?.id != Opcode.RefFunc){
                    throw new Error(`No reference value on top of the stack, instead got '${val?.kind}'.`);
                }
                if(val?.id == Opcode.RefNull){
                    this.stack.push(new Op(Opcode.I32Const, 1));
                }else{
                    this.stack.push(new Op(Opcode.I32Const, 0)); 
                }
                break;
            }
            case Opcode.RefFunc: {
                const funcidx = op.args as number;
                if(this.funcs[funcidx] == undefined) throw new Error (`Undefined function (funcidx '${funcidx}').`);
                this.stack.push(op);
                break;
            }
            // Vector Instructions
            //@TODO
            // consts
            case Opcode.I32Const:
            case Opcode.I64Const:
            case Opcode.F32Const:
            case Opcode.F64Const:{
                this.stack.push(new Op(op.id, op.args, op.indexNum));
                break;
            }
            // math
            case Opcode.i32add:{
                // console.log("params are: ",currLabel.parameters);
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
            //clz
                //clzinstr
            //popcnt
            case Opcode.i32popcnt:{
                // execute.i32popcnt()
            }
            case Opcode.i64popcnt:{

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
                // console.log(this.stack[this.stack.length-1]);
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
            //

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
    setAutoFreeze = false;

    static async compile(bytes:Uint8Array, importObject:Object | undefined): Promise<[types.WebAssemblyMtsModule, object]> {
        console.log("Compiling...");
        //call parser on the bytes
        let [moduleTree, length] = parseModule(bytes);

        // assert(length == bytes.byteLength, "Module byte length error.");

        //trying to create a new store at every compile
        WebAssemblyMts.store = new WebAssemblyMtsStore();
        // if(WebAssemblyMts.store == undefined) WebAssemblyMts.store = new WebAssemblyMtsStore();
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
        // custom section content will be returned raw from compile()
        let customSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WACustom)?.content;

        let typesSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAType)
        let importSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAImport)
        let functionSignatures = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAFunction)
        let codeSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WACode)
        let tableSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WATable)
        let memorySection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAMemory)
        let globalSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAGlobal)
        let elemSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAElement)
        let dataSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAData)
        let exportSection = moduleTree.sections.find(sec => sec.id == parserTypes.WASMSectionID.WAExport)
        // Types
        for(let type of typesSection!.content) {
            mtsModule.types.push(new WasmFuncType(type));
        }

        // FuncInst
            // imported ones:
        let imports = [];
        if(importSection != undefined){
            imports = importSection?.content;
            // for now imports will be handled as single raw functions passed on instantiate
            for (let i = 0; i < imports.length; i++) {
                //@ts-ignore
                // const currFunc = importObject.imports[imports[i].name[1]];
                let func:types.FuncInst= {
                    type: mtsModule.types[imports[i].description],
                    module: mtsModule,
                    code: {locals:[], body:[new Op(Opcode.End, [])]} // !!PLACEHOLDER!!
                }
                WebAssemblyMts.store.funcs.push(func);
                mtsModule.funcs.push(
                    {kind: "funcaddr", val: imports[i].description}
                )
            }
        }
        
            // declared ones:
        const funcTypeSignatures = functionSignatures?.content;
        const codes = codeSection?.content;
        // the loop will resume from the next index after the last import object
        let currentFunctionIndex = 0; // separate iterator variable
        for (let i = imports.length; i < codes.length; i++) {

            const currTypeSignature = funcTypeSignatures[currentFunctionIndex];
            const currCodeContent = codes[currentFunctionIndex].content;

            let func:types.FuncInst= {
                type: mtsModule.types[currTypeSignature],
                module: mtsModule,
                code: currCodeContent // locals and body
            }
            WebAssemblyMts.store.funcs.push(func);
            mtsModule.funcs.push(
                {kind: "funcaddr", val: funcTypeSignatures[currentFunctionIndex]}
            )
            currentFunctionIndex++;
        }
        // ElemInst
        for(let index in elemSection?.content) {
            const currElem = elemSection?.content[index];
            let tableID:number = 0;
            if(currElem.activemode != undefined) tableID = currElem.activemode.table as number;

            let elem:types.ElemInst= {
                type: currElem.type,
                data: currElem.init,
                table: tableID
            }
            // console.log("elem", index, elem)
            let length = WebAssemblyMts.store.elems.push(elem)
            mtsModule.elems.push(
                {kind: "elemaddr", val: length-1}
            )
        }
        // TableInst
        
        // for(let index in tableSection?.content) {}
            // const currTable = tableSection?.content[index];
            const currTable = tableSection?.content[0];

            //evaluating limits
            const limFlag = currTable.lim.flag as number;
            const tableSize = limFlag ? currTable.max as number : currTable.min as number;
            //filling arrays of funcrefs
            const tableElems = new Array(tableSize);
            const elemInstances = this.store.elems;
            let j = 0;
            for (let i = 0; i < elemInstances.length; i++) {
                if(elemInstances[i].table == 0){ // for now just elems in tables[0] will be initialized
                    elemInstances[i].data.forEach(ref => {
                        tableElems[j] = ref;
                        j++;
                    });
                }
            }
            let table:types.TableInst= {
                type: currTable.et,
                elem: tableElems
            }
            let len = WebAssemblyMts.store.tables.push(table);
            mtsModule.tables.push(
                {kind: "tableaddr", val: len-1}
            )
            console.log(this.store.tables)

        // MemInst
        for(let index in memorySection?.content) {
            
            const vecLength = 65536 * memorySection?.content[index].min;
            // > 127 into a cell of an UInt8arry then it will be read back as a negative number
            // javascript numbers are 64 floating points numbers
            // negative floating point numbers will all the left most bits to 1. 
            // 1110 + 1 = 0000
            // const data = new Uint8Array(vecLength);

            // initializing memory as a placeholder to deep copy it
            let mem:types.MemInst= {
                type: memorySection?.content[index],
                data: {},
                length: vecLength
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

        // ExportInst
        for(let index in exportSection?.content) {
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
        console.log("exiting.");
        return [mtsModule, customSection];
        //returned module is basically the parse tree
        //compile does not run the code at all
        //will add values to the global store
        //will return references/basically the index in the store for each object in the module.
    }
    static async instantiate(moduleMts: types.WebAssemblyMtsModule, importObject?: object): Promise<types.WebAssemblyMtsInstance>;
    static async instantiate(bytes:Uint8Array, importObject?: object): Promise<types.WebAssemblyMtsInstantiatedSource>;

    static async instantiate(moduleOrBytes: unknown, importObject?: object): Promise<types.WebAssemblyMtsInstantiatedSource | types.WebAssemblyMtsInstance> {
        
        if(moduleOrBytes instanceof Uint8Array) {
            const [wmodule, custom]  = await this.compile(moduleOrBytes, importObject);
            const instance:types.WebAssemblyMtsInstance = {exports: {}, exportsTT: {}, object: undefined, custom};
            const instantiatedSource: types.WebAssemblyMtsInstantiatedSource = {module: wmodule, instance};
            //import object is how many page of memory there are
            //@TODO Handle importObject
            
            createExports(wmodule.exports, instantiatedSource);
            return instantiatedSource;

        }else if(isWebAssemblyModule(moduleOrBytes)) {  
            // @TODO implement importobject  
            const instantiatedSource: types.WebAssemblyMtsInstantiatedSource =
            {module: moduleOrBytes, instance:{exports: {}, exportsTT: {}, object: undefined, custom: {}}};
            moduleOrBytes.exports.forEach(exp => {
                
                if(exp.value.kind == "funcaddr"){
                    instantiatedSource.instance.exports[exp.valName] = (...args: any) => {
                        return WebAssemblyMts.run(exp, ...args);
                    }
                    // time travel
                    instantiatedSource.instance.exportsTT[exp.valName] = (...args: any) => {
                        return WebAssemblyMts.runTT(exp, ...args);
                    }
                }else if(exp.value.kind == "memaddr"){
                    // imported memory
                }else if(exp.value.kind == "globaladdr"){
                    // imported globals
                }else if(exp.value.kind == "tableaddr"){
                    // imported tables
                }
            })
            return instantiatedSource;
        }
        throw new Error("Bad input data");
    }

    static run(func:types.ExportInst, ...args: unknown[]):any;
    static run(func:types.FuncAddr, ...args: unknown[]):any;

    static run(func:unknown, ...args: unknown[]){
        args = args.flat(1);
        let funcInstance:types.FuncInst;
        let funcidx: number;
        let label:Label, frame:Frame;
        if(isExportInst(func)){
            funcidx = func.value.val;
            funcInstance = this.store.funcs[funcidx];
        }else if(isFuncAddr(func)){
            funcidx = func.val;
            funcInstance = this.store.funcs[funcidx];
        }else{
            throw new Error("Bad function reference.")
        }
        // initializing memory
        initializeMemory(this.store);
        // label (arity and code)
        label = new Label(funcInstance!.type.returns.length, funcInstance!.code.body, funcInstance!.type);
        // activation frame (locals and module)
        const params:parserTypes.localsVal[] = instantiateParams(funcInstance!.type.parameters);
        const locals:parserTypes.localsVal[] = instantiateLocals(funcInstance!.code.locals);
        const allLocals:parserTypes.localsVal[] = params.concat(locals);
        frame = new Frame(allLocals, funcInstance!.module, funcidx!);
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
            let currLabel = lookForLabel(this.store.stack)!;
            // console.log("stack after label",this.store.stack);

            if(currLabel.instrIndex < currLabel.instr.length){
                // console.log("instrindex",currLabel.instrIndex);
                // console.log("Instruction:",currLabel.instr[currLabel.instrIndex].kind, currLabel.instr[currLabel.instrIndex].args)
                const res = this.store.executeOp(currLabel.instr[currLabel.instrIndex], currLabel);
                if (res instanceof Label){ // changing label pointer mainly for br/brif
                    currLabel = res;
                } 
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
        args = args.flat(1);
        let funcInstance:types.FuncInst;
        let funcidx: number;
        let label:Label, frame:Frame;
        if(isExportInst(func)){
            funcidx = func.value.val;
            funcInstance = this.store.funcs[funcidx];
        }else if(isFuncAddr(func)){
            funcidx = func.val;
            funcInstance = this.store.funcs[funcidx];
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
        // deep copying the store
        let setupStore = (store: WebAssemblyMtsStore) => {
            let result = structuredClone(store);
            Object.setPrototypeOf(result, Object.getPrototypeOf(store));
            result[immerable] = true;
            // console.log("store clone",result)
            return result;
        }

        const produced = produceWithPatches(setupStore(this.store), (state)=>{
            // initializing memory
            initializeMemory(this.store);
            // label
            label = new Label(funcInstance!.type.returns.length, funcInstance!.code.body, funcInstance!.type);
            // activation frame (locals and module)
            const params:parserTypes.localsVal[] = instantiateParams(funcInstance!.type.parameters);
            const locals:parserTypes.localsVal[] = instantiateLocals(funcInstance!.code.locals);
            const allLocals:parserTypes.localsVal[] = params.concat(locals);
            frame = new Frame(allLocals, funcInstance!.module, funcidx!);
            state.stack.push(frame);
            state.stack.push(label);
            // debugger;
            execute.processParams(parametersArity, funcInstance!.type.parameters, args, frame.locals);
            return state;
        })
        stores.states.push(produced[0]);
        //@ts-ignore
        stores.patches.push(produced[1]);
        stores.previousPatches.push(produced[2]);
        // console.log("stores",JSON.stringify(stores.patches, null, 2));
        // label (arity and code)
        return this.executeInstructionsTT(returnsArity, stores);
    }

    static executeInstructionsTT(returnsArity:number, stores:types.storeProducePatches): { stores: types.storeProducePatches, val: Op | Op[]} {
        let currStore = stores.states[stores.states.length-1];
        // console.log("curr",lookForLabel(currStore.stack))
        // console.log("store:",currStore)
        try {
        while(lookForLabel(currStore.stack) != undefined) {
            // debugger;
            // console.log("stack after label",this.store.stack);
            const produced = produceWithPatches(currStore, (state)=>{
                let currLabel = lookForLabel(state.stack)!;
                if(currLabel.instrIndex < currLabel.instr.length){
                    // console.log("instrindex",currLabel.instrIndex, "len", currLabel.instr.length);
                    // console.log("Instruction:",currLabel.instr[currLabel.instrIndex].kind)
                    // console.log("curr op",currLabel.instr[currLabel.instrIndex].kind, "args", currLabel.instr[currLabel.instrIndex].args)
                    const res = state.executeOp(currLabel.instr[currLabel.instrIndex], currLabel);
                    if (res instanceof Label){ // changing label pointer mainly for br/brif
                        currLabel = res;
                    }
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
            //@ts-ignore
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
export function lookForFrameNoError(stack:Op[]){
    let frame: Frame;
    for (let i = stack.length; i >= 0; i--) {
        if(stack[i] instanceof Frame) {
            frame = stack[i] as Frame;
            return frame;
        }
    }
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

/**Extremely important function that permits to create an immerable fake array.*/

export type MaskedArrayObject = Map<string | symbol | number, number> & {[key: string]: number}
export function createMemProxy(): MaskedArrayObject{ 
    let wrappedBackingMap = {
        backingMap: new Map()
    }
    // @ts-ignore
    return new Proxy(wrappedBackingMap, {
        get(target, property, receiver) {
            if(property == "forEach") {
                return <T, K>(cbFunction: (value: T, key: K, map: Map<K, T>) => void) => {
                    (target.backingMap as Map<K, T>).forEach(cbFunction);
                }
            }
            if(property == 'set') return Map.prototype.set;

            return target.backingMap.get(property);
        },
        set(target, property, value) {
            let singleValue = new Uint8Array(1);
            singleValue[0]= value;
            return target.backingMap.set(property, singleValue[0]) != undefined;
        }
    });
}
function initializeMemory(store:WebAssemblyMtsStore) {
    store.mems.forEach(mem => {
        const data = createMemProxy();
        mem.data = data;
    });
    // console.log("initialized mems",store.mems);
}
export default WebAssemblyMts;
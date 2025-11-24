// Nand2TetrisLoader.ts

// AI Acknowledgement -  AI was used in the development of this file for REGEX, commenting/documentation, helper functions, and sytax fixes. 

// Core ideas:
//  -   See if 1) subcircuit loaded, 2) subcircuit in wdir, 3) willow primitive
//  -   if subcircuit not in resolved subcircuit list: search for HDL in wdir and recursivly resolve
//  - A small "createElement" map is the single source of truth for primitives (Willow-native elements).
//  - Known chips may need stable pin orders (e.g. ALU); otherwise we fall back to a simple heuristic.


import fs from "fs";
import path from "path";


import { CircuitLoader } from "../CircuitLoader";
import { CircuitProject } from "../CircuitProject";
import { Circuit } from "../Circuit";
import { CircuitElement } from "../CircuitElement";
import { SubCircuit } from "../CircuitElement/SubCircuit";
import { Input } from "../CircuitElement/Input";
import { Output } from "../CircuitElement/Output";
import { CircuitBus } from "../CircuitBus";
import { CircuitLoggable, LogLevel } from "../CircuitLogger";
import { FileUtil } from "../Util/File";
import Stream from "stream";

// ===== Willow primitive elements (ADD HERE as Willow gains new elements) =====
import {Add16} from "../CircuitElement/Add16"
import {Adder} from "../CircuitElement/Adder"
import {And16} from "../CircuitElement/And16"
import {AndGate} from "../CircuitElement/AndGate"
import {Bit} from "../CircuitElement/Bit"
// import {BitSelector} from "../CircuitElement/BitSelector"
// import {BufferGate} from "../CircuitElement/BufferGate"
// import {CircuitVerseALU} from "../CircuitElement/CircuitVerseALU"
// import {CircuitVerseRAM} from "../CircuitElement/CircuitVerseRAM"
// import {Clock} from "../CircuitElement/Clock"
// import {Constant} from "../CircuitElement/Constant"
// import {ControlledInverter} from "../CircuitElement/ControlledInverter"
// import {Counter} from "../CircuitElement/Counter"
import {DFlipFlop} from "../CircuitElement/DFlipFlop"
// import {DLatch} from "../CircuitElement/DLatch"
import {DMux4Way} from "../CircuitElement/DMux4Way"
import {DMux8Way} from "../CircuitElement/DMux8Way"
// import {Decoder} from "../CircuitElement/Decoder"
import {Demultiplexer} from "../CircuitElement/Demultiplexer"
import {Extend} from "../CircuitElement/Extend"
import {FullAdder} from "../CircuitElement/FullAdder"
// import {Gate} from "../CircuitElement/Gate"
// import {Ground} from "../CircuitElement/Ground"
import {HalfAdder} from "../CircuitElement/HalfAdder"
import {Inc16} from "../CircuitElement/Inc16"
// import {JKFlipFlop} from "../CircuitElement/JKFlipFlop"
// import {JLSRAM} from "../CircuitElement/JLSRAM"
// import {JLSRegister} from "../CircuitElement/JLSRegister"
// import {LSB} from "../CircuitElement/LSB"
// import {MSB} from "../CircuitElement/MSB"
// import {Memory} from "../CircuitElement/Memory"
import {Multiplexer} from "../CircuitElement/Multiplexer"
import {Mux16} from "../CircuitElement/Mux16"
import {Mux4Way16} from "../CircuitElement/Mux4Way16"
import {Mux8Way16} from "../CircuitElement/Mux8Way16"
// import {Nand2TetrisALU} from "../CircuitElement/Nand2TetrisALU"
import {NandGate} from "../CircuitElement/NandGate"
// import {NorGate} from "../CircuitElement/NorGate"
import {Not16} from "../CircuitElement/Not16"
import {NotGate} from "../CircuitElement/NotGate"
import {Or16} from "../CircuitElement/Or16"
import {Or8Way} from "../CircuitElement/Or8Way"
import {OrGate} from "../CircuitElement/OrGate"
// import {Power} from "../CircuitElement/Power"
// import {PriorityEncoder} from "../CircuitElement/PriorityEncoder"
// import {ROM} from "../CircuitElement/ROM"
// import {Random} from "../CircuitElement/Random"
// import {SRFlipFlop} from "../CircuitElement/SRFlipFlop"
// import {SequentialElement} from "../CircuitElement/SequentialElement"
// import {Splitter} from "../CircuitElement/Splitter"
// import {Stop} from "../CircuitElement/Stop"
// import {TFlipFlop} from "../CircuitElement/TFlipFlop"
// import {TriState} from "../CircuitElement/TriState"
// import {TwosCompliment} from "../CircuitElement/TwosCompliment"
// import {XnorGate} from "../CircuitElement/XnorGate"
import {XorGate} from "../CircuitElement/XorGate"

// ===== HDL parser =====
// Expected shape: parseHDL(text) → { name, inputs, outputs, builtin?, parts? }
// parts = [{ type: string, args: Record<string,string> }, ...]
import { parseHDL } from "./hdl/parseHDL"; // adjust path to your HDL parser
import { warn } from "console";
//HDL busslices (analogous to splitter, but used internally)
import { BitSliceElement } from "../CircuitElement/BitSliceElement";
import { RangeSliceElement } from "../CircuitElement/RangeSliceElement";
import { BitMergeElement } from "../CircuitElement/BitMergeElement";
import { RangeMergeElement } from "../CircuitElement/RangeMergeElement";

// -------------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------------

type ElementMaker = (
    ins: CircuitBus[],
    outs: CircuitBus[],
    extra?: Record<string, string>
) => CircuitElement;

type HDLPort = { name: string; width: number };
type HDLPart = { type: string; args: Record<string, string> };

type ParsedHDL = {
    name: string;
    inputs: HDLPort[];
    outputs: HDLPort[];
    builtin?: string | null;
    parts?: HDLPart[];
};

// -------------------------------------------------------------------------------------
// Name normalization helpers
// -------------------------------------------------------------------------------------

/**
 * normalize a chip/element name to a key suitable for lookups
 * - strips non-word chars and lowercases
 * - makes "And", "AND", "and" resolve the same
 */
function normName(s: string): string {
      return s.replace(/\W+/g, "").toLowerCase();
}

// -------------------------------------------------------------------------------------
// Primitive element registry (SINGLE SOURCE OF TRUTH for Willow-native chips)
// -------------------------------------------------------------------------------------

/**
 * Map from ChipName → function that constructs the Willow element from positional buses.
 * IMPORTANT: Keys are human names ("And", "Or", "Not" ...). We will look them up by a normalized version.
 *
 * ADD HERE when Willow adds new primitives:
 *  - import the new class at the top
 *  - add an entry here with the correct constructor signature
 */
const createElement: Record<string, ElementMaker> = {
    And: (i, o) => new AndGate(i, o),
    And16: (i, o) => new And16(i, o),
    Nand: (i, o) => new NandGate(i, o),
    Not: (i, o) => new NotGate(i, o),
    Not16: (i, o) => new Not16(i, o),
    Or16: (i, o) => new Or16(i, o),
    Or: (i, o) => new OrGate(i, o),
    //Or8Way: (i, o) => new Or8Way(i, o), //Input takes in CircuitBus not CircuitBus[]????
    Xor: (i, o) => new XorGate(i, o),
  

    // Inc16: (i, o) => new Inc16(i, o),

    // Multi input circuit elements 
    Add16: (i, o) => new Add16(
        i[0],   //a
        i[1],   //b
        o[0]    //out
    ),
    Bit: (i, o) => new Bit(
        i[0],   //in 
        i[1],   //load
        o[0]    //out
    ),
    DFF: (i, o) => new DFlipFlop(     
            i[0], // clock
            i[1], // d
            i[2], // reset
            i[3], // preset
            i[4], // enable
            o[0], // q
            o[1], // qInv
        ),
    DMux: (i, o) => new Demultiplexer(
            [i[0]], // in
            o,      // [a, b]
            i[1],   // sel
        ),
    DMux4Way: (i, o) => new DMux4Way(
            i[0], // in
            o[0], // a
            o[1], // b
            o[2], // c
            o[3], // d
            i[1], // sel

    ),
    DMux8Way: (i, o) => new DMux8Way(
        i[0], // in
        o[0], // a
        o[1], // b
        o[2], // c
        o[3], // d
        o[4], // e
        o[5], // f
        o[6], // g
        o[7], // h
        i[1], // sel
    ),
    FullAdder: (i, o) => new FullAdder(
        i[0], 
        i[1], 
        i[2], 
        o[0], 
        o[1]
    ),
    HalfAdder: (i, o) => new HalfAdder(
        i[0], 
        i[1], 
        o[0], 
        o[1]
    ),
    Mux: (i, o) => new Multiplexer(
        [i[0], i[1]],   // data inputs: a, b
        o,              // ["out"]
        i[2],           // sel
    ),
    Mux16: (i, o) => new Mux16(
        i[0], // a
        i[1], // b
        o[0], // out
        i[2], // sel
    ),
    Mux4Way16: (i, o) => new Mux4Way16(
        i[0], // a
        i[1], // b
        i[2], // c
        i[3], // d
        o[0], // out
        i[4], // sel
    ),
    Mux8Way16: (i, o) => new Mux8Way16(
        i[0], // a
        i[1], // b
        i[2], // c
        i[3], // d
        i[4], // e
        i[5], // f
        i[6], // g
        i[7], // h
        o[0], // out
        i[8], // sel
    ),
  
    // DRegister: () => new DRegister(), //not yet supported by Willow
    // Keyboard: () => new Keyboard(), //not yet supported  by Willow
    // PC: () => new PC(), not yet supported by Willow
    // RAM16K: () => new RAM16K(), not yet supported by Willow
    // RAM4K: () => new RAM4K(), not yet supported by Willow
    // RAM512: () => new RAM512(), not yet supported by Willow
    // RAM64: () => new RAM64(), not yet supported by Willow
    // RAM8: () => new RAM8(), not yet supported by Willow
    // ROM32K: () => new ROM32K(), not yet supported by Willow
    // Register: () => new Register(), not yet supported by Willow
    // Screen: () => new Screen(),
};

// Build a normalized lookup map once.
const createElementByNorm = new Map<string, ElementMaker>(
    Object.entries(createElement).map(([k, v]) => [normName(k), v])
);

// -------------------------------------------------------------------------------------
// Pin order policy
// -------------------------------------------------------------------------------------

/**
 * Some chips have canonical pin orders that are *not* obvious by sorting names.
 * You can encode those here. This affects how we pass positional ins/outs to primitives.
 *
 * ADD HERE when you need canonical pin orders for a chip (e.g., Mux, DMux, ALU).
 */
const PIN_ORDERS: Record<string, { inPins: string[]; outPins: string[] }> = {
  
    // Arithmetic
    HalfAdder:  { inPins: ["a", "b"],           outPins: ["sum", "carry"] },
    FullAdder:  { inPins: ["a", "b", "c"],      outPins: ["sum", "carry"] },
    Add16:      { inPins: ["a", "b"],           outPins: ["out"] },

    // Storage / sequential
    Bit:        { inPins: ["in", "load"],       outPins: ["out"] },
    DFF:        { inPins: ["clock", "d", "reset", "preset", "enable"], outPins: ["q", "qInv"] },

    // Multiplexers / demultiplexers
    Mux:        { inPins: ["a", "b", "sel"],    outPins: ["out"] },
    Mux16:      { inPins: ["a", "b", "sel"],    outPins: ["out"] },
    Mux4Way16:  { inPins: ["a", "b", "c", "d", "sel"],                         outPins: ["out"] },
    Mux8Way16:  { inPins: ["a", "b", "c", "d", "e", "f", "g", "h", "sel"],     outPins: ["out"] },

    DMux:       { inPins: ["in", "sel"],        outPins: ["a", "b"] },
    DMux4Way:   { inPins: ["in", "sel"],        outPins: ["a", "b", "c", "d"] },
    DMux8Way:   { inPins: ["in", "sel"],        outPins: ["a", "b", "c", "d", "e", "f", "g", "h"] },

};

/**
 * Choose pin order for a part instance.
 * - If we have a canonical order, use it.
 * - Else, heuristic: inputs = all pins not starting with "out", outputs = the ones that do.
 * - Maintain a stable order by the keys as given (or sort if desired).
 */
function choosePinOrder(
    type: string,
    args: Record<string, string>,
): { inPins: string[]; outPins: string[] } {
    if (PIN_ORDERS[type]) return PIN_ORDERS[type];

    const keys = Object.keys(args);
    let inPins = keys.filter((k) => !/^out/i.test(k));
    let outPins = keys.filter((k) => /^out/i.test(k));
    if (!outPins.length && args["out"] != null) outPins = ["out"];
    return { inPins, outPins };
}

// -------------------------------------------------------------------------------------
// Bus utilities
// -------------------------------------------------------------------------------------

/**
 * Ensure we have a named bus in the local table with the given width.
 * If it exists with a different width, you can enforce/expand/throw as your design dictates.
 */
function ensureBus(
    table: Record<string, CircuitBus>,
    name: string,
    width: number,
): CircuitBus {
    let b = table[name];
    if (!b) {
        b = new CircuitBus(width);
        table[name] = b;
        console.log(`[N2TLoader][ensureBus] Created bus '${name}' with width=${width}`);

    } else if (b.getWidth() !== width){
        console.warn(
        `[N2TLoader][ensureBus] Bus '${name}' already exists with width=${b.getWidth()} ` +
        `but was requested with width=${width}; using existing bus.`,
        );  
    }
    
    // Optional: reconcile widths if mismatched (throw, widen, or assert). For now, accept first-come width.
    return b;
}


// -------------------------------------------------------------------------------------
// Nand2TetrisLoader
// -------------------------------------------------------------------------------------

/**
 * Optional callback that lets the loader fetch child HDL by name.
 * Return a readable Stream for the child HDL, or null if not found.
 * This is how we lazily load subcircuits referenced by PARTS.
 */
export type ChildResolver = (chipName: string) => Promise<Stream | null>;

//POD types for "splitter esq bus-element"
type BitSliceSpec = {
    baseName: string; //sel
    bitIndex: number; // 3
    sliceName: string; //sel[3]
};
type RangeSliceSpec = {
    baseName: string; //foo
    lo: number; //2
    hi: number;  //7
    rangeName: string; //foo[2..7]
};

/**
 * Nand2TetrisLoader
 * - Unifies BUILTIN and PARTS resolution:
 *     Try Willow primitive → else treat as a SubCircuit (load if needed via resolver).
 * - Adds cycle detection to avoid infinite recursion.
 * - Builds a new Circuit for each .hdl file, and stores it in the provided CircuitProject.
 */
export class Nand2TetrisLoader extends CircuitLoader implements CircuitLoggable {
    private readonly workingDir: string;
    private loadingStack = new Set<string>(); // cycle guard
    private bitSlices: BitSliceSpec[] = [];
    private rangeSlices: RangeSliceSpec[] = [];
    private bitMerges: BitSliceSpec[] = [];
    private rangeMerges: RangeSliceSpec[] = [];

  
    constructor(workingDir:string = process.cwd()){
        super();
        this.workingDir = workingDir;
    }

  

    /**
     * Public entry: loads a single HDL stream into a fresh CircuitProject.
     */
    async load(stream: Stream): Promise<CircuitProject> {
        const project = new CircuitProject();
        this.propagateLoggersTo(project);
        await this.loadIntoProject(project, stream);
        return project;
    }

    /**
     * Internal: load an HDL stream into an existing project (enables recursive subcircuit loads).
     */
    private async loadIntoProject(project: CircuitProject, stream: Stream): Promise<void> {
        const text = await FileUtil.readTextStream(stream);
        const hdl = parseHDL(text) as ParsedHDL;

        // Prevent cycles: if we're already loading this chip name, it's a dependency loop.
        if (this.loadingStack.has(hdl.name)) {
            this.log(LogLevel.ERROR, `Cyclic dependency detected involving '${hdl.name}'.`);
            return;
        }

        this.loadingStack.add(hdl.name);
        try {
            const { elements } = await this.buildCircuitElements(project, hdl);
            const circuit = new Circuit(hdl.name, hdl.name, elements);
            project.addCircuit(circuit);
            this.log(LogLevel.INFO, `Loaded '${hdl.name}' with ${elements.length} elements.`);
        } finally {
            this.loadingStack.delete(hdl.name);
        }
    }

/**
 * Build all elements for a single HDL chip:
 *  - Creates top-level Input/Output shells.
 *  - If BUILTIN is declared, attempts to implement the entire chip as a single
 *    instance (subcircuit or primitive) using the same resolution rules as PARTS.
 *    If that succeeds, PARTS are ignored (with a warning).
 *  - If BUILTIN is absent or cannot be resolved, PARTS are instantiated one by one
 *    using the same subcircuit-first, primitive-second logic.
 */
    private async buildCircuitElements(
        project: CircuitProject,
        hdl: ParsedHDL,
    ): Promise<{ elements: CircuitElement[] }> {
        const busses: Record<string, CircuitBus> = {};
        const elements: CircuitElement[] = [];
        this.bitSlices = [];
        this.rangeSlices = [];
        this.bitMerges = [];
        this.rangeMerges = [];


        const hasBuiltin = !!hdl.builtin && hdl.builtin.trim().length > 0;
        const hasParts = !!hdl.parts && hdl.parts.length > 0;

        console.log(
            `[N2TLoader] buildCircuitElements('${hdl.name}'): ` +
            `inputs=${hdl.inputs.length}, outputs=${hdl.outputs.length}, ` +
            `builtin=${hasBuiltin ? hdl.builtin!.trim() : "none"}, ` +
            `parts=${hasParts ? hdl.parts!.length : 0}`,
         );
         
        if(hasBuiltin && hasParts){
            throw new Error(
                `HDL chip '${hdl.name}' declares both BUILTIN and PARTS;` + 
                `BUILTIN and PARTS are mutually exclusive. BUILTINS should map to primitives`
            );
        }

        // 1) Create IO shells: Inputs drive an internal bus; Outputs read from an internal bus.
        hdl.inputs.forEach((p, index) => {
            const internal = ensureBus(busses, p.name, p.width);
            console.log(
                `[N2TLoader]   Input shell '${p.name}' (declared width=${p.width}) ` +
                `-> bus width=${internal.getWidth()}`,
            );
            const inputEl = new Input(index, p.name, [internal]);
            elements.push(inputEl);
        });

        hdl.outputs.forEach((p, index) => {
            const internal = ensureBus(busses, p.name, p.width);
            console.log(
                `[N2TLoader]   Output shell '${p.name}' (declared width=${p.width}) ` +
                `-> bus width=${internal.getWidth()}`,
            );
            const outputEl = new Output(index, p.name, internal);
            elements.push(outputEl);
        });

        //2) BUILTIN must map directly to Willow Primitive
        if (hasBuiltin){
            const builtinName = hdl.builtin!.trim();
            console.log(
                `[N2TLoader]   Using BUILTIN '${builtinName}' for chip '${hdl.name}'.`,
            );
            const maker = this.getPrimitiveMaker(builtinName);

            if (!maker){
                throw new Error(
                    `HDL chip '${hdl.name}' declares BUITLIN '${builtinName}', ` + 
                    `but there is no corresponding Willow primitive mapping.`,
                );
            }

            const ins: CircuitBus[] = hdl.inputs.map((p)=> ensureBus (busses, p.name, p.width));
            const outs: CircuitBus[] = hdl.outputs.map((p) => ensureBus(busses, p.name, p.width));
            console.log( `[N2TLoader]   BUILTIN IO widths: ins=[${ins.map((b) => b.getWidth()).join(",")}], outs=[${outs.map((b) => b.getWidth()).join(",")}]`,);
           
            // DEBUG: show what drives each top-level output
            for (const outDecl of hdl.outputs) {
                const bus = busses[outDecl.name];
                if (!bus) {
                    this.log(LogLevel.WARN, `[DEBUG] No bus allocated for output '${outDecl.name}' in chip '${hdl.name}'`);
                    continue;
                }
                this.log(
                LogLevel.DEBUG,
                    `[DEBUG] Chip '${hdl.name}' output '${outDecl.name}' busWidth=${bus.getWidth()} ` +
                    `elements=[${bus.getElements().map((e) => e.toString()).join(", ")}]`,
                );
            }
            elements.push(maker(ins, outs))
            // this.attachSliceElements(busses, elements);
            // this.attachMergeElements(busses, elements);

            //DEBUG
            for (const outDecl of hdl.outputs) {
                const bus = busses[outDecl.name];
                if (!bus) {
                    this.log(LogLevel.WARN, `[DEBUG] No bus allocated for output '${outDecl.name}' in chip '${hdl.name}'`,);
                    continue;
                }
                this.log(
                    LogLevel.DEBUG,
                    `[DEBUG] Chip '${hdl.name}' output '${outDecl.name}' busWidth=${bus.getWidth()} ` +
                    `elements=[${bus.getElements().map((e) => e.toString()).join(", ")}]`,
                );
            }

            return {elements};
        }

        //3) PARTS-based HDL
        if (hasParts){
            console.log(`[N2TLoader]   Instantiating ${hdl.parts!.length} PARTS in chip '${hdl.name}'.`);
            for (const part of hdl.parts!) {
                console.log(`[N2TLoader]   PART '${part.type}' args=${JSON.stringify(part.args)}`);
                await this.instantiatePart(project, hdl, part, busses, elements);
            }
            this.attachSliceElements(busses, elements);
            this.attachMergeElements(busses, elements);

            // DEBUG: show what drives each top-level output
            for (const outDecl of hdl.outputs) {
                const bus = busses[outDecl.name];
                if (!bus) {
                    this.log( LogLevel.WARN, `[DEBUG] No bus allocated for output '${outDecl.name}' in chip '${hdl.name}'`);
                    continue;
                }

                this.log(
                    LogLevel.DEBUG,
                    `[DEBUG] Chip '${hdl.name}' output '${outDecl.name}' busWidth=${bus.getWidth()} ` +
                    `elements=[${bus.getElements().map((e) => e.toString()).join(", ")}]`,
                );
            }
 
            return {elements};
        }
        
        //4 Neither BUILTIN nor PARTS;
        this.log(
            LogLevel.WARN,
            `HDL chip '${hdl.name}' has no BUILTIN and no PARTS; creating IO-only shell.`,
        );
        // this.attachSliceElements(busses, elements);
        // this.attachMergeElements(busses, elements);

        // DEBUG: show what drives each top-level output
        for (const outDecl of hdl.outputs) {
            const bus = busses[outDecl.name];
            if (!bus) {
                this.log(
                    LogLevel.WARN,
                    `[DEBUG] No bus allocated for output '${outDecl.name}' in chip '${hdl.name}'`,
                );
                continue;
            }

            this.log(
                LogLevel.DEBUG,
                `[DEBUG] Chip '${hdl.name}' output '${outDecl.name}' busWidth=${bus.getWidth()} ` +
                    `elements=[${bus.getElements().map((e) => e.toString()).join(", ")}]`,
            );
        }

        return { elements };
    }


    /**
     * Instantiate one PART line: type(args...).
     * Resolution rule :
     *   1) Try to resolve as an HDL subcircuit (loaded or from <type>.hdl in wdir).
     *      - If both HDL and primitive exist, HDL wins (with a warning).
     *   2) If no HDL subcircuit, try to resolve as a Willow primitive.
     *   3) If neither exist, log a warning and do nothing.
     */
    private async instantiatePart(
        project: CircuitProject,
        hdl: ParsedHDL,
        part: HDLPart,
        busses: Record<string, CircuitBus>,
        elements: CircuitElement[],
    ): Promise<void> {
        const { type, args } = part;
      

        //1) subcircuit? 
        const child = await this.ensureChildLoaded(project, type);
        if (child){
            //bind by childs declared pin order 
            const childInputNames = Object.values(child.getInputs?.() ?? {})
                .sort((a:any, b:any) => a.getIndex() - b.getIndex())
                .map((p:any) =>p.getLabel());
            const childOutputNames = Object.values(child.getOutputs?.() ?? {})
                .sort((a: any, b: any) => a.getIndex() - b.getIndex())
                .map((p: any) => p.getLabel());

            const inByOrder = childInputNames.map((pin) =>{
                const ref = args[pin];
                if (ref == null){
                    throw new Error(
                        `Subcircuit '${type}' used in chip '${hdl.name}' ` +
                        `is missing a connection for input pin '${pin}'.`,
                    );
                }
                //width hint is conservative, ensureBus will reconcile
                const bus = this.resolveInputSignal(busses, ref, 1);
                console.log(
                    `[N2TLoader]     Subcircuit input pin '${pin}' <- '${ref}' ` +
                    `busWidth=${bus.getWidth()}`,
                );
                return bus;
            });

            const outByOrder = childOutputNames.map((pin) => {
                const ref = args[pin];
                if (ref == null) {
                    throw new Error(
                        `Subcircuit '${type}' used in chip '${hdl.name}' ` +
                        `is missing a connection for output pin '${pin}'.`,
                    );
                }
                const bus = this.resolveOutputSignal(busses, ref, 1);
                console.log(
                  `[N2TLoader]     Subcircuit output pin '${pin}' -> '${ref}' ` +
                  `busWidth=${bus.getWidth()}`,
                );
                return bus;
             });

            console.log(
              `[N2TLoader]   Subcircuit '${type}' IO widths: ` +
              `ins=[${inByOrder.map((b) => b.getWidth()).join(",")}], ` +
              `outs=[${outByOrder.map((b) => b.getWidth()).join(",")}]`,
            );

            elements.push(new SubCircuit(child, inByOrder, outByOrder));
            return;
        }

        //2) primitive?
        const maker = this.getPrimitiveMaker(type);
        if (maker){
            const {inPins, outPins} = choosePinOrder(type, args);
            console.log(
              `[N2TLoader]   Resolved '${type}' as primitive. ` +
              `inPins=[${inPins.join(", ")}], outPins=[${outPins.join(", ")}]`,
            );

            const ins:CircuitBus[] = inPins.map((pin)=>{
                const ref = args[pin];
                if (ref == null){
                    throw new Error(
                        `Primitive '${type}' in chip '${hdl.name}' is missing ` +
                        `output pin '${pin}'.`,
                  );
                }
                const bus = this.resolveInputSignal(busses, ref, 1);
                console.log(
                  `[N2TLoader]     Primitive output '${pin}' <- '${ref}' ` +
                  `busWidth=${bus.getWidth()}`,
                );
                return bus;
            });

            const outs: CircuitBus[] = outPins.map((pin) => {
                const ref = args[pin];
                if (ref == null) {
                    throw new Error(
                        `Primitive '${type}' in chip '${hdl.name}' is missing ` +
                        `output pin '${pin}'.`,
                    );
                }
                const bus =  this.resolveOutputSignal(busses, ref, 1);
                console.log(
                  `[N2TLoader]     Primitive output '${pin}' -> '${ref}' ` +
                  `busWidth=${bus.getWidth()}`,
                );
                return bus
            });
        // Any remaining pins (e.g. select lines) can be passed as "extra"
            const extra: Record<string, string> = {};
            for (const [pin, ref] of Object.entries(args)) {
                if (!inPins.includes(pin) && !outPins.includes(pin)) {
                    extra[pin] = ref;
                }
            }
            console.log(
              `[N2TLoader]   Primitive '${type}' extra pins=${JSON.stringify(extra)} ` +
              `insWidths=[${ins.map((b) => b.getWidth()).join(",")}], ` +
              `outsWidths=[${outs.map((b) => b.getWidth()).join(",")}]`,
            );

            elements.push(maker(ins, outs, extra));
            return;
        }
        // 3) Nothing matched: this is an error in the N2T project
        throw new Error(
            `Unknown chip type '${type}' in PARTS of '${hdl.name}'. ` +
            `Expected a previously loaded subcircuit, a resolvable '.hdl' ` +
            `file in the working directory, or a Willow primitive.`,
        );
    }


  // -----------------------------------------------------------------------------------
  // Helpers: primitive maker lookup, lazy child load, logging passthrough
  // -----------------------------------------------------------------------------------

    private getPrimitiveMaker(name: string): ElementMaker | undefined {
        return createElementByNorm.get(normName(name));
    }

    private async ensureChildLoaded(
        project: CircuitProject,
        chipName: string,
    ): Promise<Circuit | null> {

        //Already in project?
        try{
            const existing = project.getCircuitByName(chipName);
            if (existing) return existing;
        } catch {} //throw if missing, but thats ok, do nothign

        //2) No resolvver = Cannot load HDL
        if (this.loadingStack.has(chipName)){
            this.log(
                LogLevel.ERROR,
                `Cyclic subcircuit dependency involving '${chipName}'.`,
            );
            return null;
        }

        //3) as resolver for child HDL stream
        const stream = await this.openChildHDL(chipName);
        if (!stream) {
            return null;
        }

        this.loadingStack.add(chipName);
        try{
            await this.loadIntoProject(project, stream);
        } finally{
            this.loadingStack.delete(chipName);
        }

        //4) lookup now that its loaded
        try{
            return project.getCircuitByName(chipName)?? null;
        } catch{
            return null;
        }
    }

    // CircuitLoggable passthrough (if CircuitLoader doesn’t already implement these):
    log(level: LogLevel, message: string, data?: any): void {
        super.log(level, message, data);
    }

    propagateLoggersTo(obj: CircuitLoggable): void {
        super.propagateLoggersTo(obj);
    }

    private async openChildHDL(chipName:string): Promise<Stream | null> {
        const filePath = path.join(this.workingDir, `${chipName}.hdl`);

        try {
            await fs.promises.access(filePath, fs.constants.R_OK);
        } catch{
            return null; //file cannot be reached or does not exis
        }
        return fs.createReadStream(filePath);

    }


    /**
   * Resolve a pin RHS reference into a CircuitBus.
   * Handles:
   *  - named buses: "foo", "bar"
   *  - bit slices: "foo[3]" (returns a 1-bit view; for simplicity we just ensure the base bus)
   *  - constants: e.g., "true", "false", "0", "1" (if you support const buses, add that here)
   *  - concatenations: "{a, b, c}" (if supported; otherwise wire by named nets)
   *
   * This is a placeholder; wire it to your existing implementation if you already have one.
   */
  //TODO: 
    private resolveInputSignal(
        table: Record<string, CircuitBus>,
        ref: string,
        widthHint: number,
    ): CircuitBus {
        const trimmed = ref.trim()

        //1) concatenation? {a, b[0..3], true}
        if (trimmed.startsWith("{") && trimmed.endsWith("}")){
            const inner = trimmed.slice(1, -1); // strip { }
            const parts = inner.split(",").map((s) => s.trim());

            //Recursibly resolve each part to get widths;
            let totalWidth = 0;
            for (const p of parts) {
                const b = this.resolveInputSignal(table, p, 1);
                console.log(`[N2TLoader]   concat part='${p}' width=${b.getWidth()}` );
                totalWidth += b.getWidth();
            }
            const key = trimmed;
            console.log(`[N2TLoader]   Concatenation '${trimmed}' totalWidth=${totalWidth}, key='${key}'`);
            
            return ensureBus(table, key, Math.max(widthHint, totalWidth));
        }

        //2) Range slice? foo[3..6]
        const rangeMatch = /^([A-Za-z_]\w*)\[(\d+)\.\.(\d+)\]$/.exec(trimmed);
        if (rangeMatch){
            const baseName = rangeMatch[1];
            const lo = parseInt(rangeMatch[2], 10); //10=base 10
            const hi = parseInt(rangeMatch[3],10);
            const width = Math.abs(hi - lo) + 1;
            const rangeName = `${baseName}[${lo}..${hi}]`;
            const rangeBus = ensureBus(table, rangeName, width);
            const baseBus = table[baseName];
            console.log(
                `[N2TLoader]   Range slice '${rangeName}' ` +
                `(baseWidth=${baseBus ? baseBus.getWidth() : "unknown"}) ` +
                `-> sliceWidth=${rangeBus.getWidth()}`,
            );
            this.rangeSlices.push( {baseName, lo, hi, rangeName});
            return rangeBus;
        }

        //3) Single-bit slice? foo[3]
        const bitMatch =  /^([A-Za-z_]\w*)\[(\d+)\]$/.exec(trimmed);
        if (bitMatch) {
            const baseName = bitMatch[1];
            const bitIndex = parseInt(bitMatch[2], 10); //10=base 10
            const sliceName = `${baseName}[${bitIndex}]`;
            const sliceBus =  ensureBus(table, sliceName, 1);
            const baseBus = table[baseName];
            console.log(
                `[N2TLoader]   Bit slice '${sliceName}' ` +
                `(baseWidth=${baseBus ? baseBus.getWidth() : "unknown"}) -> sliceWidth=${sliceBus.getWidth()}`,
            );
            this.bitSlices.push( {baseName, bitIndex, sliceName});
            return sliceBus;
        }

        //4) constants? true/false/0/1

        if (trimmed ==="true" || trimmed === "false" || trimmed === "0" || trimmed === "1") {
            const name = `$const_${trimmed}`;
            return ensureBus(table, name, Math.max(widthHint, 1))
        }

        //Else Plain Bus name.
        const bus = ensureBus(table, trimmed, widthHint);
        console.log(`[N2TLoader]   Plain bus ref '${trimmed}' -> width=${bus.getWidth()}`);
        return bus;
    }

    private attachSliceElements(
        busses: Record<string, CircuitBus>,
        elements: CircuitElement[],
    ):void {
        console.log(
            `[N2TLoader] attachSliceElements: bitSlices=${this.bitSlices.length}, ` +
            `rangeSlices=${this.rangeSlices.length}, existingElements=${elements.length}`,
        );
        
        console.log(
            `[N2TLoader]   bitSlice specs=`,
            this.bitSlices.map(s => `${s.baseName}[${s.bitIndex}]`),
        );

        console.log(
            `[N2TLoader]   rangeSlice specs=`,
            this.rangeSlices.map(s => `${s.baseName}[${s.lo}..${s.hi}]`),
        );

        for (const spec of this.bitSlices){
            const base = busses[spec.baseName];
            const slice = busses[spec.sliceName];

            if (!base || !slice){
                this.log(LogLevel.WARN, `Missing buses for bit slice ${spec.baseName}[${spec.bitIndex}]`);
                continue;
            }
            console.log(
                `[N2TLoader]   Attaching BitSliceElement base='${spec.baseName}' ` +
                `baseWidth=${base.getWidth()} bitIndex=${spec.bitIndex} ` +
                `out='${spec.sliceName}' outWidth=${slice.getWidth()}`,
            );

            elements.push( new BitSliceElement(base, spec.bitIndex, slice));
        }
        
        for (const spec of this.rangeSlices) {
            const base = busses[spec.baseName];
            const range = busses[spec.rangeName];
            if (!base || !range){
                this.log(LogLevel.WARN, `Missing buses for range slice ${spec.baseName}[${spec.lo}..${spec.hi}]`);
                continue;
            }

            console.log(
                `[N2TLoader]   Attaching RangeSliceElement base='${spec.baseName}' ` +
                `baseWidth=${base.getWidth()} lo=${spec.lo} hi=${spec.hi} ` +
                `out='${spec.rangeName}' outWidth=${range.getWidth()}`,
            );
            elements.push( new RangeSliceElement(base, spec.lo, spec.hi, range));
        }
    }


    private resolveOutputSignal(
        table: Record<string, CircuitBus>,
        ref: string,
        widthHint: number,
    ): CircuitBus {
        const trimmed = ref.trim();

        // We do NOT support writing to concatenations on the LHS.
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            throw new Error(
                `[N2TLoader] Cannot drive concatenation '${trimmed}' as an output.`,
            );
        }

        // Range slice? out[3..6]
        const rangeMatch = /^([A-Za-z_]\w*)\[(\d+)\.\.(\d+)\]$/.exec(trimmed);
        if (rangeMatch) {
            const baseName = rangeMatch[1];
            const lo = parseInt(rangeMatch[2], 10);
            const hi = parseInt(rangeMatch[3], 10);
            const width = Math.abs(hi - lo) + 1;
            const rangeName = `${baseName}[${lo}..${hi}]`;

            const sliceBus = ensureBus(table, rangeName, width);
            const baseBus = ensureBus(table, baseName, Math.max(widthHint, width));

            console.log(
                `[N2TLoader]   Output range slice '${rangeName}' ` +
                    `(baseWidth=${baseBus.getWidth()}) -> sliceWidth=${sliceBus.getWidth()}`,
            );

            this.rangeMerges.push({ baseName, lo, hi, rangeName });
            return sliceBus;
        }

        // Single-bit slice? out[3]
        const bitMatch = /^([A-Za-z_]\w*)\[(\d+)\]$/.exec(trimmed);
        if (bitMatch) {
            const baseName = bitMatch[1];
            const bitIndex = parseInt(bitMatch[2], 10);
            const sliceName = `${baseName}[${bitIndex}]`;

            const sliceBus = ensureBus(table, sliceName, 1);
            const baseBus = ensureBus(table, baseName, Math.max(widthHint, 1));

            console.log(
                `[N2TLoader]   Output bit slice '${sliceName}' ` +
                    `(baseWidth=${baseBus.getWidth()}) -> sliceWidth=${sliceBus.getWidth()}`,
            );

            this.bitMerges.push({ baseName, bitIndex, sliceName });
            return sliceBus;
        }

        // Cannot drive a constant.
        if (
            trimmed === "true" ||
            trimmed === "false" ||
            trimmed === "0" ||
            trimmed === "1"
        ) {
            throw new Error(
                `[N2TLoader] Cannot drive constant '${trimmed}' as an output.`,
            );
        }

        // Plain bus: just drive the top-level bus directly.
        const bus = ensureBus(table, trimmed, widthHint);
        console.log(
            `[N2TLoader]   Output plain bus ref '${trimmed}' -> width=${bus.getWidth()}`,
        );
        return bus;
    }


    private attachMergeElements(
    busses: Record<string, CircuitBus>,
    elements: CircuitElement[],
    ): void {
        console.log(
            `[N2TLoader] attachMergeElements: bitMerges=${this.bitMerges.length}, ` +
                `rangeMerges=${this.rangeMerges.length}, existingElements=${elements.length}`,
        );

        console.log(
            `[N2TLoader]   bitMerge specs=`,
            this.bitMerges.map((s) => `${s.sliceName} -> ${s.baseName}[${s.bitIndex}]`),
        );

        console.log(
            `[N2TLoader]   rangeMerge specs=`,
            this.rangeMerges.map(
                (s) => `${s.rangeName} -> ${s.baseName}[${s.lo}..${s.hi}]`,
            ),
        );

        // Single-bit merges
        for (const spec of this.bitMerges) {
            const base = busses[spec.baseName];
            const slice = busses[spec.sliceName];

            if (!base || !slice) {
                this.log(
                    LogLevel.WARN,
                    `Missing buses for bit merge ${spec.sliceName} -> ${spec.baseName}[${spec.bitIndex}]`,
                );
                continue;
            }

            console.log(
                `[N2TLoader]   Attaching BitMergeElement source='${spec.sliceName}' ` +
                    `sourceWidth=${slice.getWidth()} base='${spec.baseName}' ` +
                    `baseWidth=${base.getWidth()} bitIndex=${spec.bitIndex}`,
            );

            elements.push(new BitMergeElement(slice, base, spec.bitIndex));
        }

        // Range merges
        for (const spec of this.rangeMerges) {
            const base = busses[spec.baseName];
            const range = busses[spec.rangeName];

            if (!base || !range) {
                this.log( LogLevel.WARN, `Missing buses for range merge ${spec.rangeName} -> ${spec.baseName}[${spec.lo}..${spec.hi}]`);
                continue;
            }

            console.log(
                `[N2TLoader]   Attaching RangeMergeElement source='${spec.rangeName}' ` +
                    `sourceWidth=${range.getWidth()} base='${spec.baseName}' ` +
                    `baseWidth=${base.getWidth()} lo=${spec.lo} hi=${spec.hi}`,
            );

            elements.push(new RangeMergeElement(range, base, spec.lo, spec.hi));
        }
    }


}

// Nand2TetrisLoader.ts

// AI Acknowledgement -  AI was used in the development of this file for REGEX, commenting/documentation, helper functions, and sytax fixes. 

// Core ideas:
//  - Try a Willow primitive first, else treat as a subcircuit.
//  - Subcircuits are just other HDL chips by name; we can lazily load them via an optional resolver.
//  - A small "createElement" map is the single source of truth for primitives (Willow-native elements).
//  - Known chips may need stable pin orders (e.g. ALU); otherwise we fall back to a simple heuristic.



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
  // Inc16: (i, o) => new Inc16(i, o),
  Nand: (i, o) => new NandGate(i, o),
  Not: (i, o) => new NotGate(i, o),
  Not16: (i, o) => new Not16(i, o),
  Or: (i, o) => new OrGate(i, o),
  Or16: (i, o) => new Or16(i, o),
  // Or8Way: (i, o) => new Or8Way(i, o),
  Xor: (i, o) => new XorGate(i, o),

  //Multi input circuit elements 
  // Add16: (i, o, extra) => new Add16(i, o, extra),
  // Bit: (i, o, extra) => new Bit(i, o, extra),
  // DFF: (i, o, extra) => new DFlipFlop(i, o, extra),
  // DMux: (i, o, extra) => new Demultiplexer(i, o, extra),
  // DMux4Way: (i, o, extra) => new DMux4Way(i, o, extra),
  // DMux8Way: (i, o, extra) => new DMux8Way(i, o, extra),
  // // DRegister: () => new DRegister(), //not yet supported by Willow
  // FullAdder: (i, o, extra) => new FullAdder(i, o, extra),
  // HalfAdder: (i, o, extra) => new HalfAdder(i, o, extra),
  // // Keyboard: () => new Keyboard(), //not yet supported  by Willow
  // Mux: (i, o, extra) => new Multiplexer(i, o, extra),
  // Mux16: (i, o, extra) => new Mux16(i, o, extra),
  // Mux4Way16: (i, o, extra) => new Mux4Way16(i, o, extra),
  // Mux8Way16: (i, o, extra) => new Mux8Way16(i, o, extra),

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
  Inc16:      { inPins: ["in"],               outPins: ["out"] },

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
  }
  // Optional: reconcile widths if mismatched (throw, widen, or assert). For now, accept first-come width.
  return b;
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
function resolveSignal(
  table: Record<string, CircuitBus>,
  ref: string,
  widthHint: number,
): CircuitBus {
  // Very simple version: only plain names. Extend to slices/consts/concat if your HDL supports them.
  // Example extension points:
  //  - if (/^\{.*\}$/.test(ref)) { ... handle concatenation ... }
  //  - if (/^\w+\[\d+\]$/.test(ref)) { ... handle bit slice ... }
  //  - if (ref === "true" || ref === "false" || /^[01]$/.test(ref)) { ... constants ... }
  return ensureBus(table, ref, widthHint);
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

/**
 * Nand2TetrisLoader
 * - Unifies BUILTIN and PARTS resolution:
 *     Try Willow primitive → else treat as a SubCircuit (load if needed via resolver).
 * - Adds cycle detection to avoid infinite recursion.
 * - Builds a new Circuit for each .hdl file, and stores it in the provided CircuitProject.
 */
export class Nand2TetrisLoader extends CircuitLoader implements CircuitLoggable {
  private resolveChildHDL?: ChildResolver;
  private loadingStack = new Set<string>(); // cycle guard

  constructor(resolver?: ChildResolver) {
    super();
    this.resolveChildHDL = resolver;
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
   *  - Creates top-level Input/Output shells
   *  - If BUILTIN: treat like a single "part" named by builtin/hdl.name (primitive→subcircuit)
   *  - Else iterate PARTS with the unified resolution rule
   */
  private async buildCircuitElements(project: CircuitProject, hdl: ParsedHDL): Promise<{ elements: CircuitElement[] }> {
    // Local netlist bus table
    const busses: Record<string, CircuitBus> = {};
    const elements: CircuitElement[] = [];

    // 1) Create IO shells: Inputs drive an internal bus; Outputs read from an internal bus.
    hdl.inputs.forEach((p, index) => {
      const internal = ensureBus(busses, p.name, p.width);
      const out = new CircuitBus(p.width);
      out.connect(internal);
      const inputEl = new Input(index, p.name, [out]);
      elements.push(inputEl);
    });
    hdl.outputs.forEach((p, index) => {
      const internal = ensureBus(busses, p.name, p.width);
      const outputEl = new Output(index, p.name, internal);
      elements.push(outputEl);
    });

    // Quick helpers to address top-level ports by name (used when building whole-chip primitives)
    const insByName = (pin: string): CircuitBus => {
      const port = hdl.inputs.find((p) => p.name === pin);
      if (!port) throw new Error(`Unknown input pin '${pin}' on chip '${hdl.name}'.`);
      return ensureBus(busses, port.name, port.width);
    };
    const outsByName = (pin: string): CircuitBus => {
      const port = hdl.outputs.find((p) => p.name === pin);
      if (!port) throw new Error(`Unknown output pin '${pin}' on chip '${hdl.name}'.`);
      return ensureBus(busses, port.name, port.width);
    };

    // 2) If the chip is declared BUILTIN, we *still* apply the same resolution rule:
    //    try primitive by the builtin name (or hdl.name) → else treat as subcircuit by that name.
    if (hdl.builtin) {
      const target = hdl.builtin || hdl.name;
      const maker = this.getPrimitiveMaker(target) || this.getPrimitiveMaker(hdl.name);
      if (maker) {
        const ins = hdl.inputs.map((p) => insByName(p.name));
        const outs = hdl.outputs.map((p) => outsByName(p.name));
        elements.push(maker(ins, outs, {}));
      } else {
        const child = await this.ensureChildLoaded(project, target);
        if (child) {
          const childInNames = Object.values(child.getInputs?.() ?? {})
            .sort((a: any, b: any) => a.getIndex() - b.getIndex())
            .map((p: any) => p.getLabel());
          const childOutNames = Object.values(child.getOutputs?.() ?? {})
            .sort((a: any, b: any) => a.getIndex() - b.getIndex())
            .map((p: any) => p.getLabel());
          const inByOrder = childInNames.map((pin) => insByName(pin));
          const outByOrder = childOutNames.map((pin) => outsByName(pin));
          elements.push(new SubCircuit(child, inByOrder, outByOrder));
        } else {
          this.log(
            LogLevel.WARN,
            `BUILTIN '${target}' for '${hdl.name}' not mapped and no subcircuit found; creating IO-only shell.`,
          );
        }
      }
      return { elements };
    }

    // 3) PARTS-based HDL: iterate each part and resolve as primitive→subcircuit.
    if (hdl.parts && hdl.parts.length) {
      for (const part of hdl.parts) {
        await this.instantiatePart(project, hdl, part, busses, elements);
      }
    }

    return { elements };
  }

  /**
   * Instantiate one PART line: type(args...). Resolution rule is always:
   *   1) If Willow primitive exists → create it.
   *   2) Else treat as subcircuit:
   *       - if already loaded in project, use it
   *       - else, try to lazy-load via resolver
   *   3) Else warn.
   */
  private async instantiatePart(
    project: CircuitProject,
    hdl: ParsedHDL,
    part: HDLPart,
    busses: Record<string, CircuitBus>,
    elements: CircuitElement[],
  ): Promise<void> {
    const { type, args } = part;

    // 1) Primitive?
    const maker = this.getPrimitiveMaker(type);
    if (maker) {
      // For primitives, use pin order heuristic
      const { inPins, outPins } = choosePinOrder(type, args);

      // Resolve input buses
      const ins: CircuitBus[] = inPins.map((pin) => {
        const ref = args[pin];
        if (ref == null) throw new Error(`${type} missing pin '${pin}'.`);
        const declared = hdl.inputs.find((p) => p.name === pin);
        const widthHint = declared?.width ?? 1;
        return resolveSignal(busses, ref, widthHint);
      });

      // Resolve output buses
      const outs: CircuitBus[] = outPins.map((pin) => {
        const ref = args[pin];
        if (ref == null) throw new Error(`${type} missing pin '${pin}'.`);
        const declared = hdl.outputs.find((p) => p.name === pin);
        const widthHint = declared?.width ?? 1;
        return resolveSignal(busses, ref, widthHint);
      });

      elements.push(maker(ins, outs, args));
      return;
    }

    // 2) Subcircuit? (existing or lazy-loadable)
    const child = await this.ensureChildLoaded(project, type);
    if (child) {
      // Bind by child's declared pin order (names), sorted by index to preserve HDL order
      const childInputNames = Object.values(child.getInputs?.() ?? {})
        .sort((a: any, b: any) => a.getIndex() - b.getIndex())
        .map((p: any) => p.getLabel());
      const childOutputNames = Object.values(child.getOutputs?.() ?? {})
        .sort((a: any, b: any) => a.getIndex() - b.getIndex())
        .map((p: any) => p.getLabel());

      const inByOrder = childInputNames.map((pin) => {
        const ref = args[pin];
        if (ref == null) throw new Error(`SubCircuit '${type}' missing input '${pin}'.`);
        return resolveSignal(busses, ref, 1);
      });
      const outByOrder = childOutputNames.map((pin) => {
        const ref = args[pin];
        if (ref == null) throw new Error(`SubCircuit '${type}' missing output '${pin}'.`);
        return resolveSignal(busses, ref, 1);
      });

      elements.push(new SubCircuit(child, inByOrder, outByOrder));
      return;
    }

    // 3) Nothing matched
    this.log(
      LogLevel.WARN,
      `Unknown chip '${type}' in PARTS of '${hdl.name}'. Add a Willow primitive mapping or supply a subcircuit named '${type}'.`,
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
    // Already present?
    try {
      const existing = project.getCircuitByName(chipName);
      if (existing) return existing;
    } catch {
      // Not found, continue to load it
    }

    // No resolver? We can't lazy-load.
    if (!this.resolveChildHDL) return null;

    // Cycle guard: if child is on the current stack, we abort.
    if (this.loadingStack.has(chipName)) {
      this.log(LogLevel.ERROR, `Cyclic subcircuit dependency involving '${chipName}'.`);
      return null;
    }

    const stream = await this.resolveChildHDL(chipName);
    if (!stream) return null;

    // Load child into the same project.
    // Note: loadIntoProject manages the loading stack internally
    await this.loadIntoProject(project, stream);
    try {
      return project.getCircuitByName(chipName) ?? null;
    } catch {
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
}

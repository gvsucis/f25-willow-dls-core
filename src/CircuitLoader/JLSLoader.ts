/*
 * Copyright (c) 2025 Jordan Bancino <jordan@bancino.net>
 * Copyright (c) 2025 Austin Hargis <hargisa@mail.gvsu.edu>
 * Copyright (c) 2025 Aaron MacDougall <macdouaa@mail.gvsu.edu>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { CircuitLoader } from "../CircuitLoader";
import { CircuitProject } from "../CircuitProject";
import { LogLevel } from "../CircuitLogger";
import { CircuitElement } from "../CircuitElement";

import Stream from "stream";
import { FileUtil } from "../Util/File";

import { Circuit } from "../Circuit";
import { CircuitBus } from "../CircuitBus";
import { AndGate } from "../CircuitElement/AndGate";
import { XorGate } from "../CircuitElement/XorGate";
import { Input } from "../CircuitElement/Input";
import { Output } from "../CircuitElement/Output";
import { OrGate } from "../CircuitElement/OrGate";
import { SubCircuit } from "../CircuitElement/SubCircuit";
import { Decoder } from "../CircuitElement/Decoder";
import { BufferGate } from "../CircuitElement/BufferGate";
import { NorGate } from "../CircuitElement/NorGate";
import { Adder } from "../CircuitElement/Adder";
import { TriState } from "../CircuitElement/TriState";
import { NandGate } from "../CircuitElement/NandGate";
import { Constant } from "../CircuitElement/Constant";
import { BitString } from "../BitString";
import { NotGate } from "../CircuitElement/NotGate";
import { Clock } from "../CircuitElement/Clock";
import { Multiplexer } from "../CircuitElement/Multiplexer";
import { Extend } from "../CircuitElement/Extend";
import { Splitter } from "../CircuitElement/Splitter";
import { JLSRAM } from "../CircuitElement/JLSRAM";
import { JLSRegister } from "../CircuitElement/JLSRegister";
import { Stop } from "../CircuitElement/Stop";

/**
 * Parsed element data structure from JLS files.
 */
type ParsedElement = {
  /** Element type name (e.g., "AndGate", "Memory", "SubCircuit") */
  type: string;
  /** Property map from JLS file (e.g., "id", "bits", "name") */
  props: Record<string, string[]>;
  /** Nested circuit for SubCircuit elements */
  subcircuit?: Circuit;
};

/**
 * Factory function type for creating JLS circuit elements.
 */
type JLSElementFactory = (
  data: ParsedElement,
  inputs: CircuitBus[],
  outputs: CircuitBus[],
  loader: CircuitLoader,
) => CircuitElement;

/**
 * Generate split/bind configuration from JLS element data.
 * 
 * JLS supports two formats for splitter/binder pairs:
 * 
 * **New Format (ranges)**: "0:3", "4:7" 
 * - Each pair represents a bit range [start:end]
 * - Example: "0:3" means bits 0-3 (width 4)
 * 
 * **Old Format (mapping)**: "0:0", "0:1", "0:2", "1:0", "1:1"
 * - First number is output index, second is bit index
 * - Multiple pairs can map to same output
 * - Example: three pairs with first number "0" creates one output of width 3
 * 
 * @param data - Parsed element containing "pair" properties
 * @returns Array of widths for each split/bind output
 * 
 * @example
 * // New format: ["0:3", "4:7"] => [4, 4]
 * // Old format: ["0:0", "0:1", "0:2", "1:0"] => [3, 1]
 */
function genSplit(data: ParsedElement): number[] {
  const pairs = data.props["pair"];
  const parsedPairs = pairs.map((s) => s.split(":").map((n) => parseInt(n)));

  // Detect format by analyzing pair structure
  const isNewFormat = parsedPairs.length > 1 &&
    parsedPairs.every(([start, end]) => {
      const width = end - start;
      return width >= 0 && width <= 15; // Reasonable range widths
    });

  const firstNumbers = parsedPairs.map(p => p[0]);
  const hasDuplicates = firstNumbers.length !== new Set(firstNumbers).size;

  if (isNewFormat && !hasDuplicates) {
    // New format: each pair is a bit range [start:end]
    return parsedPairs.map(([start, end]) => end - start + 1);
  } else {
    // Old format: group by output index
    const pairMap: Record<number, number[]> = {};
    for (const [output, bit] of parsedPairs) {
      if (!pairMap[output]) {
        pairMap[output] = [];
      }
      pairMap[output].push(bit);
    }
    return Object.values(pairMap).map((a) => a.length);
  }
}

/**
 * Get the width of a specific splitter output in new format.
 * 
 * @param data - Parsed splitter/binder element
 * @param outputIndex - Index of the output to query
 * @returns Width of the specified output, or 1 if not found
 */
function getSplitterOutputWidth(data: ParsedElement, outputIndex: number): number {
  const pairs = data.props["pair"];
  const parsedPairs = pairs.map((s) => s.split(":").map((n) => parseInt(n)));

  // Check if this is new format
  const firstNumbers = parsedPairs.map(p => p[0]);
  const hasDuplicates = firstNumbers.length !== new Set(firstNumbers).size;
  const isNewFormat = parsedPairs.length > 1 &&
    parsedPairs.every(([start, end]) => end - start >= 0 && end - start <= 15) &&
    !hasDuplicates;

  if (isNewFormat && outputIndex < parsedPairs.length) {
    const [start, end] = parsedPairs[outputIndex];
    return end - start + 1;
  }

  // Fallback for old format or invalid index
  return 1;
}

/**
 * Map of JLS element type names to their factory functions.
 * 
 * Each factory receives:
 * - `data`: Parsed element properties from JLS file
 * - `inputs`: Array of input buses (ordered by "put" label)
 * - `outputs`: Array of output buses (ordered by "put" label)
 * - `loader`: Reference to the loader for logging
 * 
 * @example
 * // Adding a new JLS element:
 * createElement["MyElement"] = (data, inputs, outputs, loader) => {
 *   const width = parseInt(data.props["bits"][0]);
 *   return new MyElement(inputs[0], outputs[0], width);
 * };
 */
const createElement: Record<string, JLSElementFactory> = {
  /**
   * Input/Output Pins - Circuit interface elements
   */
  InputPin: (data, inputs, outputs) =>
    new Input(0, data.props["name"][0] ?? "", outputs),

  OutputPin: (data, inputs, outputs) =>
    new Output(0, data.props["name"][0] ?? "", inputs[0]),

  /**
   * SubCircuit - Hierarchical circuit element
   * Note: data.subcircuit is guaranteed to be set by the parser
   */
  SubCircuit: (data, inputs, outputs) =>
    new SubCircuit(data.subcircuit as Circuit, inputs, outputs),

  /**
   * Logic Gates - Basic combinational logic
   */
  AndGate: (data, inputs, outputs) => new AndGate(inputs, outputs),
  XorGate: (data, inputs, outputs) => new XorGate(inputs, outputs),
  OrGate: (data, inputs, outputs) => new OrGate(inputs, outputs),
  NorGate: (data, inputs, outputs) => new NorGate(inputs, outputs),
  NandGate: (data, inputs, outputs) => new NandGate(inputs, outputs),
  NotGate: (data, inputs, outputs) => new NotGate(inputs, outputs),

  /**
   * DelayGate - Treated as a buffer in our implementation
   */
  DelayGate: (data, inputs, outputs) => new BufferGate(inputs, outputs),

  /**
   * Constants and Clocks
   */
  Constant: (data, inputs, outputs) => {
    // JLS stores constants in base 10 regardless of display base
    const value = parseInt(data.props["value"][0], 10);
    const binStr = value.toString(2);
    return new Constant(outputs[0], new BitString(binStr));
  },

  Clock: (data, inputs, outputs) => new Clock(outputs[0]),

  /**
   * Arithmetic Elements
   */
  Adder: (data, inputs, outputs) =>
    new Adder(
      inputs[0],  // A
      inputs[1],  // B
      inputs[2],  // Cin
      outputs[1], // Sum
      outputs[0], // Cout
    ),

  /**
   * Multiplexers and Decoders
   */
  Decoder: (data, inputs, outputs) => new Decoder(inputs[0], outputs),

  TriState: (data, inputs, outputs) =>
    new TriState(
      inputs[1],  // Data input
      inputs[0],  // Control
      outputs[0], // Output
    ),

  Mux: (data, inputs, outputs) => {
    // Select signal is the last input
    const select = inputs.pop();
    if (!select) {
      throw new Error("Mux inputs array is empty.");
    }
    return new Multiplexer(inputs, outputs, select);
  },

  /**
   * Bus Manipulation
   */
  Extend: (data, inputs, outputs) => new Extend(inputs[0], outputs),

  /**
   * Splitter and Binder - Bus splitting/joining
   * 
   * JLS treats these as separate elements, but they're implemented
   * using the same Splitter class with reversed input/output order.
   */
  Splitter: (data, inputs, outputs) =>
    new Splitter(genSplit(data), inputs[0], outputs),

  Binder: (data, inputs, outputs) =>
    new Splitter(genSplit(data), outputs[0], inputs),

  /**
   * Memory Elements - RAM/ROM
   * 
   * JLS can initialize memory from external files, but this is disabled
   * for security reasons. Use the built-in editor instead.
   */
  Memory: (data, inputs, outputs, loader) => {
    // Security check: prevent loading from external files
    if (data.props["file"][0] !== "") {
      throw new Error(
        'Unable to initialize JLS memory from external file. Make sure all memory ' +
        'is initialized using the "built-in" editor instead of reading from a file.',
      );
    }

    const bits = parseInt(data.props["bits"][0]);
    const capacity = parseInt(data.props["cap"][0]);

    // Initialize memory with zeros
    let initialData = Array(capacity).fill(BitString.low(bits));

    // Parse initial data if provided (format: "address data\naddress data")
    if (data.props["init"][0]) {
      loader.log(
        LogLevel.TRACE,
        `RAM has initial data: '${data.props["init"][0]}'.`,
      );

      const parsedInit = data.props["init"][0]
        .split("\\n")
        .map((line) => line.split(" "))
        .map(([addr, dataStr]) => [parseInt(addr, 16), parseInt(dataStr, 16)])
        .map(([addr, dataVal]) => [addr, new BitString(dataVal.toString(2), bits)]);

      parsedInit.forEach(([addr, dataVal]) => {
        if ((addr as number) >= initialData.length) {
          throw new Error(
            `Address '${addr}' out of bounds for memory with capacity of '${initialData.length}'.`,
          );
        }
        initialData[addr as number] = dataVal;
      });

      loader.log(
        LogLevel.TRACE,
        `Full contents of RAM: ${initialData.map((b) => b.toString())}`,
      );

      // Reset to empty after logging (appears to be intentional in original code)
      initialData = Array(capacity).fill(BitString.low(bits));
    }

    // Determine if this is ROM or RAM based on number of inputs
    if (inputs.length === 3) {
      // ROM: No data input or write enable, create dummy buses
      return new JLSRAM(
        inputs[0],              // Address
        new CircuitBus(0),      // Data input (dummy)
        outputs[0],             // Data output
        inputs[2],              // Chip select
        inputs[1],              // Output enable
        new CircuitBus(0),      // Write enable (dummy)
        capacity,
        bits,
        initialData,
      );
    } else if (inputs.length === 5) {
      // RAM: Full functionality
      return new JLSRAM(
        inputs[0],  // Address
        inputs[2],  // Data input
        outputs[0], // Data output
        inputs[3],  // Chip select
        inputs[1],  // Output enable
        inputs[4],  // Write enable
        capacity,
        bits,
        initialData,
      );
    } else {
      throw new Error(
        "Sanity check failed: Unable to detect RAM or ROM. " +
        "Make sure all wires are connected to all memory elements.",
      );
    }
  },

  /**
   * Register - Sequential storage element
   */
  Register: (data, inputs, outputs) => {
    const registerType = data.props["type"][0] as "pff" | "nff";

    if (!["pff", "nff"].includes(registerType)) {
      throw new Error(
        `Unrecognized or unsupported register type: '${registerType}'.`,
      );
    }

    return new JLSRegister(
      inputs[0],  // Data input
      inputs[1],  // Clock
      outputs[1], // Q
      outputs[0], // notQ
      registerType,
    );
  },

  /**
   * Stop - Simulation control element
   */
  Stop: (data, inputs, outputs) => new Stop(inputs),
};

/**
 * JLSLoader - Loads and parses JLS (Java Logic Simulator) .jls files
 * 
 * ## File Format Overview
 * 
 * JLS files are ZIP archives containing a "JLSCircuit" text file with a custom format:
 * 
 * ```
 * CIRCUIT CircuitName
 *   ELEMENT ElementType
 *     int id 12345
 *     int bits 8
 *     String name "MyElement"
 *     pair 0:3
 *     [CIRCUIT NestedCircuit ... ENDCIRCUIT]
 *   END
 *   ELEMENT WireEnd
 *     int id 67890
 *     ref attach 12345
 *     ref wire 11111
 *     String put "input1"
 *   END
 * ENDCIRCUIT
 * ```
 * 
 * ## Key Differences from CircuitVerse
 * 
 * - **Label-based I/O**: Connections use named "put" labels instead of indices
 * - **Wire-centric**: Explicit WireEnd elements define all connections
 * - **Hierarchical nesting**: SubCircuits contain full CIRCUIT definitions
 * - **Whitespace tokenization**: Entire file is parsed as space-separated tokens
 * 
 * ## Loading Process
 * 
 * 1. Extract and tokenize JLSCircuit file from ZIP
 * 2. Parse each CIRCUIT block recursively
 * 3. Create CircuitBus objects for all wires
 * 4. Connect buses according to WireEnd elements
 * 5. Determine bus widths through multi-pass analysis:
 *    - Element properties (bits)
 *    - Subcircuit I/O widths
 *    - Splitter configurations
 *    - Memory address requirements
 *    - Width propagation across connected groups
 * 6. Instantiate circuit elements with properly connected buses
 * 7. Handle special SubCircuit I/O remapping
 * 
 * ## Width Determination Challenges
 * 
 * JLS doesn't explicitly store wire widths, requiring inference from:
 * - Element "bits" properties
 * - Memory capacity (address width = ceil(log2(capacity)))
 * - Splitter pair configurations
 * - Constant values (minimum bits needed)
 * - Subcircuit pin widths
 * - Connected wire groups (must all match maximum width)
 * 
 * ## Adding Support for New Elements
 * 
 * 1. Import the element class
 * 2. Add factory to createElement map:
 * 
 * ```typescript
 * createElement["NewElement"] = (data, inputs, outputs, loader) => {
 *   const myParam = parseInt(data.props["myParam"][0]);
 *   return new NewElement(inputs[0], outputs[0], myParam);
 * };
 * ```
 * 
 * 3. If the element has custom "put" names (not "input1", "output1"),
 *    add them to the hardcodedElements map in #parseCircuit
 * 
 * ## Known JLS Quirks
 * 
 * - No unique circuit IDs (uses names instead)
 * - "put" names can be arbitrary strings (not just "input1", "output2")
 * - Splitter "put" values are computed from pairs (non-deterministic)
 * - Initial memory data format uses escaped newlines ("\\n")
 * - Some elements use "delay" prop, others use "time" prop
 * - Visual elements (Text, Display, SigGen) must be filtered out
 * 
 * @example
 * ```typescript
 * const loader = new JLSLoader();
 * const stream = fs.createReadStream('myCircuit.jls');
 * const project = await loader.load(stream);
 * const circuits = project.getCircuits();
 * console.log(`Loaded ${circuits.length} circuit(s)`);
 * ```
 */
export class JLSLoader extends CircuitLoader {
  /**
   * Element types that have no functional behavior and should be ignored.
   * These are primarily visual or testing elements from JLS.
   */
  private static readonly IGNORED_ELEMENTS = ["SigGen", "Text", "Display"];

  /**
   * Map of element types to their custom input/output "put" names.
   * 
   * Elements not in this map use the default "input1", "input2", "output1" pattern.
   * 
   * Format: { ElementType: [[inputPuts], [outputPuts]] }
   */
  private static readonly HARDCODED_ELEMENT_PINS: Record<string, [string[], string[]]> = {
    Adder: [
      ["A", "B", "Cin"],
      ["S", "Cout"],
    ],
    TriState: [
      ["control"],
      [],
    ],
    Mux: [
      ["select"],
      [],
    ],
    Memory: [
      ["WE", "OE", "CS", "address"],
      [],
    ],
    Register: [
      ["D", "C"],
      ["Q", "notQ"],
    ],
  };

  /**
   * Wires that require specific widths regardless of element properties.
   * Updated during wire width resolution.
   */
  private overrideWidths: Record<string, number> = {
    C: 1,      // Clock signals
    WE: 1,     // Write enable
    OE: 1,     // Output enable
    CS: 1,     // Chip select
    Cin: 1,    // Carry in
    Cout: 1,   // Carry out
  };

  constructor() {
    super("JLSCircuitLoader");
  }

  /**
   * Validate and consume an expected token.
   * 
   * @param expected - Expected string or regex pattern
   * @param token - Token to validate
   * @param msg - Optional custom error message
   * @returns The validated token
   * @throws Error if token doesn't match expected pattern
   */
  private expect(expected: string | RegExp, token?: string, msg?: string): string {
    msg ??= `Parse Error: Got token '${token}', expected ${expected}.`;

    const isValid = token && (
      (expected instanceof RegExp && expected.test(token)) ||
      (typeof expected === "string" && token === expected)
    );

    if (!isValid) {
      this.log(LogLevel.FATAL, msg);
      throw new Error(msg);
    }

    return token;
  }

  /**
   * Parse a CIRCUIT block from the token stream.
   * 
   * This is the main parsing function that recursively handles nested circuits
   * (subcircuits) and constructs the complete circuit with all elements and wiring.
   * 
   * @param project - Circuit project to add the parsed circuit to
   * @param tokens - Token stream to parse from (modified in place)
   * @returns Parsed circuit added to the project
   */
  private parseCircuit(project: CircuitProject, tokens: string[]): Circuit {
    this.expect("CIRCUIT", tokens.shift());
    const name = this.expect(/[a-zA-Z0-9]+/, tokens.shift());

    this.log(LogLevel.DEBUG, `Parsing circuit: ${name}`);

    // Parse all elements until ENDCIRCUIT
    const parsedElements: ParsedElement[] = [];
    while (tokens.length && tokens[0] !== "ENDCIRCUIT") {
      const element = this.parseElement(project, tokens);

      // Filter out non-functional visual elements
      if (!JLSLoader.IGNORED_ELEMENTS.includes(element.type)) {
        parsedElements.push(element);
      }
    }

    this.expect("ENDCIRCUIT", tokens.shift());

    // Separate wires from functional elements
    const parsedWires = parsedElements.filter((e) => e.type === "WireEnd");
    const functionalElements = parsedElements
      .filter((e) => e.type !== "WireEnd")
      .sort((a, b) => a.props["id"][0].localeCompare(b.props["id"][0]));

    this.log(
      LogLevel.TRACE,
      `Found ${functionalElements.length} functional element(s) and ${parsedWires.length} wire(s)`,
    );

    // Phase 1: Create all circuit buses
    const wires = this.createWires(functionalElements, parsedWires);

    // Phase 2: Connect wires together
    this.connectWires(parsedWires, wires);

    // Phase 3: Fix wire widths for special elements
    this.fixMemoryAddressWidths(functionalElements, parsedWires, wires);
    this.fixSplitterWidths(functionalElements, parsedWires, wires);
    this.applyWidthOverrides(parsedWires, wires);

    // Phase 4: Propagate maximum widths across connected wire groups
    this.propagateConnectedWidths(wires);

    // Phase 5: Instantiate circuit elements
    const elements = this.instantiateElements(
      functionalElements,
      parsedWires,
      wires,
    );

    // Create and register the circuit
    const circuit = new Circuit(name, name, elements);
    project.addCircuit(circuit);

    this.log(LogLevel.INFO, `Successfully loaded circuit '${name}' with ${elements.length} element(s)`);

    return circuit;
  }

  /**
   * Create CircuitBus objects for all wires in the circuit.
   * 
   * Wire widths are determined from element properties, with special handling for:
   * - Elements with explicit "bits" property
   * - Constants (width from value)
   * - Clocks (always 1 bit)
   * - Subcircuits (width from pin definitions)
   * - Splitters/Binders (variable widths)
   * 
   * @param elements - Functional circuit elements
   * @param parsedWires - Wire definitions from JLS file
   * @returns Map of wire ID to CircuitBus
   */
  private createWires(
    elements: ParsedElement[],
    parsedWires: ParsedElement[],
  ): Record<string, CircuitBus> {
    const wires: Record<string, CircuitBus> = {};

    for (const element of elements) {
      const elementId = element.props["id"][0];
      const elementType = element.type;

      // Find all wires connected to this element
      const directConnections = parsedWires.filter((w) =>
        (w.props["attach"] ?? []).includes(elementId),
      );
      const connectedWires = this.getWireDependencies(parsedWires, directConnections);

      // Determine base width for this element's wires
      const width = this.determineElementWidth(element);

      // Create buses for all connected wires
      for (const wire of connectedWires) {
        const wireId = wire.props["id"][0];

        if (wires[wireId]) {
          // Wire already exists, ensure width is at least as wide as needed
          if (wires[wireId].getWidth() !== width) {
            wires[wireId].setWidth(Math.max(width, wires[wireId].getWidth()));
          }
          continue;
        }

        // Determine actual wire width (may differ from element width for subcircuits/splitters)
        const wireWidth = this.determineWireWidth(element, wire, width);

        if (wireWidth === -1) {
          // Can't determine width yet, will be created in later iteration
          continue;
        }

        wires[wireId] = new CircuitBus(wireWidth);
        this.log(LogLevel.TRACE, `Created wire ${wireId} with width ${wireWidth}`);
      }
    }

    // Create any remaining intermediate wires (connected only to other wires)
    this.createIntermediateWires(parsedWires, wires);

    return wires;
  }

  /**
   * Determine the base width for an element's connections.
   * 
   * @param element - Parsed element
   * @returns Base width, or -1 if requires special handling
   */
  private determineElementWidth(element: ParsedElement): number {
    // Most elements have explicit "bits" property
    if (element.props["bits"] && !["Splitter", "Binder"].includes(element.type)) {
      return parseInt(element.props["bits"][0]);
    }

    // Special cases
    switch (element.type) {
      case "Clock":
      case "Stop":
        return 1;

      case "Constant": {
        // Width is minimum bits needed to represent the value
        const base = parseInt(element.props["base"][0]);
        const value = parseInt(element.props["value"][0], base);
        return value.toString(2).length;
      }

      case "Splitter":
      case "Binder":
      case "SubCircuit":
        // These require per-wire width determination
        return -1;

      default:
        throw new Error(
          `Element type '${element.type}' missing 'bits' property`,
        );
    }
  }

  /**
   * Determine the width of a specific wire connected to an element.
   * 
   * @param element - Element the wire connects to
   * @param wire - Wire definition
   * @param baseWidth - Element's base width
   * @returns Wire width, or -1 if cannot be determined yet
   */
  private determineWireWidth(
    element: ParsedElement,
    wire: ParsedElement,
    baseWidth: number,
  ): number {
    if (baseWidth !== -1) {
      return baseWidth;
    }

    const putLabel = wire.props["put"]?.[0];
    if (!putLabel) {
      return -1; // No put label, defer to later iteration
    }

    // SubCircuit: Get width from pin definition
    if (element.type === "SubCircuit") {
      if (!element.subcircuit) {
        throw new Error("SubCircuit element missing nested circuit");
      }

      const inputs = element.subcircuit.getInputs();
      const outputs = element.subcircuit.getOutputs();

      if (inputs[putLabel]) {
        return inputs[putLabel].getOutputs()[0].getWidth();
      } else if (outputs[putLabel]) {
        return outputs[putLabel].getInputs()[0].getWidth();
      }

      return -1; // Pin not found, defer
    }

    // Splitter/Binder: Determine from split configuration
    if (element.type === "Splitter" || element.type === "Binder") {
      if (["input", "output"].includes(putLabel)) {
        return parseInt(element.props["bits"][0]);
      }

      // Check format: old format "11-8" or new format "0", "1", etc.
      const parsedPut = putLabel.split("-");
      if (parsedPut.length > 1) {
        // Old format: range notation
        return parseInt(parsedPut[0]) - parseInt(parsedPut[1]) + 1;
      } else if (/^[0-9]+$/.test(putLabel)) {
        // New format: numeric index
        const outputIndex = parseInt(putLabel);
        return getSplitterOutputWidth(element, outputIndex);
      }

      return 1; // Fallback for named wires
    }

    return -1;
  }

  /**
   * Create buses for intermediate wires (connected only to other wires).
   * 
   * Iterates until all wires are created, inferring widths from connected wires.
   */
  private createIntermediateWires(
    parsedWires: ParsedElement[],
    wires: Record<string, CircuitBus>,
  ): void {
    let previousCount = 0;

    while (parsedWires.length !== Object.values(wires).length) {
      const currentCount = Object.values(wires).length;

      // Prevent infinite loops on malformed input
      if (currentCount === previousCount) {
        this.log(
          LogLevel.WARNING,
          `Unable to determine width for ${parsedWires.length - currentCount} wire(s)`,
        );
        break;
      }
      previousCount = currentCount;

      for (const wire of parsedWires) {
        const wireId = wire.props["id"][0];
        if (wires[wireId]) continue;

        const connectedTo = wire.props["wire"];
        for (const connectedId of connectedTo) {
          if (wires[connectedId]) {
            wires[wireId] = new CircuitBus(wires[connectedId].getWidth());
            this.log(
              LogLevel.TRACE,
              `Created intermediate wire ${wireId} (width ${wires[wireId].getWidth()})`,
            );
            break;
          }
        }
      }
    }
  }

  /**
   * Connect all wires according to their connection data.
   * 
   * @param parsedWires - Wire definitions
   * @param wires - Map of wire ID to CircuitBus
   */
  private connectWires(
    parsedWires: ParsedElement[],
    wires: Record<string, CircuitBus>,
  ): void {
    for (const wire of parsedWires) {
      const wireId = wire.props["id"][0];
      const connections = wire.props["wire"];

      for (const connectedId of connections) {
        wires[wireId].connect(wires[connectedId]);
        this.log(
          LogLevel.TRACE,
          `Connected wire ${wireId} (width ${wires[wireId].getWidth()}) => ` +
          `${connectedId} (width ${wires[connectedId].getWidth()})`,
        );
      }
    }
  }

  /**
   * Fix address wire widths for memory elements.
   * 
   * Memory address width must be ceil(log2(capacity)) to address all locations.
   */
  private fixMemoryAddressWidths(
    elements: ParsedElement[],
    parsedWires: ParsedElement[],
    wires: Record<string, CircuitBus>,
  ): void {
    const memoryElements = elements.filter((e) => e.type === "Memory");

    for (const memory of memoryElements) {
      const capacity = parseInt(memory.props["cap"][0]);
      const requiredWidth = Math.ceil(Math.log2(capacity));

      // Find the address wire
      const addressWire = parsedWires.find(
        (w) =>
          w.props["put"]?.[0] === "address" &&
          w.props["attach"]?.[0] === memory.props["id"][0],
      );

      if (addressWire) {
        const wireId = addressWire.props["id"][0];
        const currentWidth = wires[wireId].getWidth();

        if (currentWidth !== requiredWidth) {
          this.log(
            LogLevel.TRACE,
            `Fixing memory address wire ${wireId}: ${currentWidth} => ${requiredWidth} ` +
            `(capacity=${capacity})`,
          );
          wires[wireId].setWidth(requiredWidth);
        }
      }
    }
  }

  /**
   * Fix widths for splitter/binder output wires.
   * 
   * Splitter outputs may have different widths than the element's base width.
   */
  private fixSplitterWidths(
    elements: ParsedElement[],
    parsedWires: ParsedElement[],
    wires: Record<string, CircuitBus>,
  ): void {
    // Find all wires with numeric or range put labels (splitter outputs)
    const splitterWires = parsedWires.filter(
      (w) => w.props["put"] && /^[0-9]+(-[0-9]+)?$/.test(w.props["put"][0]),
    );

    for (const wire of splitterWires) {
      const putLabel = wire.props["put"][0];
      const wireId = wire.props["id"][0];

      let newWidth: number;

      const [start, end] = putLabel.split("-").map((i) => parseInt(i));
      if (end !== undefined) {
        // Old format: "11-8" means bits 11 down to 8
        newWidth = start - end + 1;
      } else {
        // New format: numeric index, find the splitter element
        const attachedElementId = wire.props["attach"][0];
        const splitterElement = elements.find(
          (el) =>
            el.props["id"][0] === attachedElementId &&
            (el.type === "Splitter" || el.type === "Binder"),
        );

        if (splitterElement) {
          const outputIndex = parseInt(putLabel);
          newWidth = getSplitterOutputWidth(splitterElement, outputIndex);
          this.log(
            LogLevel.TRACE,
            `Splitter wire ${wireId}: outputIndex=${outputIndex}, ` +
            `pairs=${JSON.stringify(splitterElement.props["pair"])}`,
          );
        } else {
          newWidth = 1; // Fallback
        }
      }

      this.overrideWidths[putLabel] = newWidth;

      this.log(
        LogLevel.TRACE,
        `Fixing splitter wire ${wireId} (${putLabel}): ${wires[wireId].getWidth()} => ${newWidth}`,
      );
    }
  }

  /**
   * Apply all width overrides to wires based on their put labels.
   */
  private applyWidthOverrides(
    parsedWires: ParsedElement[],
    wires: Record<string, CircuitBus>,
  ): void {
    for (const wire of parsedWires) {
      const putLabel = wire.props["put"]?.[0];
      if (!putLabel) continue;

      const wireId = wire.props["id"][0];
      const overrideWidth = this.overrideWidths[putLabel];

      if (overrideWidth && wires[wireId].getWidth() !== overrideWidth) {
        this.log(
          LogLevel.TRACE,
          `Applying width override for wire ${wireId} (${putLabel}): ` +
          `${wires[wireId].getWidth()} => ${overrideWidth}`,
        );
        wires[wireId].setWidth(overrideWidth);
      }
    }
  }

  /**
   * Propagate maximum widths across all connected wire groups.
   * 
   * All wires in a connected group must have the same width. This ensures
   * consistency by finding the maximum width in each group and applying it
   * to all members.
   */
  private propagateConnectedWidths(wires: Record<string, CircuitBus>): void {
    const visited = new Set<string>();

    const findMaxWidth = (bus: CircuitBus, currentMax: number): number => {
      const busId = bus.getId();
      if (visited.has(busId)) {
        return currentMax;
      }
      visited.add(busId);

      currentMax = Math.max(currentMax, bus.getWidth());

      for (const connected of bus.getConnections()) {
        currentMax = findMaxWidth(connected, currentMax);
      }

      return currentMax;
    };

    for (const wire of Object.values(wires)) {
      visited.clear();
      const maxWidth = findMaxWidth(wire, 0);

      if (maxWidth > wire.getWidth()) {
        this.log(
          LogLevel.TRACE,
          `Propagating max width to connected group [id=${wire.getId()}]: ` +
          `${wire.getWidth()} => ${maxWidth}`,
        );
        wire.setWidth(maxWidth);
      }
    }
  }

  /**
   * Instantiate all circuit elements with their connected buses.
   * 
   * @param elements - Parsed functional elements
   * @param parsedWires - Wire definitions
   * @param wires - Map of wire ID to CircuitBus
   * @returns Array of instantiated CircuitElement objects
   */
  private instantiateElements(
    elements: ParsedElement[],
    parsedWires: ParsedElement[],
    wires: Record<string, CircuitBus>,
  ): CircuitElement[] {
    const instantiated: CircuitElement[] = [];

    for (const element of elements) {
      const elementId = element.props["id"][0];
      const elementType = element.type;

      // Get propagation delay
      const delay = parseInt(
        (element.props["delay"] ?? element.props["time"] ?? ["0"])[0],
      );

      // Find all wires connected to this element
      const connectedWires = parsedWires
        .filter((w) => (w.props["attach"] ?? []).includes(elementId))
        .sort((a, b) => a.props["put"][0].localeCompare(b.props["put"][0]));

      if (elementType === "SubCircuit") {
        // SubCircuits require special handling for I/O remapping
        const instance = this.instantiateSubCircuit(
          element,
          connectedWires,
          wires,
          delay,
        );
        instantiated.push(instance);
      } else {
        // Regular elements
        const instance = this.instantiateRegularElement(
          element,
          connectedWires,
          wires,
          delay,
        );
        instantiated.push(instance);
      }
    }

    return instantiated;
  }

  /**
   * Instantiate a regular (non-subcircuit) element.
   */
  private instantiateRegularElement(
    element: ParsedElement,
    connectedWires: ParsedElement[],
    wires: Record<string, CircuitBus>,
    delay: number,
  ): CircuitElement {
    const elementType = element.type;

    // Get custom put names if this element has them
    const customPins = JLSLoader.HARDCODED_ELEMENT_PINS[elementType];

    let inputWires: ParsedElement[] = [];
    let outputWires: ParsedElement[] = [];

    if (customPins) {
      const [inputPuts, outputPuts] = customPins;
      inputWires = connectedWires.filter((w) =>
        inputPuts.includes(w.props["put"][0]),
      );
      outputWires = connectedWires.filter((w) =>
        outputPuts.includes(w.props["put"][0]),
      );
    }

    // Special handling for Splitter/Binder
    if (elementType === "Splitter") {
      outputWires = connectedWires.filter((w) => w.props["put"][0] !== "input");
    } else if (elementType === "Binder") {
      inputWires = connectedWires.filter((w) => w.props["put"][0] !== "output");
    }

    // Add default input/output naming pattern
    inputWires = [
      ...inputWires,
      ...connectedWires.filter((w) => w.props["put"][0].startsWith("input")),
    ];
    outputWires = [
      ...outputWires,
      ...connectedWires.filter((w) => w.props["put"][0].startsWith("output")),
    ];

    // Sort by put label for deterministic ordering
    const sortedInputs = inputWires
      .sort((a, b) => a.props["put"][0].localeCompare(b.props["put"][0]))
      .map((w) => wires[w.props["id"][0]]);

    const sortedOutputs = outputWires
      .sort((a, b) => a.props["put"][0].localeCompare(b.props["put"][0]))
      .map((w) => wires[w.props["id"][0]]);

    // Create the element
    const factory = createElement[elementType];
    if (!factory) {
      throw new Error(`Unsupported JLS element type: ${elementType}`);
    }

    this.log(LogLevel.TRACE, `Creating element: ${elementType}`);

    const instance = factory(element, sortedInputs, sortedOutputs, this);
    instance
      .setLabel((element.props["name"] ?? [""])[0])
      .setPropagationDelay(delay);

    // Notify all connected buses
    for (const bus of [...sortedInputs, ...sortedOutputs]) {
      bus.connectElement(instance);
      this.log(LogLevel.TRACE, `  => Attached to wire: ${bus.getId()}`);
    }

    return instance;
  }

  /**
   * Instantiate a SubCircuit element with I/O remapping.
   * 
   * JLS uses label-based I/O, but our SubCircuit implementation uses indices.
   * This method remaps the subcircuit's I/O indices to match the order of
   * the provided wire arrays.
   */
  private instantiateSubCircuit(
    element: ParsedElement,
    connectedWires: ParsedElement[],
    wires: Record<string, CircuitBus>,
    delay: number,
  ): CircuitElement {
    if (!element.subcircuit) {
      throw new Error("SubCircuit element missing nested circuit");
    }

    const inputs = Object.values(element.subcircuit.getInputs());
    const outputs = Object.values(element.subcircuit.getOutputs());

    // Remap input indices
    const inputBuses: CircuitBus[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      input.setIndex(i);

      // Find wire connected to this input by label
      const wire = connectedWires.find((w) =>
        w.props["put"].includes(input.getLabel()),
      );

      if (!wire) {
        throw new Error(
          `No wire found for SubCircuit input '${input.getLabel()}'`,
        );
      }

      inputBuses.push(wires[wire.props["id"][0]]);
    }

    // Remap output indices
    const outputBuses: CircuitBus[] = [];
    for (let i = 0; i < outputs.length; i++) {
      const output = outputs[i];
      output.setIndex(i);

      // Find wire connected to this output by label
      const wire = connectedWires.find((w) =>
        w.props["put"].includes(output.getLabel()),
      );

      if (!wire) {
        throw new Error(
          `No wire found for SubCircuit output '${output.getLabel()}'`,
        );
      }

      outputBuses.push(wires[wire.props["id"][0]]);
    }

    // Create the subcircuit instance
    const instance = createElement["SubCircuit"](
      element,
      inputBuses,
      outputBuses,
      this,
    );

    instance
      .setLabel((element.props["name"] ?? [""])[0])
      .setPropagationDelay(delay);

    // Notify all connected buses
    for (const wireData of connectedWires) {
      const bus = wires[wireData.props["id"][0]];
      bus.connectElement(instance);
      this.log(LogLevel.TRACE, `  => Attached to wire: ${bus.getId()}`);
    }

    return instance;
  }

  /**
   * Recursively find all wires connected to a given set of wires.
   * 
   * @param allWires - All wire definitions in the circuit
   * @param wires - Starting set of wires
   * @returns All wires in the connected group (including input wires)
   */
  private getWireDependencies(
    allWires: ParsedElement[],
    wires: ParsedElement[],
  ): ParsedElement[] {
    const dependencies: ParsedElement[] = [];

    for (const wire of wires) {
      const wireId = wire.props["id"][0];

      // Find wires that connect to this wire
      const connected = allWires.filter((w) =>
        w.props["wire"].includes(wireId),
      );

      // Add new dependencies not already in our lists
      for (const conn of connected) {
        if (!dependencies.includes(conn) && !wires.includes(conn)) {
          dependencies.push(conn);
        }
      }
    }

    // Recursively find transitive dependencies
    return dependencies.length
      ? this.getWireDependencies(allWires, [...wires, ...dependencies])
      : wires;
  }

  /**
   * Parse an ELEMENT block from the token stream.
   * 
   * @param project - Circuit project (for nested circuits)
   * @param tokens - Token stream
   * @returns Parsed element with properties and optional nested circuit
   */
  private parseElement(
    project: CircuitProject,
    tokens: string[],
  ): ParsedElement {
    this.expect("ELEMENT", tokens.shift());
    const elementType = this.expect(/[a-zA-Z0-9]*/, tokens.shift());

    const properties: Record<string, string[]> = {};
    let subcircuit: Circuit | undefined;

    while (tokens.length && tokens[0] !== "END") {
      if (tokens[0] === "CIRCUIT") {
        if (subcircuit) {
          throw new Error(
            "Parse error: Multiple CIRCUIT blocks in single ELEMENT",
          );
        }
        subcircuit = this.parseCircuit(project, tokens);
      } else {
        const prop = this.parseProperty(tokens);

        if (!properties[prop.name]) {
          properties[prop.name] = [];
        }
        properties[prop.name].push(prop.value);
      }
    }

    this.expect("END", tokens.shift());

    return {
      type: elementType,
      props: properties,
      subcircuit: subcircuit,
    };
  }

  /**
   * Parse a property declaration.
   * 
   * Format: `<type> <name> <value>`
   * 
   * Types:
   * - int/Int: Integer value
   * - String: Quoted string (may contain spaces)
   * - ref: Reference to another element
   * - probe: Debug probe reference
   * - pair: Splitter pair (format: "name:value")
   * 
   * @param tokens - Token stream
   * @returns Parsed property with type, name, and value
   */
  private parseProperty(tokens: string[]): {
    type: string;
    name: string;
    value: string;
  } {
    const type = this.expect(/([Ii]nt|String|ref|probe|pair)/, tokens.shift());
    let name = this.expect(/[a-zA-Z0-9]*/, tokens.shift());
    let value = this.expect(/(("?[a-zA-Z0-9]*"?)|([0-9]+))/, tokens.shift());

    // Handle multi-word strings
    if (type === "String") {
      while (!value.endsWith('"')) {
        value += " " + tokens.shift();
      }
      // Remove quotes
      value = value.split('"')[1];
    }

    // Handle pair format: "pair name value" becomes name="pair", value="name:value"
    if (type === "pair") {
      value = `${name}:${value}`;
      name = type;
    }

    return {
      type: type,
      name: name,
      value: value,
    };
  }

  /**
   * Load a JLS circuit file from a stream.
   * 
   * @param stream - Readable stream of .jls file (ZIP archive)
   * @returns Promise resolving to complete CircuitProject
   * @throws Error if file is malformed or contains unsupported elements
   * 
   * @example
   * ```typescript
   * const loader = new JLSLoader();
   * const fileStream = fs.createReadStream('circuit.jls');
   * const project = await loader.load(fileStream);
   * console.log(`Loaded ${project.getCircuits().length} circuit(s)`);
   * ```
   */
  async load(stream: Stream): Promise<CircuitProject> {
    const project: CircuitProject = new CircuitProject();
    this.propagateLoggersTo(project);

    // Extract JLSCircuit file from ZIP archive
    const data = await FileUtil.extractFromZip(stream, ["JLSCircuit"]).then(
      ([circuitStream]) => FileUtil.readTextStream(circuitStream),
    );

    this.log(LogLevel.INFO, `Loading JLS circuit (${data.length} characters)`);
    this.log(LogLevel.TRACE, `JLSCircuit Data:\n${data}`);

    // Tokenize: split on whitespace
    const tokens: string[] = data
      .split(/[\s+]/)
      .filter((token) => token.length > 0);

    this.log(LogLevel.DEBUG, `Tokenized into ${tokens.length} token(s)`);

    // Parse all circuits from token stream
    while (tokens.length) {
      this.parseCircuit(project, tokens);
    }

    return project;
  }
}
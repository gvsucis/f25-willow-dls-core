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

import { Circuit } from "../Circuit";
import { CircuitElement } from "../CircuitElement";
import { AndGate } from "../CircuitElement/AndGate";
import { Input } from "../CircuitElement/Input";
import { NorGate } from "../CircuitElement/NorGate";
import { Output } from "../CircuitElement/Output";
import { SubCircuit } from "../CircuitElement/SubCircuit";
import { CircuitLoader } from "../CircuitLoader";
import { CircuitBus } from "../CircuitBus";
import { CircuitProject } from "../CircuitProject";
import { NandGate } from "../CircuitElement/NandGate";
import { NotGate } from "../CircuitElement/NotGate";
import { XnorGate } from "../CircuitElement/XnorGate";
import { XorGate } from "../CircuitElement/XorGate";
import { LogLevel } from "../CircuitLogger";
import { Splitter } from "../CircuitElement/Splitter";
import { Power } from "../CircuitElement/Power";
import { Ground } from "../CircuitElement/Ground";
import { Constant } from "../CircuitElement/Constant";
import { BitString } from "../BitString";
import { Random } from "../CircuitElement/Random";
import { Counter } from "../CircuitElement/Counter";
import { Clock } from "../CircuitElement/Clock";
import { OrGate } from "../CircuitElement/OrGate";
import { Demultiplexer } from "../CircuitElement/Demultiplexer";
import { Multiplexer } from "../CircuitElement/Multiplexer";
import { BitSelector } from "../CircuitElement/BitSelector";
import { PriorityEncoder } from "../CircuitElement/PriorityEncoder";
import { Decoder } from "../CircuitElement/Decoder";
import { DFlipFlop } from "../CircuitElement/DFlipFlop";
import { JKFlipFlop } from "../CircuitElement/JKFlipFlop";
import { SRFlipFlop } from "../CircuitElement/SRFlipFlop";
import { BufferGate } from "../CircuitElement/BufferGate";
import Stream from "stream";
import { FileUtil } from "../Util/File";

/**
 * Context object passed to element creation functions.
 */
type CircuitContext = {
  /** Array of all circuit buses in the current scope */
  nodes: CircuitBus[];
  /** Parsed element data from Logisim XML */
  data: LogisimElement;
  /** The circuit project being constructed */
  project: CircuitProject;
};

/**
 * Parsed element data structure from Logisim files.
 */
type LogisimElement = {
  /** Element type (e.g., "AND Gate", "Input", "Multiplexer") */
  type: string;
  /** User-defined label for the element */
  name: string;
  /** Bit width of the element's data */
  width: number;
  /** Array of input bus indices */
  inputs: number[];
  /** Array of output bus indices (or single index for some elements) */
  outputs: number | number[];
  /** Array of signal/control bus indices (for muxes, decoders, etc.) */
  signals?: number[];
  /** Constant value (for Constant elements) */
  value?: string;
  /** Input index (for Input elements) */
  index?: number;
  /** Circuit index (for SubCircuit elements) */
  circIndex?: string;
  /** Whether this is an output pin */
  outputPin?: boolean;
};

/**
 * Factory function type for creating Logisim circuit elements.
 */
type LogisimElementFactory = (ctx: CircuitContext) => CircuitElement;

/**
 * Map of Logisim element type names to their factory functions.
 * 
 * @example
 * // Adding a new Logisim element:
 * createElement["NewElement"] = ({ nodes, data }) => {
 *   return new NewElement(
 *     data.inputs.map((i: number) => nodes[i]),
 *     [nodes[data.outputs]]
 *   );
 * };
 */
const createElement: Record<string, LogisimElementFactory> = {
  /**
   * Logic Gates - Basic combinational logic
   */
  "AND Gate": ({ nodes, data }) =>
    new AndGate(
      data.inputs.map((i: number) => nodes[i]),
      [nodes[data.outputs as number]],
    ),

  "NAND Gate": ({ nodes, data }) =>
    new NandGate(
      data.inputs.map((i: number) => nodes[i]),
      [nodes[data.outputs as number]],
    ),

  "OR Gate": ({ nodes, data }) =>
    new OrGate(
      data.inputs.map((i: number) => nodes[i]),
      [nodes[data.outputs as number]],
    ),

  "NOR Gate": ({ nodes, data }) =>
    new NorGate(
      data.inputs.map((i: number) => nodes[i]),
      [nodes[data.outputs as number]],
    ),

  "XOR Gate": ({ nodes, data }) =>
    new XorGate(
      data.inputs.map((i: number) => nodes[i]),
      [nodes[data.outputs as number]],
    ),

  "XNOR Gate": ({ nodes, data }) =>
    new XnorGate(
      data.inputs.map((i: number) => nodes[i]),
      [nodes[data.outputs as number]],
    ),

  "NOT Gate": ({ nodes, data }) =>
    new NotGate(
      [nodes[data.inputs as number]],
      [nodes[data.outputs as number]],
    ),

  Buffer: ({ nodes, data }) =>
    new BufferGate(
      [nodes[data.inputs as number]],
      [nodes[data.outputs as number]],
    ),

  /**
   * Input/Output Elements
   */
  Input: ({ nodes, data }) =>
    new Input(data.index ?? 0, data.name, [nodes[data.outputs as number]]),

  Output: ({ nodes, data }) =>
    new Output(data.index ?? 0, data.name, nodes[data.inputs as number]),

  /**
   * Power Sources and Constants
   */
  Power: ({ nodes, data }) =>
    new Power(nodes[data.outputs as number]),

  Ground: ({ nodes, data }) =>
    new Ground(nodes[data.outputs as number]),

  Constant: ({ nodes, data }) =>
    new Constant(
      nodes[data.outputs as number],
      new BitString(data.value ?? "1", data.width),
    ),

  /**
   * Multiplexers and Demultiplexers
   */
  Multiplexer: ({ nodes, data }) =>
    new Multiplexer(
      data.inputs.map((i: number) => nodes[i]),
      [nodes[data.outputs as number]],
      nodes[data.signals![0]],
    ),

  Demultiplexer: ({ nodes, data }) =>
    new Demultiplexer(
      [nodes[data.inputs as number]],
      (data.outputs as number[]).map((i: number) => nodes[i]),
      nodes[data.signals![0]],
    ),

  /**
   * Hierarchical Circuits
   */
  SubCircuit: ({ nodes, data, project }) =>
    new SubCircuit(
      project.getCircuitById(data.circIndex!),
      data.inputs.map((nodeInd: number) => nodes[nodeInd]),
      (data.outputs as number[]).map((nodeInd: number) => nodes[nodeInd]),
    ),

  // TODO: Implement remaining elements
  // The following elements are commented out as they require additional
  // work to properly map Logisim's data format to our implementation.

  // /**
  //  * Encoders and Decoders
  //  */
  // "Priority Encoder": ({ nodes, data }) =>
  //   new PriorityEncoder(
  //     data.inputs.map((i: number) => nodes[i]),
  //     data.outputs.map((i: number) => nodes[i]),
  //     nodes[data.signals![0]],
  //   ),

  // "Decoder": ({ nodes, data }) =>
  //   new Decoder(
  //     nodes[data.inputs as number],
  //     data.outputs.map((i: number) => nodes[i]),
  //   ),

  // "BitSelector": ({ nodes, data }) =>
  //   new BitSelector(
  //     nodes[data.inputs as number],
  //     nodes[data.outputs as number],
  //     nodes[data.signals![0]],
  //   ),

  // /**
  //  * Bus Manipulation
  //  */
  // "Splitter": ({ nodes, data }) =>
  //   new Splitter(
  //     data.splitConfig,
  //     nodes[data.inputs as number],
  //     data.outputs.map((nodeInd: number) => nodes[nodeInd]),
  //   ),

  // /**
  //  * Sequential Elements
  //  */
  // "Counter": ({ nodes, data }) =>
  //   new Counter(
  //     nodes[data.maxValue],
  //     nodes[data.clock],
  //     nodes[data.reset],
  //     nodes[data.output],
  //     nodes[data.zero],
  //   ),

  // "Clock": ({ nodes, data }) => 
  //   new Clock(nodes[data.outputs as number]),

  // /**
  //  * Flip-Flops
  //  */
  // "D Flip-Flop": ({ nodes, data }) =>
  //   new DFlipFlop(
  //     nodes[data.clock],
  //     nodes[data.d],
  //     nodes[data.q],
  //     nodes[data.qNot],
  //     nodes[data.reset],
  //     nodes[data.preset],
  //     nodes[data.enable],
  //   ),

  // "T Flip-Flop": ({ nodes, data }) =>
  //   new TFlipFlop(
  //     nodes[data.clock],
  //     nodes[data.t],
  //     nodes[data.q],
  //     nodes[data.qNot],
  //     nodes[data.reset],
  //     nodes[data.preset],
  //     nodes[data.enable],
  //   ),

  // "J-K Flip-Flop": ({ nodes, data }) =>
  //   new JKFlipFlop(
  //     nodes[data.clock],
  //     nodes[data.j],
  //     nodes[data.k],
  //     nodes[data.q],
  //     nodes[data.qNot],
  //     nodes[data.reset],
  //     nodes[data.preset],
  //     nodes[data.enable],
  //   ),

  // "S-R Flip-Flop": ({ nodes, data }) =>
  //   new SRFlipFlop(
  //     nodes[data.s],
  //     nodes[data.r],
  //     nodes[data.q],
  //     nodes[data.qNot],
  //     nodes[data.reset],
  //     nodes[data.preset],
  //     nodes[data.enable],
  //   ),
};

/**
 * Element dimensions and base position configuration.
 * 
 * Format: [width, height, baseSide]
 * 
 * - **width**: Horizontal size in pixels
 * - **height**: Vertical size in pixels
 * - **baseSide**: Reference point for positioning
 *   - 0: Right side (output side)
 *   - 1: Left side (input side)
 *   - 2: Bottom (signal/control side)
 *   - 3: Top (unused currently)
 * 
 * The base side determines which edge of the element the location coordinate refers to.
 * Positive X values indicate output-based positioning, negative indicate input-based.
 * 
 * Note: Logisim uses top-left as (0,0) origin.
 */
const ELEMENT_DIMENSIONS: Record<string, [number, number, number]> = {
  // Zero-size elements (point-based)
  Input: [0, 0, 0],
  Output: [0, 0, 0],
  Power: [0, 0, 0],
  Ground: [0, 0, 0],
  Constant: [0, 0, 0],

  // Logic gates (output-based positioning)
  "AND Gate": [50, 60, 0],
  "NAND Gate": [60, 60, 0],
  "OR Gate": [50, 60, 0],
  "NOR Gate": [60, 60, 0],
  "XOR Gate": [60, 60, 0],
  "XNOR Gate": [70, 60, 0],
  "NOT Gate": [30, 20, 0],
  Buffer: [20, 20, 0],

  // Complex elements
  SubCircuit: [30, 20, 0], // Actual size depends on I/O count
  Multiplexer: [30, 40, 0],
  Demultiplexer: [30, 40, 1], // Input-based positioning
  Decoder: [30, 40, 2], // Signal-based positioning

  // TODO: Verify dimensions for unimplemented elements
  "Priority Encoder": [50, 30, 0],
  "BitSelector": [30, 30, 0],
  Counter: [50, 30, 0],
  Splitter: [50, 30, 0],
  Clock: [50, 30, 0],
  "D Flip-Flop": [40, 30, 0],
  "S-R Flip-Flop": [40, 30, 0],
  "J-K Flip-Flop": [40, 30, 0],
  "T Flip-Flop": [40, 30, 0],
};

/**
 * Parse a coordinate string from Logisim format.
 * 
 * Logisim stores coordinates as "(x,y)" strings.
 * 
 * @param coord - Coordinate string in format "(x,y)"
 * @returns Tuple of [x, y] as numbers
 * 
 * @example
 * parseCoordinate("(100,200)") // => [100, 200]
 */
function parseCoordinate(coord: string): [number, number] {
  const commaIndex = coord.indexOf(",");
  const x = Number(coord.substring(1, commaIndex));
  const y = Number(coord.substring(commaIndex + 1, coord.length - 1));
  return [x, y];
}

/**
 * Comparator function to sort elements with Inputs first.
 * 
 * Input elements must be sorted to the beginning of the element array
 * to ensure their indices are assigned in the correct order.
 * 
 * @param a - First element to compare
 * @param b - Second element to compare
 * @returns -1 if a is Input, 1 if b is Input, 0 otherwise
 */
function sortInputsFirst(a: CircuitElement, b: CircuitElement): number {
  if (a instanceof Input && !(b instanceof Input)) {
    return -1;
  }
  if (!(a instanceof Input) && b instanceof Input) {
    return 1;
  }
  return 0;
}

/**
 * LogisimLoader - Loads and parses Logisim .circ files
 * 
 * ## File Format Overview
 * 
 * Logisim files are XML documents containing circuit definitions:
 * 
 * ```xml
 * <project>
 *   <circuit name="main">
 *     <wire from="(100,200)" to="(150,200)"/>
 *     <comp name="AND Gate" loc="(200,200)">
 *       <a name="inputs" val="2"/>
 *       <a name="label" val="MyGate"/>
 *     </comp>
 *   </circuit>
 * </project>
 * ```
 * 
 * ## Key Characteristics
 * 
 * - **Coordinate-based**: Elements positioned by (x,y) coordinates
 * - **Wire endpoints**: Wires defined by start/end coordinates
 * - **Physical layout**: Must infer connections from spatial positioning
 * - **Attributes**: Element properties stored as nested `<a>` tags
 * - **Pin polarity**: "Pin" elements can be input or output based on attributes
 * 
 * ## Loading Process
 * 
 * 1. Parse XML structure
 * 2. Identify and order subcircuits (dependencies first)
 * 3. For each circuit:
 *    a. Extract wire endpoints and create node map
 *    b. Parse component positions and dimensions
 *    c. Match wires to element pins by spatial position
 *    d. Determine bus widths from element attributes
 *    e. Create CircuitBus objects and connections
 *    f. Instantiate circuit elements
 *    g. Sort elements (Inputs first)
 * 
 * ## Connection Detection Algorithm
 * 
 * Since Logisim doesn't explicitly specify which element pins connect to which wires,
 * connections are inferred spatially:
 * 
 * 1. Calculate element bounding box from location and dimensions
 * 2. For each wire endpoint:
 *    - Check if on left edge (x == xMin) → Input connection
 *    - Check if on right edge (x == xMax) → Output connection
 *    - Check if on bottom edge (y == yMax) → Signal/control connection
 * 3. Match within vertical/horizontal bounds
 * 
 * ## SubCircuit Ordering
 * 
 * Circuits are sorted to ensure dependencies are loaded first:
 * - Scan all circuits for subcircuit references
 * - Move circuits containing subcircuits to end of processing queue
 * - This ensures referenced circuits exist before subcircuit instantiation
 * 
 * ## Pin Type Detection
 * 
 * Logisim uses "Pin" elements for both inputs and outputs:
 * - Default: Input pin
 * - If `output="true"` attribute: Output pin
 * - Input index counter decremented for output pins
 * 
 * ## Current Limitations
 * 
 * Many sequential and advanced elements are not yet implemented (see TODO comments).
 * These require mapping additional Logisim attributes to element constructors.
 * 
 * ## Adding New Elements
 * 
 * 1. Add dimensions to ELEMENT_DIMENSIONS map
 * 2. Add factory function to createElement map
 * 3. Handle special pin names if needed (like Decoder, Multiplexer)
 * 
 * @example
 * ```typescript
 * const loader = new LogisimLoader();
 * const stream = fs.createReadStream('myCircuit.circ');
 * const project = await loader.load(stream);
 * const circuits = project.getCircuits();
 * ```
 */
export class LogisimLoader extends CircuitLoader {
  /**
   * Elements that don't have input connections.
   * Used to skip input detection for these types.
   */
  private static readonly NO_INPUT_ELEMENTS = [
    "Input",
    "Power",
    "Ground",
    "Constant",
    "Decoder",
  ];

  /**
   * Elements that don't have output connections.
   * Used to skip output detection for these types.
   */
  private static readonly NO_OUTPUT_ELEMENTS = ["Output"];

  /**
   * Elements that have signal/control inputs on the bottom edge.
   * These require special handling for control signal detection.
   */
  private static readonly SIGNAL_WIRE_ELEMENTS = [
    "Multiplexer",
    "Demultiplexer",
    "Decoder",
    "Priority Encoder",
    "BitSelector",
  ];

  constructor() {
    super("LogisimLoader");
  }

  /**
   * Load a Logisim circuit file from a stream.
   * 
   * @param stream - Readable stream containing Logisim XML data
   * @returns Promise resolving to complete CircuitProject
   * @throws Error if file contains unsupported elements or malformed data
   */
  async load(stream: Stream): Promise<CircuitProject> {
    const project: CircuitProject = new CircuitProject();
    this.propagateLoggersTo(project);

    const data = await FileUtil.readXmlStream(stream);
    this.log(LogLevel.INFO, `Loading Logisim project with ${data.project.circuit.length} circuit(s)`);
    this.log(LogLevel.DEBUG, `Project data:`, data);

    // Phase 1: Order circuits to handle subcircuit dependencies
    const orderedCircuits = this.orderCircuitsByDependencies(data.project.circuit);

    // Phase 2: Process each circuit
    for (let circuitIndex = 0; circuitIndex < orderedCircuits.length; circuitIndex++) {
      const circuitData = orderedCircuits[circuitIndex];
      this.log(LogLevel.DEBUG, `Loading circuit '${circuitData.name}'`);

      const circuit = this.parseCircuit(circuitData, circuitIndex, project);
      project.addCircuit(circuit);
    }

    this.log(LogLevel.INFO, `Successfully loaded ${orderedCircuits.length} circuit(s)`);
    return project;
  }

  /**
   * Order circuits so that circuits with subcircuits are processed after
   * the circuits they depend on.
   * 
   * This ensures that when a SubCircuit element is created, the circuit
   * it references has already been added to the project.
   * 
   * @param circuits - Array of circuit data from XML
   * @returns Ordered array with dependencies first
   */
  private orderCircuitsByDependencies(circuits: any[]): any[] {
    // Get list of all circuit names
    const circuitNames = circuits.map((c) => c.name);

    // Find circuits that contain subcircuits
    const circuitsWithSubcircuits = new Set<number>();
    for (let i = 0; i < circuits.length; i++) {
      const circuit = circuits[i];
      if (!circuit.comp) continue;

      for (const component of circuit.comp) {
        if (circuitNames.includes(component.name)) {
          circuitsWithSubcircuits.add(i);
          break;
        }
      }
    }

    // Reorder: move circuits with subcircuits to the end
    const ordered = [...circuits];
    const toMove = Array.from(circuitsWithSubcircuits)
      .sort((a, b) => b - a); // Sort descending to avoid index shifts

    for (const index of toMove) {
      const circuit = ordered.splice(index, 1)[0];
      ordered.push(circuit);
      this.log(
        LogLevel.TRACE,
        `Moved circuit '${circuit.name}' to end (contains subcircuits)`,
      );
    }

    return ordered;
  }

  /**
   * Parse a single circuit from Logisim data.
   * 
   * @param circuitData - Raw circuit data from XML
   * @param circuitIndex - Index of this circuit in the project
   * @param project - Circuit project for subcircuit references
   * @returns Constructed Circuit object
   */
  private parseCircuit(
    circuitData: any,
    circuitIndex: number,
    project: CircuitProject,
  ): Circuit {
    const circuitName = circuitData.name;

    // Phase 1: Build wire/node map from wire definitions
    const wireMap = this.buildWireMap(circuitData.wire || []);

    // Phase 2: Parse all components and determine connections
    const elements = this.parseComponents(
      circuitData.comp || [],
      wireMap,
      project,
    );

    // Phase 3: Create circuit buses
    const buses = this.createBuses(wireMap);

    // Phase 4: Connect buses according to wire map
    this.connectBuses(wireMap, buses);

    // Phase 5: Instantiate circuit elements
    const instantiatedElements = this.instantiateElements(elements, buses, project);

    // Phase 6: Sort elements (Inputs must be first for proper indexing)
    instantiatedElements.sort(sortInputsFirst);

    const circuit = new Circuit(
      circuitIndex.toString(),
      circuitName,
      instantiatedElements,
    );

    this.log(
      LogLevel.INFO,
      `Created circuit '${circuitName}' with ${instantiatedElements.length} element(s)`,
    );

    return circuit;
  }

  /**
   * Build a map of wire nodes and their connections from wire definitions.
   * 
   * @param wires - Array of wire objects from XML
   * @returns Wire map containing nodes, connections, and widths
   */
  private buildWireMap(wires: any[]): {
    nodes: string[];
    connections: number[][];
    widths: number[];
  } {
    const wireMap = {
      nodes: [] as string[],
      connections: [] as number[][],
      widths: [] as number[],
    };

    this.log(LogLevel.TRACE, `Building wire map from ${wires.length} wire(s)`);

    for (const wire of wires) {
      // Add wire endpoints to node list
      if (!wireMap.nodes.includes(wire.from)) {
        wireMap.nodes.push(wire.from);
        wireMap.widths.push(1); // Default width, will be updated later
      }
      if (!wireMap.nodes.includes(wire.to)) {
        wireMap.nodes.push(wire.to);
        wireMap.widths.push(1);
      }

      // Create bidirectional connections
      const fromIndex = wireMap.nodes.indexOf(wire.from);
      const toIndex = wireMap.nodes.indexOf(wire.to);

      (wireMap.connections[fromIndex] ||= []).push(toIndex);
      (wireMap.connections[toIndex] ||= []).push(fromIndex);
    }

    this.log(LogLevel.TRACE, `Created ${wireMap.nodes.length} wire node(s)`);
    return wireMap;
  }

  /**
   * Parse all components in a circuit and determine their wire connections.
   * 
   * @param components - Array of component objects from XML
   * @param wireMap - Wire map to match connections against
   * @param project - Circuit project for subcircuit references
   * @returns Array of parsed element data
   */
  private parseComponents(
    components: any[],
    wireMap: { nodes: string[]; connections: number[][]; widths: number[] },
    project: CircuitProject,
  ): LogisimElement[] {
    const elements: LogisimElement[] = [];
    const circuitNames = project.getCircuits().map((c) => c.getName());
    let inputIndex = 0;

    this.log(LogLevel.TRACE, `Parsing ${components.length} component(s)`);

    for (const component of components) {
      const element = this.parseComponent(
        component,
        wireMap,
        circuitNames,
        inputIndex,
      );

      // Update input index counter
      if (element.type === "Input" && !element.outputPin) {
        inputIndex++;
      }

      elements.push(element);
    }

    return elements;
  }

  /**
   * Parse a single component and determine its connections.
   * 
   * @param component - Component data from XML
   * @param wireMap - Wire map for connection detection
   * @param circuitNames - List of circuit names for subcircuit detection
   * @param inputIndex - Current input index counter
   * @returns Parsed element data
   */
  private parseComponent(
    component: any,
    wireMap: { nodes: string[]; connections: number[][]; widths: number[] },
    circuitNames: string[],
    inputIndex: number,
  ): LogisimElement {
    // Initialize element data structure
    const element: LogisimElement = {
      type: component.name,
      name: "",
      width: 1,
      inputs: [],
      outputs: [],
      value: "0x1",
    };

    // Handle subcircuits
    if (circuitNames.includes(component.name)) {
      element.type = "SubCircuit";
      element.circIndex = circuitNames.indexOf(component.name).toString();
    }

    // Handle Pin elements (can be input or output)
    if (component.name === "Pin") {
      element.type = "Input";
      element.index = inputIndex;
    }

    // Parse attributes
    this.parseComponentAttributes(component.a || [], element);

    // Get element dimensions and position
    const [locX, locY] = parseCoordinate(component.loc);
    const bounds = this.calculateElementBounds(locX, locY, element.type);

    // Detect connections by spatial position
    this.detectConnections(element, wireMap, bounds);

    // Update wire widths based on element
    this.updateWireWidths(element, wireMap);

    this.log(
      LogLevel.TRACE,
      `Parsed ${element.type} '${element.name}': ` +
      `${element.inputs.length} input(s), ` +
      `${Array.isArray(element.outputs) ? element.outputs.length : 1} output(s)`,
    );

    return element;
  }

  /**
   * Parse component attributes from XML.
   * 
   * @param attributes - Array of attribute objects
   * @param element - Element to update with parsed attributes
   */
  private parseComponentAttributes(attributes: any[], element: LogisimElement): void {
    for (const attr of attributes) {
      switch (attr.name) {
        case "label":
          element.name = attr.val;
          break;
        case "width":
          element.width = Number(attr.val);
          break;
        case "output":
          // Pin with output attribute is an Output element
          element.outputPin = true;
          element.type = "Output";
          break;
        case "value":
          element.value = attr.val;
          break;
      }
    }
  }

  /**
   * Calculate the bounding box for an element.
   * 
   * @param locX - X coordinate of element's base position
   * @param locY - Y coordinate of element's base position
   * @param type - Element type
   * @returns Bounding box {xMin, xMax, yMin, yMax}
   */
  private calculateElementBounds(
    locX: number,
    locY: number,
    type: string,
  ): { xMin: number; xMax: number; yMin: number; yMax: number } {
    const dimensions = ELEMENT_DIMENSIONS[type];
    if (!dimensions) {
      throw new Error(`Unknown element type: ${type}`);
    }

    const [width, height, baseSide] = dimensions;

    let xMin: number, xMax: number, yMin: number, yMax: number;

    switch (baseSide) {
      case 0: // Base position is on the right side (output side)
        xMax = locX;
        xMin = xMax - width;
        yMax = locY + height / 2;
        yMin = locY - height / 2;
        break;

      case 1: // Base position is on the left side (input side)
        xMin = locX;
        xMax = locX + width;
        yMax = locY + height / 2;
        yMin = locY - height / 2;
        break;

      case 2: // Base position is on the bottom (signal side)
        xMax = locX + 10;
        xMin = xMax - width;
        yMax = locY;
        yMin = locY - height;
        break;

      case 3: // Base position is on the top (unused currently)
        xMax = locX + 10;
        xMin = xMax - width;
        yMax = locY + height;
        yMin = locY;
        break;

      default:
        throw new Error(`Invalid baseSide value: ${baseSide} for type ${type}`);
    }

    return { xMin, xMax, yMin, yMax };
  }

  /**
   * Detect wire connections for an element based on spatial positioning.
   * 
   * Wire endpoints that fall on the element's edges are considered connections:
   * - Left edge → Input
   * - Right edge → Output
   * - Bottom edge → Signal/control
   * 
   * @param element - Element to detect connections for
   * @param wireMap - Wire map containing node positions
   * @param bounds - Element bounding box
   */
  private detectConnections(
    element: LogisimElement,
    wireMap: { nodes: string[]; connections: number[][]; widths: number[] },
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
  ): void {
    const { xMin, xMax, yMin, yMax } = bounds;

    for (const node of wireMap.nodes) {
      const [x, y] = parseCoordinate(node);
      const nodeIndex = wireMap.nodes.indexOf(node);

      // Detect inputs on left edge
      if (
        !LogisimLoader.NO_INPUT_ELEMENTS.includes(element.type) &&
        x === xMin &&
        yMin <= y &&
        y <= yMax
      ) {
        element.inputs.push(nodeIndex);
      }

      // Detect outputs on right edge
      if (
        !LogisimLoader.NO_OUTPUT_ELEMENTS.includes(element.type) &&
        x === xMax &&
        yMin <= y &&
        y <= yMax
      ) {
        // Some elements have multiple outputs, others have single
        if (Array.isArray(element.outputs)) {
          element.outputs.push(nodeIndex);
        } else {
          element.outputs = nodeIndex;
        }
      }

      // Detect signal/control inputs on bottom edge
      if (
        LogisimLoader.SIGNAL_WIRE_ELEMENTS.includes(element.type) &&
        xMin <= x &&
        x <= xMax &&
        y === yMax
      ) {
        element.signals = element.signals || [];
        element.signals.push(nodeIndex);
      }
    }

    // Convert single outputs to array if needed for certain elements
    if (
      element.type === "SubCircuit" ||
      element.type === "Demultiplexer"
    ) {
      if (!Array.isArray(element.outputs)) {
        element.outputs = [element.outputs];
      }
    }
  }

  /**
   * Update wire widths in the wire map based on element bit widths.
   * 
   * @param element - Element with width information
   * @param wireMap - Wire map to update
   */
  private updateWireWidths(
    element: LogisimElement,
    wireMap: { nodes: string[]; connections: number[][]; widths: number[] },
  ): void {
    // Update input wire widths
    for (const index of element.inputs) {
      wireMap.widths[index] = element.width;
    }

    // Update output wire widths
    if (Array.isArray(element.outputs)) {
      for (const index of element.outputs) {
        wireMap.widths[index] = element.width;
      }
    } else if (typeof element.outputs === "number") {
      wireMap.widths[element.outputs] = element.width;
    }
  }

  /**
   * Create CircuitBus objects from wire map.
   * 
   * @param wireMap - Wire map with node information
   * @returns Array of CircuitBus objects
   */
  private createBuses(wireMap: {
    nodes: string[];
    connections: number[][];
    widths: number[];
  }): CircuitBus[] {
    const buses: CircuitBus[] = [];

    for (let i = 0; i < wireMap.nodes.length; i++) {
      const width = wireMap.widths[i];
      const bus = new CircuitBus(width);
      buses.push(bus);

      this.log(LogLevel.TRACE, `Created bus ${i} with width ${width}`);
    }

    return buses;
  }

  /**
   * Connect all buses according to wire map connections.
   * 
   * @param wireMap - Wire map with connection information
   * @param buses - Array of CircuitBus objects to connect
   */
  private connectBuses(
    wireMap: { nodes: string[]; connections: number[][]; widths: number[] },
    buses: CircuitBus[],
  ): void {
    for (let nodeIndex = 0; nodeIndex < wireMap.connections.length; nodeIndex++) {
      const connections = wireMap.connections[nodeIndex];
      if (!connections) continue;

      for (const connectedIndex of connections) {
        buses[nodeIndex].connect(buses[connectedIndex]);
        this.log(
          LogLevel.TRACE,
          `Connected bus ${nodeIndex} => ${connectedIndex}`,
        );
      }
    }
  }

  /**
   * Instantiate all circuit elements from parsed element data.
   * 
   * @param elements - Array of parsed element data
   * @param buses - Array of CircuitBus objects
   * @param project - Circuit project for subcircuit references
   * @returns Array of instantiated CircuitElement objects
   */
  private instantiateElements(
    elements: LogisimElement[],
    buses: CircuitBus[],
    project: CircuitProject,
  ): CircuitElement[] {
    const instantiated: CircuitElement[] = [];

    for (const elementData of elements) {
      this.log(
        LogLevel.TRACE,
        `Creating element of type '${elementData.type}'...`,
      );

      const factory = createElement[elementData.type];
      if (!factory) {
        throw new Error(
          `Unsupported Logisim element type: ${elementData.type}. ` +
          `To add support, create a factory function in the createElement map ` +
          `and add dimensions to ELEMENT_DIMENSIONS.`,
        );
      }

      const element = factory({
        project: project,
        nodes: buses,
        data: elementData,
      });

      element.setLabel(elementData.name);
      element.setPropagationDelay(10); // Default propagation delay

      instantiated.push(element);
    }

    return instantiated;
  }
}
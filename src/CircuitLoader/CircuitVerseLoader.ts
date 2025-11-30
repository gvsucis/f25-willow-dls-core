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
import { TriState } from "../CircuitElement/TriState";
import { OrGate } from "../CircuitElement/OrGate";
import { Demultiplexer } from "../CircuitElement/Demultiplexer";
import { Multiplexer } from "../CircuitElement/Multiplexer";
import { LSB } from "../CircuitElement/LSB";
import { BitSelector } from "../CircuitElement/BitSelector";
import { MSB } from "../CircuitElement/MSB";
import { PriorityEncoder } from "../CircuitElement/PriorityEncoder";
import { Decoder } from "../CircuitElement/Decoder";
import { DFlipFlop } from "../CircuitElement/DFlipFlop";
import { TFlipFlop } from "../CircuitElement/TFlipFlop";
import { DLatch } from "../CircuitElement/DLatch";
import { JKFlipFlop } from "../CircuitElement/JKFlipFlop";
import { SRFlipFlop } from "../CircuitElement/SRFlipFlop";
import { TwosCompliment } from "../CircuitElement/TwosCompliment";
import { Adder } from "../CircuitElement/Adder";
import { BufferGate } from "../CircuitElement/BufferGate";
import { ControlledInverter } from "../CircuitElement/ControlledInverter";
import { CircuitVerseALU } from "../CircuitElement/CircuitVerseALU";
import Stream from "stream";
import { FileUtil } from "../Util/File";
import { ROM } from "../CircuitElement/ROM";
import { CircuitVerseRAM } from "../CircuitElement/CircuitVerseRAM";

/**
 * Context object passed to element creation functions.
 * Contains all necessary information to instantiate a circuit element from CircuitVerse data.
 */
type CircuitContext = {
  /** Array of all circuit buses (connections between elements) in the current scope */
  nodes: CircuitBus[];
  /** Raw CircuitVerse element data from the .cv file */
  data: any;
  /** The circuit project being constructed, used for subcircuit references */
  project: CircuitProject;
};

/**
 * Factory function type for creating circuit elements.
 * Takes a CircuitContext and returns a fully constructed CircuitElement.
 */
type ElementFactory = (ctx: CircuitContext) => CircuitElement;

/**
 * Map of CircuitVerse element type names to their factory functions.
 * Each factory function handles the specific wiring and configuration for that element type.
 * 
 * @example
 * // Adding a new element type:
 * createElement["MyNewGate"] = ({ nodes, data }) => 
 *   new MyNewGate(
 *     nodes[data.customData.nodes.input],
 *     nodes[data.customData.nodes.output]
 *   );
 */
const createElement: Record<string, ElementFactory> = {
  /**
   * Logic Gates - Basic combinational logic elements
   */
  AndGate: ({ nodes, data }) =>
    new AndGate(
      data.customData.nodes.inp.map((i: number) => nodes[i]),
      [nodes[data.customData.nodes.output1]],
    ),

  NorGate: ({ nodes, data }) =>
    new NorGate(
      data.customData.nodes.inp.map((i: number) => nodes[i]),
      [nodes[data.customData.nodes.output1]],
    ),

  NandGate: ({ nodes, data }) =>
    new NandGate(
      data.customData.nodes.inp.map((i: number) => nodes[i]),
      [nodes[data.customData.nodes.output1]],
    ),

  OrGate: ({ nodes, data }) =>
    new OrGate(
      data.customData.nodes.inp.map((i: number) => nodes[i]),
      [nodes[data.customData.nodes.output1]],
    ),

  NotGate: ({ nodes, data }) =>
    new NotGate(
      [nodes[data.customData.nodes.inp1]],
      [nodes[data.customData.nodes.output1]],
    ),

  Buffer: ({ nodes, data }) =>
    new BufferGate(
      [nodes[data.customData.nodes.inp1]],
      [nodes[data.customData.nodes.output1]],
    ),

  XnorGate: ({ nodes, data }) =>
    new XnorGate(
      data.customData.nodes.inp.map((i: number) => nodes[i]),
      [nodes[data.customData.nodes.output1]],
    ),

  XorGate: ({ nodes, data }) =>
    new XorGate(
      data.customData.nodes.inp.map((i: number) => nodes[i]),
      [nodes[data.customData.nodes.output1]],
    ),

  /**
   * Multiplexers and Demultiplexers - Data routing elements
   */
  Demultiplexer: ({ nodes, data }) =>
    new Demultiplexer(
      [nodes[data.customData.nodes.input]],
      data.customData.nodes.output1.map((i: number) => nodes[i]),
      nodes[data.customData.nodes.controlSignalInput],
    ),

  Multiplexer: ({ nodes, data }) =>
    new Multiplexer(
      data.customData.nodes.inp.map((i: number) => nodes[i]),
      [nodes[data.customData.nodes.output1]],
      nodes[data.customData.nodes.controlSignalInput],
    ),

  /**
   * Bit Manipulation Elements
   */
  LSB: ({ nodes, data }) =>
    new LSB(
      nodes[data.customData.nodes.inp1],
      nodes[data.customData.nodes.output1],
      nodes[data.customData.nodes.enable],
    ),

  MSB: ({ nodes, data }) =>
    new MSB(
      nodes[data.customData.nodes.inp1],
      nodes[data.customData.nodes.output1],
      nodes[data.customData.nodes.enable],
    ),

  PriorityEncoder: ({ nodes, data }) =>
    new PriorityEncoder(
      data.customData.nodes.inp1.map((i: number) => nodes[i]),
      data.customData.nodes.output1.map((i: number) => nodes[i]),
      nodes[data.customData.nodes.enable],
    ),

  Decoder: ({ nodes, data }) =>
    new Decoder(
      nodes[data.customData.nodes.input],
      data.customData.nodes.output1.map((i: number) => nodes[i]),
    ),

  BitSelector: ({ nodes, data }) =>
    new BitSelector(
      nodes[data.customData.nodes.inp1],
      nodes[data.customData.nodes.output1],
      nodes[data.customData.nodes.bitSelectorInp],
    ),

  /**
   * Input/Output Elements - Interface between circuit and external world
   */
  Input: ({ nodes, data }) =>
    new Input(data.index, data.label, [nodes[data.customData.nodes.output1]]),

  // Button and Stepper behave identically to Input in simulation
  Button: ({ nodes, data }) =>
    new Input(data.index, data.label, [nodes[data.customData.nodes.output1]]),

  Stepper: ({ nodes, data }) =>
    new Input(data.index, data.label, [nodes[data.customData.nodes.output1]]),

  Output: ({ nodes, data }) =>
    new Output(data.index, data.label, nodes[data.customData.nodes.inp1]),

  /**
   * Hierarchical Circuit Elements
   */
  SubCircuit: ({ nodes, data, project }) =>
    new SubCircuit(
      project.getCircuitById(data.id),
      data.inputNodes.map((nodeInd: number) => nodes[nodeInd]),
      data.outputNodes.map((nodeInd: number) => nodes[nodeInd]),
    ),

  /**
   * Bus Manipulation
   */
  Splitter: ({ nodes, data }) =>
    new Splitter(
      // Note: CircuitVerse data files contain a typo: "constructorParamaters" instead of "constructorParameters"
      data.customData.constructorParamaters[2],
      nodes[data.customData.nodes.inp1],
      data.customData.nodes.outputs.map((nodeInd: number) => nodes[nodeInd]),
    ),

  /**
   * Power Sources and Constants
   */
  Power: ({ nodes, data }) =>
    new Power(nodes[data.customData.nodes.output1]),

  Ground: ({ nodes, data }) =>
    new Ground(nodes[data.customData.nodes.output1]),

  ConstantVal: ({ nodes, data }) =>
    new Constant(
      nodes[data.customData.nodes.output1],
      new BitString(
        data.customData.constructorParamaters[2],
        data.customData.constructorParamaters[1],
      ),
    ),

  /**
   * Sequential Logic Elements - Timing and state
   */
  Random: ({ nodes, data }) =>
    new Random(
      nodes[data.customData.nodes.maxValue],
      nodes[data.customData.nodes.clockInp],
      nodes[data.customData.nodes.output],
    ),

  Counter: ({ nodes, data }) =>
    new Counter(
      nodes[data.customData.nodes.maxValue],
      nodes[data.customData.nodes.clock],
      nodes[data.customData.nodes.reset],
      nodes[data.customData.nodes.output],
      nodes[data.customData.nodes.zero],
    ),

  Clock: ({ nodes, data }) =>
    new Clock(nodes[data.customData.nodes.output1]),

  /**
   * Tri-State and Controlled Elements
   */
  TriState: ({ nodes, data }) =>
    new TriState(
      nodes[data.customData.nodes.inp1],
      nodes[data.customData.nodes.state],
      nodes[data.customData.nodes.output1],
    ),

  ControlledInverter: ({ nodes, data }) =>
    new ControlledInverter(
      nodes[data.customData.nodes.inp1],
      nodes[data.customData.nodes.state],
      nodes[data.customData.nodes.output1],
    ),

  /**
   * Flip-Flops and Latches - Memory elements
   */
  DflipFlop: ({ nodes, data }) =>
    new DFlipFlop(
      nodes[data.customData.nodes.clockInp],
      nodes[data.customData.nodes.dInp],
      nodes[data.customData.nodes.qOutput],
      nodes[data.customData.nodes.qInvOutput],
      nodes[data.customData.nodes.reset],
      nodes[data.customData.nodes.preset],
      nodes[data.customData.nodes.en],
    ),

  TflipFlop: ({ nodes, data }) =>
    new TFlipFlop(
      nodes[data.customData.nodes.clockInp],
      nodes[data.customData.nodes.dInp],
      nodes[data.customData.nodes.qOutput],
      nodes[data.customData.nodes.qInvOutput],
      nodes[data.customData.nodes.reset],
      nodes[data.customData.nodes.preset],
      nodes[data.customData.nodes.en],
    ),

  Dlatch: ({ nodes, data }) =>
    new DLatch(
      nodes[data.customData.nodes.clockInp],
      nodes[data.customData.nodes.dInp],
      nodes[data.customData.nodes.qOutput],
      nodes[data.customData.nodes.qInvOutput],
    ),

  JKflipFlop: ({ nodes, data }) =>
    new JKFlipFlop(
      nodes[data.customData.nodes.clockInp],
      nodes[data.customData.nodes.J],
      nodes[data.customData.nodes.K],
      nodes[data.customData.nodes.qOutput],
      nodes[data.customData.nodes.qInvOutput],
      nodes[data.customData.nodes.reset],
      nodes[data.customData.nodes.preset],
      nodes[data.customData.nodes.en],
    ),

  SRflipFlop: ({ nodes, data }) =>
    new SRFlipFlop(
      nodes[data.customData.nodes.S],
      nodes[data.customData.nodes.R],
      nodes[data.customData.nodes.qOutput],
      nodes[data.customData.nodes.qInvOutput],
      nodes[data.customNodes.nodes.reset],
      nodes[data.customData.nodes.preset],
      nodes[data.customData.nodes.en],
    ),

  /**
   * Arithmetic Elements
   */
  TwoCompliment: ({ nodes, data }) =>
    new TwosCompliment(
      nodes[data.customData.nodes.inp1],
      nodes[data.customData.nodes.output1],
    ),

  Adder: ({ nodes, data }) =>
    new Adder(
      nodes[data.customData.nodes.inpA],
      nodes[data.customData.nodes.inpB],
      nodes[data.customData.nodes.carryIn],
      nodes[data.customData.nodes.sum],
      nodes[data.customData.nodes.carryOut],
    ),

  ALU: ({ nodes, data }) =>
    new CircuitVerseALU(
      nodes[data.customData.nodes.inp1],
      nodes[data.customData.nodes.inp2],
      nodes[data.customData.nodes.controlSignalInput],
      nodes[data.customData.nodes.output],
      nodes[data.customData.nodes.carryOut],
    ),

  /**
   * Memory Elements - ROM and RAM
   */
  Rom: ({ nodes, data }) =>
    new ROM(
      nodes[data.customData.nodes.memAddr],
      nodes[data.customData.nodes.dataOut],
      nodes[data.customData.nodes.en],
      data.customData.constructorParamaters[0].map(
        (byte: string) => new BitString(parseInt(byte).toString(2), 8),
      ),
      16, // ROM is 16 bytes in CircuitVerse
    ),

  RAM: ({ nodes, data }) =>
    new CircuitVerseRAM(
      nodes[data.customData.nodes.address],
      nodes[data.customData.data.dataIn],
      nodes[data.customData.nodes.write],
      nodes[data.customData.nodes.reset],
      nodes[data.customData.nodes.dataOut],
      1024, // RAM is 1kb in CircuitVerse
      data.customData.constructorParamaters[1],
      [], // No initial data stored in RAM
    ),

  // EEPROM behaves like RAM but is smaller (256 bytes) and can have initial data
  EEPROM: ({ nodes, data }) =>
    new CircuitVerseRAM(
      nodes[data.customData.nodes.address],
      nodes[data.customData.data.dataIn],
      nodes[data.customData.nodes.write],
      nodes[data.customData.nodes.reset],
      nodes[data.customData.nodes.dataOut],
      256, // EEPROM is 256 bytes
      data.customData.constructorParamaters[1],
      data.customData.constructorParamaters[3].map(
        (byte: string) => new BitString(parseInt(byte).toString(2), 8),
      ),
    ),
};

/**
 * CircuitVerseLoader - Loads and parses CircuitVerse .cv files
 * 
 * This is the reference implementation for circuit loaders in this engine.
 * The engine's architecture was designed around CircuitVerse's data format,
 * making this loader particularly well-optimized.
 * 
 * ## File Format Overview
 * 
 * CircuitVerse .cv files are JSON-based and contain:
 * - **Scopes**: Each scope represents a separate circuit/subcircuit
 * - **Nodes**: Bus connections between elements (allNodes array)
 * - **Elements**: Logic gates, I/O, memory, etc. (keyed by type name)
 * 
 * ## Loading Process
 * 
 * 1. Parse JSON from stream
 * 2. For each scope:
 *    a. Create all CircuitBus objects from allNodes array
 *    b. Connect buses according to connections arrays
 *    c. Instantiate circuit elements using createElement factories
 *    d. Assemble into Circuit object
 * 3. Add all circuits to CircuitProject
 * 
 * ## Adding Support for New Elements
 * 
 * To add support for a new CircuitVerse element type:
 * 
 * 1. Import the element class at the top of this file
 * 2. Add a factory function to the createElement map:
 * 
 * ```typescript
 * createElement["NewElementType"] = ({ nodes, data }) => {
 *   return new NewElement(
 *     nodes[data.customData.nodes.input1],
 *     nodes[data.customData.nodes.output1]
 *   );
 * };
 * ```
 * 
 * 3. Map the CircuitVerse node names (from data.customData.nodes) to your element's constructor
 * 
 * ## Known CircuitVerse Quirks
 * 
 * - Typo in data files: "constructorParamaters" instead of "constructorParameters"
 * - Elements are stored as top-level keys in scope objects (poor data structure)
 * - Visual-only elements (Text, Rectangle, Arrow, etc.) are mixed with functional elements
 * 
 * @example
 * ```typescript
 * const loader = new CircuitVerseLoader();
 * const stream = fs.createReadStream('myCircuit.cv');
 * const project = await loader.load(stream);
 * const mainCircuit = project.getCircuitById('main-circuit-id');
 * ```
 */
export class CircuitVerseLoader extends CircuitLoader {
  /**
   * List of scope keys that are not circuit elements.
   * These are metadata or visual-only annotations that should be ignored during loading.
   */
  private static readonly NON_ELEMENT_KEYS = [
    "layout",           // Visual layout information
    "verilogMetadata",  // Verilog export metadata
    "allNodes",         // Bus/connection definitions
    "id",               // Scope identifier
    "name",             // Scope name
    "restrictedCircuitElementsUsed", // Usage tracking
    "nodes",            // Node metadata
    // Visual annotation elements (not functional)
    "Text",
    "Rectangle",
    "Arrow",
    "ImageAnnotation",
  ];

  constructor() {
    super("CircuitVerseLoader");
  }

  /**
   * Load a CircuitVerse .cv file from a stream.
   * 
   * @param stream - Readable stream containing CircuitVerse JSON data
   * @returns Promise resolving to a complete CircuitProject
   * @throws Error if the file contains unsupported element types
   * 
   * @example
   * ```typescript
   * const loader = new CircuitVerseLoader();
   * const fileStream = fs.createReadStream('circuit.cv');
   * const project = await loader.load(fileStream);
   * console.log(`Loaded ${project.getCircuits().length} circuits`);
   * ```
   */
  async load(stream: Stream): Promise<CircuitProject> {
    const project: CircuitProject = new CircuitProject();
    this.propagateLoggersTo(project);

    const data = await FileUtil.readJsonStream(stream);

    this.log(LogLevel.INFO, `Loading CircuitVerse project with ${data.scopes.length} scope(s)`);
    this.log(LogLevel.DEBUG, `Full data:`, data);

    // Process each scope (circuit) in the project
    for (const scopeInd in data.scopes) {
      const scope = data.scopes[scopeInd];
      this.log(LogLevel.DEBUG, `Loading scope '${scope.name}' (${scope.id})`);

      // Phase 1: Create all circuit buses
      const nodes = this.createBuses(scope);

      // Phase 2: Connect buses according to connection data
      this.connectBuses(scope, nodes);

      // Phase 3: Collect all functional circuit elements
      const elementDataArray = this.collectElements(scope);

      // Phase 4: Instantiate circuit elements
      const elements = this.instantiateElements(elementDataArray, nodes, project, scope);

      // Phase 5: Create and register the circuit
      const circuit = new Circuit(scope.id, scope.name, elements);
      project.addCircuit(circuit);

      this.log(LogLevel.INFO, `Successfully loaded circuit '${scope.name}' with ${elements.length} element(s)`);
    }

    return project;
  }

  /**
   * Create CircuitBus objects for all nodes in a scope.
   * 
   * @param scope - CircuitVerse scope data
   * @returns Array of CircuitBus objects indexed by node ID
   */
  private createBuses(scope: any): CircuitBus[] {
    const nodes: CircuitBus[] = [];

    for (let nodeInd = 0; nodeInd < scope.allNodes.length; nodeInd++) {
      const scopeNode = scope.allNodes[nodeInd];
      const node = new CircuitBus(scopeNode.bitWidth);
      nodes.push(node);

      this.log(
        LogLevel.TRACE,
        `Created bus ${nodeInd} with width ${scopeNode.bitWidth}`,
      );
    }

    return nodes;
  }

  /**
   * Connect all buses according to the connection data in the scope.
   * 
   * @param scope - CircuitVerse scope data
   * @param nodes - Array of CircuitBus objects to connect
   */
  private connectBuses(scope: any, nodes: CircuitBus[]): void {
    for (let nodeInd = 0; nodeInd < scope.allNodes.length; nodeInd++) {
      const scopeNode = scope.allNodes[nodeInd];

      for (const connectInd in scopeNode.connections) {
        const targetInd = scopeNode.connections[connectInd];
        nodes[nodeInd].connect(nodes[targetInd]);

        this.log(
          LogLevel.TRACE,
          `Connected bus ${nodeInd} => ${targetInd}`,
        );
      }
    }
  }

  /**
   * Collect all functional circuit elements from a scope.
   * 
   * CircuitVerse stores elements as arrays keyed by their type name.
   * This method filters out non-element keys and flattens all element arrays.
   * 
   * @param scope - CircuitVerse scope data
   * @returns Array of element data objects with objectType and index properties added
   */
  private collectElements(scope: any): any[] {
    this.log(LogLevel.TRACE, "Collecting circuit elements from scope...");

    const elementArray = Object.keys(scope)
      .filter((key) => !CircuitVerseLoader.NON_ELEMENT_KEYS.includes(key))
      .flatMap((elementType) =>
        scope[elementType].map((elementData: any, index: number) => {
          // Add metadata to help with debugging and error messages
          elementData.objectType = elementType;
          elementData.index = index;
          return elementData;
        }),
      );

    this.log(LogLevel.TRACE, `Found ${elementArray.length} element(s) to instantiate`);
    return elementArray;
  }

  /**
   * Instantiate circuit elements from their data representations.
   * 
   * @param elementDataArray - Array of element data objects
   * @param nodes - Array of CircuitBus objects for wiring
   * @param project - CircuitProject for subcircuit references
   * @param scope - Current scope (for error messages)
   * @returns Array of instantiated CircuitElement objects
   * @throws Error if an unsupported element type is encountered
   */
  private instantiateElements(
    elementDataArray: any[],
    nodes: CircuitBus[],
    project: CircuitProject,
    scope: any,
  ): CircuitElement[] {
    const elements: CircuitElement[] = [];

    for (const elementData of elementDataArray) {
      const type = elementData.objectType;

      this.log(
        LogLevel.TRACE,
        `Creating element of type '${type}' (label: '${elementData.label || 'unlabeled'}')`,
      );

      // Check if we have a factory for this element type
      const factory = createElement[type];
      if (!factory) {
        throw new Error(
          `Circuit '${scope.name}' (${scope.id}) uses unsupported element type: ${type}. ` +
          `To add support, create a factory function in the createElement map.`,
        );
      }

      // Create the element using its factory function
      const newElement = factory({
        project: project,
        nodes: nodes,
        data: elementData,
      })
        .setLabel(elementData.label)
        .setPropagationDelay(elementData.propagationDelay ?? 0);

      elements.push(newElement);
    }

    return elements;
  }
}
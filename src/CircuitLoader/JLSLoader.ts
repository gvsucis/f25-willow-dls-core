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

function genSplit(data: {
  type: string;
  props: Record<string, string[]>;
  subcircuit?: Circuit;
}): number[] {
  const pairs = data.props["pair"];

  // Parsing formats
  // 1. New format (ranges): "0:3", "4:7" where numbers represent bit ranges
  // 2. Old format (mapping): "0:0", "1:1", "2:2" where first number is output index

  const parsedPairs = pairs.map((s) => s.split(":").map((n) => parseInt(n)));

  // Detecting format
  // - All pairs have start <= end (ranges) forming groups
  // Old format would have many pairs with the same first number (output index)
  const isNewFormat = parsedPairs.length > 1 && parsedPairs.every(([start, end]) => {
    const width = end - start;
    return width >= 0 && width <= 15; // Range format has reasonable widths
  });

  // Detecting old format
  const firstNumbers = parsedPairs.map(p => p[0]);
  const hasDuplicates = firstNumbers.length !== new Set(firstNumbers).size;

  if (isNewFormat && !hasDuplicates) {
    // New format: each pair represents a bit range [start:end]
    return parsedPairs.map(([start, end]) => end - start + 1);
  } else {
    // Old format: pairs are "output_index:bit_index"
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

// Helper function to get wire width for a splitter output in new format
// Returns the width of the output at the given index
function getSplitterOutputWidth(data: {
  type: string;
  props: Record<string, string[]>;
}, outputIndex: number): number {
  const pairs = data.props["pair"];
  const parsedPairs = pairs.map((s) => s.split(":").map((n) => parseInt(n)));

  // Check if new format
  const firstNumbers = parsedPairs.map(p => p[0]);
  const hasDuplicates = firstNumbers.length !== new Set(firstNumbers).size;
  const isNewFormat = parsedPairs.length > 1 &&
    parsedPairs.every(([start, end]) => end - start >= 0 && end - start <= 15) &&
    !hasDuplicates;

  if (isNewFormat && outputIndex < parsedPairs.length) {
    // New format: return the width of the specified pair
    const [start, end] = parsedPairs[outputIndex];
    return end - start + 1;
  }

  // For old format or invalid index, return 1 as fallback
  return 1;
}

const createElement: Record<
  string,
  (
    data: {
      type: string;
      props: Record<string, string[]>;
      subcircuit?: Circuit;
    },
    inputs: CircuitBus[],
    outputs: CircuitBus[],
    loader: CircuitLoader,
  ) => CircuitElement
> = {
  // We hard-code 0 indices for all inputs and outputs for now, but the parser will update these as necessary
  // for subcircuits so that is okay.
  InputPin: (data, inputs, outputs) =>
    new Input(0, data.props["name"][0] ?? "", outputs),
  OutputPin: (data, inputs, outputs) =>
    new Output(0, data.props["name"][0] ?? "", inputs[0]),
  // data.subcircuit will always be set here because the parser ensures it, so the cast is safe.
  SubCircuit: (data, inputs, outputs) =>
    new SubCircuit(data.subcircuit as Circuit, inputs, outputs),

  // Gates
  AndGate: (data, inputs, outputs) => new AndGate(inputs, outputs),
  XorGate: (data, inputs, outputs) => new XorGate(inputs, outputs),
  OrGate: (data, inputs, outputs) => new OrGate(inputs, outputs),
  NorGate: (data, inputs, outputs) => new NorGate(inputs, outputs),
  NandGate: (data, inputs, outputs) => new NandGate(inputs, outputs),
  NotGate: (data, inputs, outputs) => new NotGate(inputs, outputs),
  DelayGate: (data, inputs, outputs) => new BufferGate(inputs, outputs),

  // Other elements
  Constant: (data, inputs, outputs) => {
    // Apparently the base is not used to convert the number,
    // it is only used for displaying. Regardless of the base,
    // the number is stored as base 10 in the file.
    // const base = parseInt(data.props["base"][0]);
    const base = 10;
    const value = parseInt(data.props["value"][0], base);
    const binStr = value.toString(2);

    return new Constant(outputs[0], new BitString(binStr));
  },
  Clock: (data, inputs, outputs) => new Clock(outputs[0]),
  Adder: (data, inputs, outputs) =>
    new Adder(inputs[0], inputs[1], inputs[2], outputs[1], outputs[0]),
  Decoder: (data, inputs, outputs) => new Decoder(inputs[0], outputs),
  TriState: (data, inputs, outputs) =>
    new TriState(inputs[1], inputs[0], outputs[0]),
  Mux: (data, inputs, outputs) => {
    const select = inputs.pop();

    if (!select) {
      throw new Error("Mux inputs array is empty.");
    }

    return new Multiplexer(inputs, outputs, select);
  },
  Extend: (data, inputs, outputs) => new Extend(inputs[0], outputs),

  // Splitter and Binder are two separate elements in JLS, but are implemented
  // in a single element for CircuitVerse.
  Splitter: (data, inputs, outputs) =>
    new Splitter(genSplit(data), inputs[0], outputs),
  Binder: (data, inputs, outputs) =>
    new Splitter(genSplit(data), outputs[0], inputs),

  Memory: (data, inputs, outputs, loader) => {
    if (data.props["file"][0] != "") {
      // This is a security feature. We don't want to be reading arbitrary files off
      // the disk like JLS does.
      throw new Error(
        'Unable to initialize JLS memory from external file. Make sure all memory is initialized using the "built-in" editor instead of reading from a file.',
      );
    }

    const bits = parseInt(data.props["bits"][0]);
    const cap = parseInt(data.props["cap"][0]);

    let initialData = Array(cap).fill(BitString.low(bits));

    if (data.props["init"][0]) {
      loader.log(
        LogLevel.TRACE,
        `RAM has initial data: '${data.props["init"][0]}'.`,
      );

      const parsedInit = data.props["init"][0]
        .split("\\n")
        .map((line) => line.split(" "))
        .map(([addr, data]) => [parseInt(addr, 16), parseInt(data, 16)])
        .map(([addr, data]) => [addr, new BitString(data.toString(2), bits)]);

      parsedInit.forEach(([addr, data]) => {
        if ((addr as number) >= initialData.length) {
          throw new Error(
            `Address '${addr}' out of bounds for memory with capacity of '${initialData.length}'.`,
          );
        }
        initialData[addr as number] = data;
      });

      loader.log(
        LogLevel.TRACE,
        `Full contents of RAM: ${initialData.map((b) => b.toString())}`,
      );
      initialData = Array(cap).fill(BitString.low(bits));
    }

    if (inputs.length == 3) {
      // This is a ROM, it doesn't have an input or a write enable bus,
      // so we just make a dummy bus with no connections and pass it in.
      return new JLSRAM(
        inputs[0],
        new CircuitBus(0),
        outputs[0],
        inputs[2],
        inputs[1],
        new CircuitBus(0),
        cap,
        bits,
        initialData,
      );
    } else if (inputs.length == 5) {
      return new JLSRAM(
        inputs[0],
        inputs[2],
        outputs[0],
        inputs[3],
        inputs[1],
        inputs[4],
        cap,
        bits,
        initialData,
      );
    } else {
      throw new Error(
        "Sanity check failed: Unable to detect RAM or ROM. Make sure all wires are connected to all memory elements.",
      );
    }
  },
  Register: (data, inputs, outputs) => {
    if (!["pff", "nff"].includes(data.props["type"][0])) {
      throw new Error(
        `Unrecogized or unsupported register type: '${data.props["type"][0]}'.`,
      );
    }
    return new JLSRegister(
      inputs[0],
      inputs[1],
      outputs[1],
      outputs[0],
      data.props["type"][0] as "pff" | "nff",
    );
  },
  Stop: (data, inputs, outputs) => new Stop(inputs),
};

/**
 * A circuit loader that loads JLS `.jls` circuit files.
 */
export class JLSLoader extends CircuitLoader {
  constructor() {
    super("JLSCircuitLoader");
  }

  #expect(toBe: string | RegExp, token?: string, msg?: string): string {
    msg ??= `Parse Error: Got token '${token}', expected ${toBe}.`;

    if (
      !token ||
      (toBe instanceof RegExp && !toBe.test(token)) ||
      (typeof toBe == "string" && token != toBe)
    ) {
      this.log(LogLevel.FATAL, msg);
      throw new Error(msg);
    }

    return token;
  }

  #parseCircuit(project: CircuitProject, tokens: string[]): Circuit {
    this.#expect("CIRCUIT", tokens.shift());

    const name = this.#expect(/[a-zA-Z0-9]+/, tokens.shift());

    // These elements have no functionality for us, so we simply discard them
    // after we parse them out of the file.
    const ignoreElements = ["SigGen", "Text", "Display"];

    const parsedElements: {
      type: string;
      props: Record<string, string[]>;
      subcircuit?: Circuit;
    }[] = [];
    while (tokens.length && tokens[0] != "ENDCIRCUIT") {
      const e = this.#parseElement(project, tokens);
      if (ignoreElements.includes(e.type)) {
        continue;
      }
      parsedElements.push(e);
    }

    this.#expect("ENDCIRCUIT", tokens.shift());

    const parsedWires = parsedElements.filter((e) => e.type == "WireEnd");
    // Elements are sorted by ID so they get a consistent index.
    const noWires = parsedElements
      .filter((e) => e.type != "WireEnd")
      .sort((a, b) => a.props["id"][0].localeCompare(b.props["id"][0]));

    // This block creates all the wires for the circuit, excluding subcircuits.
    const wires: Record<string, CircuitBus> = {};
    for (const parsedElement of noWires) {
      const id = parsedElement.props["id"][0];

      const directConnections = parsedWires.filter((w) =>
        (w.props["attach"] ?? []).includes(id),
      );
      const connectedWires = this.#getWireDependencies(
        parsedWires,
        directConnections,
      );

      let width: number;
      let inputs: Record<string, Input> | undefined;
      let outputs: Record<string, Output> | undefined;
      let split: boolean = false;

      if (
        parsedElement.props["bits"] &&
        !["Splitter", "Binder"].includes(parsedElement.type)
      ) {
        width = parseInt(parsedElement.props["bits"][0]);
      } else {
        switch (parsedElement.type) {
          case "Clock":
            width = 1;
            break;
          case "Constant":
            // Constants don't have a width, they just have a value. This will grab the
            // minimum width a bus needs to be to accomodate that value.
            const base = parseInt(parsedElement.props["base"][0]);
            const value = parseInt(parsedElement.props["value"][0], base);
            width = value.toString(2).length;
            break;
          case "Splitter":
          case "Binder":
            width = -1;
            split = true;
            break;
          case "SubCircuit":
            // If we don't have a width, this element is a subcircuit. We need to extract
            // the width of the child input pin in the subcircuit to which any given wire is "put".
            // Since we don't know what that is in advance, we use a sentinel value and also fetch the
            // inputs and outputs, which will be used when the sentinel is matched for each connected
            // wire in the loop below.
            width = -1;
            if (!parsedElement.subcircuit) {
              throw new Error(
                `Sanity check failed: Found a SubCircuit ELEMENT without nested CIRCUIT.`,
              );
            }

            inputs = parsedElement.subcircuit.getInputs();
            outputs = parsedElement.subcircuit.getOutputs();
            break;
          case "Stop":
            width = 1;
            break;
          default:
            throw new Error(
              `Sanity check failed: Found element of type ${parsedElement.type} without a 'bits' property.`,
            );
        }
      }

      for (const connectedWire of connectedWires) {
        if (wires[connectedWire.props["id"][0]]) {
          if (wires[connectedWire.props["id"][0]].getWidth() != width) {
            wires[connectedWire.props["id"][0]].setWidth(
              Math.max(width, wires[connectedWire.props["id"][0]].getWidth()),
            );
          }
          continue;
        }

        let wireWidth = width;
        // No wire width, locate the matching wire in the subcircuit.
        if (wireWidth == -1) {
          // console.log(JSON.stringify(connectedWire));

          if (!connectedWire.props["put"]) {
            // We can't create the wire using this subcircuit. It should get created
            // another time around thanks to getWireDependencies(), which results in us processing
            // wires lots of times.
            continue;
          }

          const put = connectedWire.props["put"][0];

          if (inputs && outputs) {
            if (inputs[put]) {
              wireWidth = inputs[put].getOutputs()[0].getWidth();
            } else if (outputs[put]) {
              wireWidth = outputs[put].getInputs()[0].getWidth();
            } else {
              // We can't create the wire using this subcircuit. It should get created
              // another time around thanks to getWireDependencies(), which results in us processing
              // wires lots of times.
              continue;
            }
          }

          if (split) {
            // Determine which split this wire belongs to, and how wide it is.
            if (["input", "output"].includes(put)) {
              wireWidth = parseInt(parsedElement.props["bits"][0]);
            } else {
              // Check if put is a numeric index (new format) or a range (old format)
              const parsedPut = put.split("-");
              if (parsedPut.length > 1) {
                // Old format: "11-8" means bits 11 down to 8
                wireWidth = parseInt(parsedPut[0]) - parseInt(parsedPut[1]) + 1;
              } else if (/^[0-9]+$/.test(put)) {
                // New format: numeric index, look up width from pairs
                const outputIndex = parseInt(put);
                wireWidth = getSplitterOutputWidth(parsedElement, outputIndex);
                this.log(
                  LogLevel.TRACE,
                  `New format splitter: outputIndex=${outputIndex}, wireWidth=${wireWidth}, pairs=${JSON.stringify(parsedElement.props["pair"])}`,
                );
              } else {
                // Fallback for other cases (named wires)
                wireWidth = 1;
              }
              this.log(
                LogLevel.TRACE,
                `Wire connected to splitter: put = ${put} -> ${wireWidth}`,
              );
            }
          }
        }

        wires[connectedWire.props["id"][0]] = new CircuitBus(wireWidth);
      }
    }

    // There may be some intermediate wires left over that have yet to be instantiated
    // because they aren't directly connected to any elements (only other wires). Locate
    // those and instantiate them based on what they are connected to, interatively
    // until we have connected everything.
    //
    // This seems like it could loop forever for malformed inputs, but any valid JLS
    // save should work properly with this.
    while (parsedWires.length != Object.values(wires).length) {
      for (const parsedWire of parsedWires) {
        const id = parsedWire.props["id"][0];
        const connectedTo = parsedWire.props["wire"];
        for (const connectedId of connectedTo) {
          if (wires[connectedId]) {
            wires[id] = new CircuitBus(wires[connectedId].getWidth());
            break;
          }
        }
      }
    }

    // Now that we have all the wires, connect them together.
    for (const parsedWire of parsedWires) {
      const id = parsedWire.props["id"][0];
      const attach = parsedWire.props["wire"];

      attach.forEach((attachedWire) => {
        wires[id].connect(wires[attachedWire]);
        this.log(
          LogLevel.TRACE,
          `Connecting wire: [id = ${wires[id].getId()}, width = ${wires[id].getWidth()}, JLS = ${id}] => [id = ${wires[attachedWire].getId()}, width = ${wires[attachedWire].getWidth()}, JLS = ${attachedWire}]`,
        );
      });
    }

    const overrideWidths: Record<string, number> = {
      C: 1,
      WE: 1,
      OE: 1,
      CS: 1,
      Cin: 1,
      Cout: 1,
    };

    const ramElements = noWires.filter((e) => e.type == "Memory");
    ramElements.forEach((ram) => {
      const addrWire = parsedWires.filter(
        (w) =>
          w.props["put"] &&
          w.props["put"][0] == "address" &&
          w.props["attach"][0] == ram.props["id"][0],
      )[0];
      const capacity = parseInt(ram.props["cap"][0]);

      const currentWidth = wires[addrWire.props["id"][0]].getWidth();
      const newWidth = Math.ceil(Math.log2(capacity));

      this.log(
        LogLevel.TRACE,
        `Found address wire: ${addrWire.props["id"][0]}. Correcting width: ${currentWidth} => ${newWidth}`,
      );

      wires[addrWire.props["id"][0]].setWidth(newWidth);
    });

    const splitterWires = parsedWires.filter(
      (w) => w.props["put"] && /^[0-9]+(-[0-9]+)?$/.test(w.props["put"][0]),
    );
    splitterWires.forEach((w) => {
      const label = w.props["put"][0];
      const id = w.props["id"][0];

      const [s, e] = label.split("-").map((i) => parseInt(i));
      let newWidth: number;
      if (e != undefined) {
        // Old format: range notation like "11-8"
        newWidth = s - e + 1;
      } else {
        // New format: numeric index, need to find the splitter element
        const attachedElementId = w.props["attach"][0];
        const splitterElement = noWires.find(
          (el) =>
            el.props["id"][0] === attachedElementId &&
            (el.type === "Splitter" || el.type === "Binder"),
        );
        if (splitterElement) {
          const outputIndex = parseInt(label);
          newWidth = getSplitterOutputWidth(splitterElement, outputIndex);
          this.log(
            LogLevel.TRACE,
            `New format splitter/binder wire: element=${attachedElementId}, outputIndex=${outputIndex}, pairs=${JSON.stringify(splitterElement.props["pair"])}`,
          );
        } else {
          // Fallback to 1 if we can't find the splitter
          newWidth = 1;
        }
      }
      overrideWidths[label] = newWidth;
      this.log(
        LogLevel.TRACE,
        `Found splitter/binder wire: ${w.props["id"][0]}. Computing width: ${wires[w.props["id"][0]].getWidth()} => ${newWidth}`,
      );
    });

    parsedWires.forEach((w) => {
      if (!w.props["put"]) {
        return;
      }

      const label = w.props["put"][0];
      const id = w.props["id"][0];

      if (overrideWidths[label]) {
        this.log(
          LogLevel.TRACE,
          `Updated wire [label = '${label}', id = ${id}]: ${wires[id].getWidth()} => ${overrideWidths[label]}`,
        );
        wires[id].setWidth(overrideWidths[label]);
      }
    });

    // Final pass: Ensure all connected wires have consistent widths by propagating
    // the maximum width through each connected group. This fixes cases where wires
    // are connected across subcircuits with incompatible widths.
    const visited = new Set<string>();
    const propagateMaxWidth = (bus: CircuitBus, maxWidth: number): number => {
      const busId = bus.getId();
      if (visited.has(busId)) {
        return maxWidth;
      }
      visited.add(busId);

      // Track the maximum width in this connected group
      maxWidth = Math.max(maxWidth, bus.getWidth());

      // Recursively check all connected buses
      for (const connected of bus.getConnections()) {
        maxWidth = propagateMaxWidth(connected, maxWidth);
      }

      return maxWidth;
    };

    // For each wire, find the maximum width in its connected group and apply it
    for (const wire of Object.values(wires)) {
      visited.clear();
      const maxWidth = propagateMaxWidth(wire, 0);
      if (maxWidth > wire.getWidth()) {
        this.log(
          LogLevel.TRACE,
          `Propagating max width to connected group: [id = ${wire.getId()}]: ${wire.getWidth()} => ${maxWidth}`,
        );
        wire.setWidth(maxWidth);
      }
    }

    // All wires are connected, now create the elements and attach them to their
    // buses.
    const elements: CircuitElement[] = [];
    for (const parsedElement of noWires) {
      const id = parsedElement.props["id"][0];
      // Some elements store their delay in the "delay" prop, while others (memory)
      // store their delay in the "time" prop.
      const delay = parseInt(
        (parsedElement.props["delay"] ??
          parsedElement.props["time"] ?? ["0"])[0],
      );

      const connectedWires = parsedWires
        .filter((w) => (w.props["attach"] ?? []).includes(id))
        // Sort connected wires by their put so the ordering is deterministic.
        // Needed for "built-in" subcircuits such as the Adder.
        .sort((a, b) => a.props["put"][0].localeCompare(b.props["put"][0]));

      if (parsedElement.type != "SubCircuit") {
        // JLS has some elements whose inputs and outputs have fixed names that
        // don't match the pattern of 'inputX' and 'outputX' like we assume by
        // default. Since each case is different, we have a map that gives us the
        // "put" values of the inputs and outputs.
        const hardcodedElements: Record<string, string[][]> = {
          // Type: [Inputs, Outputs]
          Adder: [
            ["A", "B", "Cin"],
            ["S", "Cout"],
          ],
          TriState: [["control"], []],
          Mux: [["select"], []],
          Memory: [["WE", "OE", "CS", "address"], []],
          Register: [
            ["D", "C"],
            ["Q", "notQ"],
          ],
        };

        let parsedInputWires: {
          type: string;
          props: Record<string, string[]>;
          subcircuit?: Circuit;
        }[] = [];
        let parsedOutputWires: {
          type: string;
          props: Record<string, string[]>;
          subcircuit?: Circuit;
        }[] = [];

        if (hardcodedElements[parsedElement.type]) {
          // The element has custom "put" names, make sure to grab those.
          const inPuts = hardcodedElements[parsedElement.type][0];
          const outPuts = hardcodedElements[parsedElement.type][1];
          parsedInputWires = connectedWires.filter((w) =>
            inPuts.includes(w.props["put"][0]),
          );
          parsedOutputWires = connectedWires.filter((w) =>
            outPuts.includes(w.props["put"][0]),
          );
        }

        // Oh, Splitter... the pain you have caused...
        // Why must you be so miserable to work with?
        //
        // This logic exists because the 'put' values for these elements is not deterministic at
        // all. The put values are the names of the wire pairs being bound, which could probably
        // be computed but that would be a little overkill. Instead, just grab all the wires that
        // aren't the terminating end of the element
        if (parsedElement.type == "Splitter") {
          parsedOutputWires = connectedWires.filter(
            (w) => w.props["put"][0] != "input",
          );
        }

        if (parsedElement.type == "Binder") {
          parsedInputWires = connectedWires.filter(
            (w) => w.props["put"][0] != "output",
          );
        }

        // Assume the default behavior of inputX and outputX put values. Some elements will have both
        // hard coded puts and the default naming behavior.
        parsedInputWires = [
          ...parsedInputWires,
          ...connectedWires.filter((w) =>
            w.props["put"][0].startsWith("input"),
          ),
        ];
        parsedOutputWires = [
          ...parsedOutputWires,
          ...connectedWires.filter((w) =>
            w.props["put"][0].startsWith("output"),
          ),
        ];

        // Sort inputs by their 'put'. JLS increments a number at then end of the put string which corresponds
        // to the index that the input connects to. For elements that have custom
        // put values, this ensures that they are provided in a deterministic order
        // for all circuits.
        const inputWires = parsedInputWires.sort((a, b) =>
          a.props["put"][0].localeCompare(b.props["put"][0]),
        );
        const inputIds = inputWires.map((i) => i.props["id"][0]);
        const inputs = inputIds.map((i) => wires[i]);

        const outputWires = parsedOutputWires.sort((a, b) =>
          a.props["put"][0].localeCompare(b.props["put"][0]),
        );
        const outputIds = outputWires.map((i) => i.props["id"][0]);
        const outputs = outputIds.map((i) => wires[i]);

        if (!createElement[parsedElement.type]) {
          throw new Error(`Unsupported element of type: ${parsedElement.type}`);
        }

        this.log(LogLevel.TRACE, `Creating element: ${parsedElement.type}`);
        const element = createElement[parsedElement.type](
          parsedElement,
          inputs,
          outputs,
          this,
        );

        element
          .setLabel((parsedElement.props["name"] ?? [""])[0])
          .setPropagationDelay(delay);

        [...inputs, ...outputs].forEach((w) => {
          w.connectElement(element);
          this.log(LogLevel.TRACE, `  => Attach to wire: ${w.getId()}`);
        });

        // inputs.forEach((input) => input.connectElement(element));
        // outputs.forEach((output) => output.connectElement(element));

        elements.push(element);
      } else {
        // The element is a subcircuit. It requires special treatment to configure the connections.
        // Unfortunately, our subcircuit design is best suited to CircuitVerse, which means it uses
        // index-based input feeding, while JLS uses the far superior label-based feeding. This
        // block exists solely to normalize the subcircuit's input indices to match what we pass in
        // for the inputs array to the subcircuit element just to make sure everything works out
        // properly.

        if (!parsedElement.subcircuit) {
          throw new Error(
            `Sanity check failed; Subcircuit element doesn't have a CIRCUIT in it.`,
          );
        }

        const inputs = Object.values(parsedElement.subcircuit.getInputs());
        const outputs = Object.values(parsedElement.subcircuit.getOutputs());

        let inputId = 0;
        const inputWires: CircuitBus[] = [];
        for (const input of inputs) {
          input.setIndex(inputId);

          // Find the wire whose "put" matches this input.
          const putWire = connectedWires.filter((w) =>
            w.props["put"].includes(input.getLabel()),
          )[0].props["id"][0];
          inputWires.push(wires[putWire]);

          inputId++;
        }

        let outputId = 0;
        const outputWires: CircuitBus[] = [];
        for (const output of outputs) {
          output.setIndex(outputId);

          // Find the wire whose "put" matches this output.
          const putWire = connectedWires.filter((w) =>
            w.props["put"].includes(output.getLabel()),
          )[0].props["id"][0];
          outputWires.push(wires[putWire]);

          outputId++;
        }

        const element = createElement[parsedElement.type](
          parsedElement,
          inputWires,
          outputWires,
          this,
        );

        element
          .setLabel((parsedElement.props["name"] ?? [""])[0])
          .setPropagationDelay(delay);

        // Notify the wires. This handles both the inputs and the outputs.
        connectedWires
          .map((w) => wires[w.props["id"][0]])
          .forEach((w) => {
            this.log(LogLevel.TRACE, `  => Attach to wire: ${w.getId()}`);
            w.connectElement(element);
          });
        elements.push(element);
      }
    }

    // JLS circuits do not have unique IDs, so we just use the name instead.
    const circuit = new Circuit(name, name, elements);
    project.addCircuit(circuit);
    return circuit;
  }

  #getWireDependencies(
    allWires: { type: string; props: Record<string, string[]> }[],
    wires: { type: string; props: Record<string, string[]> }[],
  ): { type: string; props: Record<string, string[]> }[] {
    const deps: { type: string; props: Record<string, string[]> }[] = [];

    for (const wire of wires) {
      const connected = allWires.filter((w) =>
        w.props["wire"].includes(wire.props["id"][0]),
      );
      deps.push(
        ...connected.filter((c) => !deps.includes(c) && !wires.includes(c)),
      );
    }

    return deps.length
      ? this.#getWireDependencies(allWires, [...wires, ...deps])
      : wires;
  }

  #parseElement(
    project: CircuitProject,
    tokens: string[],
  ): { type: string; props: Record<string, string[]>; subcircuit?: Circuit } {
    this.#expect("ELEMENT", tokens.shift());

    const elementType = this.#expect(/[a-zA-Z0-9]*/, tokens.shift());

    const properties: Record<string, string[]> = {};
    let subcircuit;
    while (tokens.length && tokens[0] != "END") {
      if (tokens[0] == "CIRCUIT") {
        if (subcircuit) {
          throw new Error(
            `Sanity check failed: Multiple CIRCUITs found in a Subcircuit ELEMENT.`,
          );
        }
        subcircuit = this.#parseCircuit(project, tokens);
      } else {
        const prop = this.#parseProperty(tokens);
        if (!properties[prop.name]) {
          properties[prop.name] = [];
        }
        properties[prop.name].push(prop.value);
      }
    }

    this.#expect("END", tokens.shift());
    return {
      type: elementType,
      props: properties,
      subcircuit: subcircuit,
    };
  }

  #parseProperty(tokens: string[]): {
    type: string;
    name: string;
    value: string;
  } {
    let type = this.#expect(/([Ii]nt|String|ref|probe|pair)/, tokens.shift());

    let name = this.#expect(/[a-zA-Z0-9]*/, tokens.shift());
    let value = this.#expect(/(("?[a-zA-Z0-9]*"?)|([0-9]+))/, tokens.shift());

    if (type == "String") {
      while (!value.endsWith('"')) {
        value += " " + tokens.shift();
      }

      value = value.split('"')[1];
    }

    if (type == "pair") {
      value = `${name}:${value}`;
      name = type;
    }

    return {
      type: type,
      name: name,
      value: value,
    };
  }

  async load(stream: Stream): Promise<CircuitProject> {
    const project: CircuitProject = new CircuitProject();
    this.propagateLoggersTo(project);

    const data = await FileUtil.extractFromZip(stream, ["JLSCircuit"]).then(
      ([stream]) => FileUtil.readTextStream(stream),
    );

    this.log(LogLevel.TRACE, `JLSCircuit Data:\n${data}`);

    // Tokenize the input stream. JLS circuits have an unfortunate structure, but
    // at the very least, it is whitespace separated, so we can just chop the whole
    // thing into words and then process them one at a time.
    const tokens: string[] = data
      .split(/[\s+]/)
      .filter((token) => token.length > 0);

    while (tokens.length) {
      this.#parseCircuit(project, tokens);
    }

    return project;
  }
}

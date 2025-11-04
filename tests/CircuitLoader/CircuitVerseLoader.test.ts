import { test, expect, jest } from "@jest/globals";

import { CircuitVerseLoader } from "../../src/CircuitLoader/CircuitVerseLoader";
import { FileUtil } from "../../src/Util/File";

// Helper to build a minimal scope with nodes and given element arrays.
function makeScope(id: any, name: string, nodes: any[], elements: Record<string, any[]>) {
  const scope: any = {
    layout: {},
    verilogMetadata: {},
    allNodes: nodes,
    id,
    name,
    restrictedCircuitElementsUsed: [],
    nodes: [],
  };

  for (const k of Object.keys(elements)) {
    scope[k] = elements[k];
  }

  return scope;
}

test("CircuitVerseLoader creates a Splitter and splits an input across outputs", async () => {
  // Create three buses: input width 4, two outputs width 2 each.
  const nodes = [
    { bitWidth: 4, connections: [] },
    { bitWidth: 2, connections: [] },
    { bitWidth: 2, connections: [] },
  ];

  const input = {
    objectType: "Input",
    label: "in",
    propagationDelay: 0,
    index: 0,
    customData: { nodes: { output1: 0 }, constructorParamaters: ["RIGHT", 1, {}], values: { state: 1 } },
  };

  const splitter = {
    objectType: "Splitter",
    label: "",
    propagationDelay: 0,
    customData: {
      // constructorParamaters[2] holds the split array per loader implementation
      constructorParamaters: [null, null, [2, 2]],
      nodes: { inp1: 0, outputs: [1, 2] },
    },
  };

  const out1 = {
    objectType: "Output",
    label: "out1",
    propagationDelay: 0,
    customData: { nodes: { inp1: 1 }, constructorParamaters: ["LEFT", 1, {}] },
  };

  const out2 = {
    objectType: "Output",
    label: "out2",
    propagationDelay: 0,
    customData: { nodes: { inp1: 2 }, constructorParamaters: ["LEFT", 1, {}] },
  };

  const scope = makeScope(1, "split-test", nodes, {
    Input: [input],
    Splitter: [splitter],
    Output: [out1, out2],
  });

  const data = { scopes: [scope] };

  // Mock FileUtil.readJsonStream to return our crafted data regardless of stream
  const spy = jest.spyOn(FileUtil, "readJsonStream").mockResolvedValue(data as any);

  const loader = new CircuitVerseLoader();
  const project = await loader.load(null as any);

  // Run the circuit by fetching the first circuit and invoking run with a keyed input
  const circuit = project.getCircuits()[0];
  const result = circuit.run({ in: "1011" });

  // Outputs are returned keyed by label when using keyed inputs
  const outputs: any = result.outputs as Record<string, any>;

  const combined = outputs.out1.toString() + outputs.out2.toString();
  // Ensure the combined output contains the same bits as the input (same multiset of chars)
  expect(combined.length).toBe(4);
  const count = (s: string) => s.split("").reduce((m: any, c) => ((m[c] = (m[c] || 0) + 1), m), {});
  expect(count(combined)).toEqual(count("1011"));

  spy.mockRestore();
});

test("CircuitVerseLoader throws on unsupported element types", async () => {
  const nodes = [{ bitWidth: 1, connections: [] }];

  const bogus = {
    objectType: "NotARealThing",
    label: "bogus",
    propagationDelay: 0,
    customData: { nodes: { output1: 0 }, constructorParamaters: [] },
  };

  const scope = makeScope(2, "bad", nodes, { NotARealThing: [bogus] });
  const data = { scopes: [scope] };

  const spy = jest.spyOn(FileUtil, "readJsonStream").mockResolvedValue(data as any);

  const loader = new CircuitVerseLoader();

  await expect(loader.load(null as any)).rejects.toThrow(/unsupported element/);

  spy.mockRestore();
});

test("CircuitVerseLoader creates a ROM with initial data and returns correct output", async () => {
  const nodes = [
    { bitWidth: 4, connections: [] }, // addr
    { bitWidth: 8, connections: [] }, // dataOut
    { bitWidth: 1, connections: [] }, // enable
  ];

  const addrInput = {
    objectType: "Input",
    label: "addr",
    propagationDelay: 0,
    index: 0,
    customData: { nodes: { output1: 0 }, constructorParamaters: ["RIGHT", 1, {}], values: { state: 0 } },
  };

  const enInput = {
    objectType: "Input",
    label: "en",
    propagationDelay: 0,
    index: 1,
    customData: { nodes: { output1: 2 }, constructorParamaters: ["RIGHT", 1, {}], values: { state: 0 } },
  };

  const rom = {
    objectType: "Rom",
    label: "rom",
    propagationDelay: 0,
    customData: {
      nodes: { memAddr: 0, dataOut: 1, en: 2 },
      constructorParamaters: [["2", "3"], 0, 0],
    },
  };

  const out = {
    objectType: "Output",
    label: "out",
    propagationDelay: 0,
    customData: { nodes: { inp1: 1 }, constructorParamaters: ["LEFT", 1, {}] },
  };

  const scope = makeScope(10, "rom-test", nodes, { Input: [addrInput, enInput], Rom: [rom], Output: [out] });
  const data = { scopes: [scope] };

  const spy = jest.spyOn(FileUtil, "readJsonStream").mockResolvedValue(data as any);

  const loader = new CircuitVerseLoader();
  const project = await loader.load(null as any);
  const circuit = project.getCircuits()[0];

  // Address 1 should yield the second byte ("3" => 00000011)
  const result = circuit.run({ addr: "0001", en: "1" });
  const outputs: any = result.outputs as Record<string, any>;

  expect(outputs.out.toString()).toBe(new (require("../../src/BitString").BitString)(parseInt("3").toString(2), 8).toString());

  spy.mockRestore();
});

test("CircuitVerseLoader creates an EEPROM with initial data", async () => {
  const nodes = [
    { bitWidth: 8, connections: [] }, // dataIn
    { bitWidth: 8, connections: [] }, // dataOut
    { bitWidth: 8, connections: [] }, // address
    { bitWidth: 1, connections: [] }, // write
    { bitWidth: 1, connections: [] }, // reset
  ];

  const dataIn = {
    objectType: "Input",
    label: "din",
    propagationDelay: 0,
    index: 0,
    customData: { nodes: { output1: 0 }, constructorParamaters: ["RIGHT", 8, {}], values: { state: 0 } },
  };

  const addr = {
    objectType: "Input",
    label: "addr",
    propagationDelay: 0,
    index: 1,
    customData: { nodes: { output1: 2 }, constructorParamaters: ["RIGHT", 8, {}], values: { state: 0 } },
  };

  const eeprom = {
    objectType: "EEPROM",
    label: "ee",
    propagationDelay: 0,
    customData: {
      nodes: { address: 2, write: 3, reset: 4, dataOut: 1 },
      data: { dataIn: 0 },
      constructorParamaters: [null, 8, null, ["0", "9"]],
    },
  };

  const out = {
    objectType: "Output",
    label: "out",
    propagationDelay: 0,
    customData: { nodes: { inp1: 1 }, constructorParamaters: ["LEFT", 8, {}] },
  };

  const scope = makeScope(11, "eeprom-test", nodes, { Input: [dataIn, addr], EEPROM: [eeprom], Output: [out] });
  const data = { scopes: [scope] };

  const spy = jest.spyOn(FileUtil, "readJsonStream").mockResolvedValue(data as any);

  const loader = new CircuitVerseLoader();
  const project = await loader.load(null as any);
  const circuit = project.getCircuits()[0];

  // The EEPROM initial data contains a single byte "9" -> 00001001
  const result = circuit.run({ addr: "00000001", din: "00000000" });
  const outputs: any = result.outputs as Record<string, any>;
  expect(outputs.out.toString()).toBe(new (require("../../src/BitString").BitString)(parseInt("9").toString(2), 8).toString());

  spy.mockRestore();
});

test("CircuitVerseLoader links SubCircuit to its referenced scope", async () => {
  // Child scope: a simple buffer from node 0 -> node 1
  const childNodes = [{ bitWidth: 1, connections: [] }, { bitWidth: 1, connections: [] }];
  const childInput = {
    objectType: "Input",
    label: "c_in",
    propagationDelay: 0,
    index: 0,
    customData: { nodes: { output1: 0 }, constructorParamaters: ["RIGHT", 1, {}], values: { state: 0 } },
  };
  const buffer = {
    objectType: "Buffer",
    label: "",
    propagationDelay: 0,
    customData: { nodes: { inp1: 0, output1: 1 }, constructorParamaters: ["RIGHT", 1, {}] },
  };
  const childOutput = {
    objectType: "Output",
    label: "c_out",
    propagationDelay: 0,
    customData: { nodes: { inp1: 1 }, constructorParamaters: ["LEFT", 1, {}] },
  };

  const childScope = makeScope(100, "child", childNodes, { Input: [childInput], Buffer: [buffer], Output: [childOutput] });

  // Parent scope: has an input connected to subcircuit input and an output from subcircuit output
  const parentNodes = [{ bitWidth: 1, connections: [] }, { bitWidth: 1, connections: [] }];
  const parentInput = {
    objectType: "Input",
    label: "p_in",
    propagationDelay: 0,
    index: 0,
    customData: { nodes: { output1: 0 }, constructorParamaters: ["RIGHT", 1, {}], values: { state: 0 } },
  };
  const subc = {
    objectType: "SubCircuit",
    id: 100,
    inputNodes: [0],
    outputNodes: [1],
  };
  const parentOutput = {
    objectType: "Output",
    label: "p_out",
    propagationDelay: 0,
    customData: { nodes: { inp1: 1 }, constructorParamaters: ["LEFT", 1, {}] },
  };

  const parentScope = makeScope(101, "parent", parentNodes, { Input: [parentInput], SubCircuit: [subc], Output: [parentOutput] });

  const data = { scopes: [childScope, parentScope] };
  const spy = jest.spyOn(FileUtil, "readJsonStream").mockResolvedValue(data as any);

  const loader = new CircuitVerseLoader();
  const project = await loader.load(null as any);
  const parent = project.getCircuitByName("parent");

  const result = parent.run({ p_in: "1" });
  const outputs: any = result.outputs as Record<string, any>;
  expect(outputs.p_out.toString()).toBe("1");

  spy.mockRestore();
});

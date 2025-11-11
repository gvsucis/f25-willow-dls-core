import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/Mux.hdl",
    "Mux",
  );
});

const truthTable = [
  ["000", "0"],
  ["001", "1"],
  ["010", "0"],
  ["011", "1"],
  ["100", "0"],
  ["101", "0"],
  ["110", "1"],
  ["111", "1"],
];

function genTest(inputs: { a: string; b: string; sel: string }, output: string) {
  return () => {
    const actualOutputs = circuit.run(inputs).outputs;
    expect(actualOutputs.out.toString()).toStrictEqual(output);
  };
}

for (const row of truthTable) {
  const inputs = {
    a: row[0][0],
    b: row[0][1],
    sel: row[0][2],
  };
  const output = row[1];

  test(
    `N2T Mux [a = ${inputs.a}, b = ${inputs.b}, sel = ${inputs.sel}] => [out = ${output}]`,
    genTest(inputs, output),
  );
}

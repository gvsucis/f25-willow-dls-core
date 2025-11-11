import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/Dmux.hdl",
    "DMux",
  );
});

const truthTable = [
  ["00", "00"],
  ["01", "10"],
  ["10", "00"],
  ["11", "01"],
];

function genTest(inputs: { in: string; sel: string }, outputs: { a: string; b: string }) {
  return () => {
    const actualOutputs = circuit.run(inputs).outputs;
    expect(actualOutputs.a.toString()).toStrictEqual(outputs.a);
    expect(actualOutputs.b.toString()).toStrictEqual(outputs.b);
  };
}

for (const row of truthTable) {
  const inputs = {
    in: row[0][0],
    sel: row[0][1],
  };

  const outputs = {
    a: row[1][0],
    b: row[1][1],
  };

  test(
    `N2T DMux [in = ${inputs.in}, sel = ${inputs.sel}] => [a = ${outputs.a}, b = ${outputs.b}]`,
    genTest(inputs, outputs),
  );
}

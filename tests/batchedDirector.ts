// CPU-only hook harness: the real director code, with setState deferred until
// flush(). It exercises updater batching, not browser events or React effects.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import type { Director } from '../director/useDirector';

export function batchedDirector() {
  const slots: any[] = [];
  const pending: (() => void)[] = [];
  let cursor = 0;
  const react = {
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (value: any) =>
          pending.push(() => {
            slots[index] =
              typeof value === 'function' ? value(slots[index]) : value;
          }),
      ];
    },
    useRef(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect() {},
  };
  const modules = new Map<string, { exports: any }>();
  function load(filename: string): any {
    filename = path.resolve(filename);
    if (modules.has(filename)) return modules.get(filename)!.exports;
    const module = { exports: {} as any };
    modules.set(filename, module);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const requireLocal = (name: string) => {
      if (name === 'react') return react;
      if (!name.startsWith('.'))
        throw new Error(`Unexpected hook dependency: ${name}`);
      return load(
        path.resolve(
          path.dirname(filename),
          name.endsWith('.ts') ? name : `${name}.ts`,
        ),
      );
    };
    const execute = vm.runInNewContext(
      `(function(require, module, exports) { ${output}\n })`,
      {
        structuredClone,
        crypto,
        setTimeout,
        clearTimeout,
      },
    );
    execute(requireLocal, module, module.exports);
    return module.exports;
  }
  const { useDirector } = load(
    fileURLToPath(new URL('../director/useDirector.ts', import.meta.url)),
  );
  return {
    render(): Director {
      cursor = 0;
      return useDirector();
    },
    flush() {
      while (pending.length) pending.shift()!();
    },
  };
}

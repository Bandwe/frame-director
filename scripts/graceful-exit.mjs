// vinext beta.5 forces process.exit(0) while Windows native Vite handles are
// still closing (UV_HANDLE_CLOSING assertion). Let successful builds drain.
// Nonzero exits retain their original failure semantics; no errors are hidden.
const exit = process.exit.bind(process);
process.exit = (code = 0) => {
  if (Number(code) !== 0) return exit(code);
  process.exitCode = 0;
};

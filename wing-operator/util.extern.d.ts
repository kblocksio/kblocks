export default interface extern {
  docker: (args: (readonly (string)[]), cwd?: (string) | undefined) => string,
  makeExecutable: (path: string) => void,
}

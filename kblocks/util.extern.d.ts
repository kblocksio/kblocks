export default interface extern {
  copy: (src: string, dest: string) => void,
  docker: (args: (readonly (string)[]), cwd?: (string) | undefined) => string,
  generateSchemaFromWingStruct: (source: string, structName: string) => Readonly<any>,
  makeExecutable: (path: string) => void,
  mergeEnv: (resource: ResourceProps, global: OperatorsConfig) => ResourceProps,
}
export interface CustomResourceProps {
  readonly categories?: ((readonly (string)[])) | undefined;
  readonly group: string;
  readonly kind: string;
  readonly listKind?: (string) | undefined;
  readonly outputs?: ((readonly (string)[])) | undefined;
  readonly plural: string;
  readonly schema?: (Readonly<any>) | undefined;
  readonly shortNames?: ((readonly (string)[])) | undefined;
  readonly singular?: (string) | undefined;
  readonly version: string;
}
export interface Permission {
  readonly apiGroups: (readonly (string)[]);
  readonly resources: (readonly (string)[]);
  readonly verbs: (readonly (string)[]);
}
export interface ResourceOperator {
  readonly env?: (Readonly<Record<string, string>>) | undefined;
  readonly envConfigMaps?: (Readonly<Record<string, string>>) | undefined;
  readonly envSecrets?: (Readonly<Record<string, string>>) | undefined;
  readonly namespace: string;
  readonly permissions: (readonly (Permission)[]);
}
export interface ResourceProps {
  readonly definition: CustomResourceProps;
  readonly engine: string;
  readonly operator: ResourceOperator;
}
export interface OperatorsConfig {
  readonly env?: (Readonly<Record<string, string>>) | undefined;
  readonly envConfigMaps?: (Readonly<Record<string, string>>) | undefined;
  readonly envSecrets?: (Readonly<Record<string, string>>) | undefined;
}
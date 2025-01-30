// see https://github.com/winglang/quickube/blob/a49ce77cb54aeaa949c112e540db5a60e700cc96/packages/backend/types.w#L74
const instances = {
  micro: { cpu: 2, memory: 1, storage: 1 },
  small: { cpu: 2, memory: 2, storage: 1 },
  medium: { cpu: 2, memory: 4, storage: 2 },
  large: { cpu: 4, memory: 16, storage: 2 },
  xlarge: { cpu: 8, memory: 32, storage: 2 }
};

console.log(JSON.stringify(JSON.stringify(instances)));

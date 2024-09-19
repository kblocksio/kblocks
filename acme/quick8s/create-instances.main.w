bring util;
bring "./cluster.w" as c;
bring "./backend/types.w" as t;

let addCapacity = (size: t.Size, count: num) => {
  for i in 0..count {
    new c.Q8sCluster(size: size) as "q8s-{size}-{i}";
  }
};

addCapacity(t.Size.small, 5);
addCapacity(t.Size.medium, 2);
addCapacity(t.Size.large, 1);

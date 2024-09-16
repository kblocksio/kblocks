bring util;

pub interface INameGenerator {
  inflight next(): str;
}

pub class NameGenerator impl INameGenerator {
  pub inflight next(): str {
    return "q8s-{util.nanoid()}";
  }
}
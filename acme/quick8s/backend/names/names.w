bring util;
bring cloud;
bring fs;

pub interface INameGenerator {
  inflight next(): str;
}

pub class NameGenerator impl INameGenerator {
  index: cloud.Counter;
  names: Array<str>;

  new() {
    this.index = new cloud.Counter();
    // TODO: yakk.
    this.names = unsafeCast(fs.readJson("{@dirname}/names.json"));
  }

  pub inflight next(): str {
    let next = this.index.inc();
    return this.names[next];
  }
}
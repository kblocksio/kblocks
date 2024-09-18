bring "./names.w" as n;
bring expect;

let nameGenerator = new n.NameGenerator();

test "generate a name" {
  expect.equal(nameGenerator.next(), "light-tight");
  expect.equal(nameGenerator.next(), "brain-train");
}
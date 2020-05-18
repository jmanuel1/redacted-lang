/* Here, I basically implement the Maybe monad. */

export default function do_(generator_function) {
  const generator = generator_function();
  let { value, done } = generator.next();
  while (!done) {
    if (value === null || value === undefined) {
      return null;
    }
    // else if (value === undefined) {
    //   // That's a bug
    //   generator.throw(new Error('Undefined yielded!'));
    // }
    const result = generator.next(value);
    value = result.value;
    done = result.done;
  }
  console.debug("value returned from do_", value);
  return value;
}

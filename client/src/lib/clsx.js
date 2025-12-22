function normalizeArg(arg) {
  if (!arg) {
    return [];
  }

  if (Array.isArray(arg)) {
    return arg.flatMap(normalizeArg);
  }

  if (typeof arg === 'object' && arg !== null) {
    return Object.keys(arg).filter((key) => Boolean(arg[key]));
  }

  return [String(arg)];
}

export default function clsx(...args) {
  return args.flatMap(normalizeArg).join(' ');
}

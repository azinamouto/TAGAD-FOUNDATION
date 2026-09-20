/** Trust only explicitly configured ingress; direct connections are the default. */
export function parseTrustProxy(value = process.env.TRUST_PROXY): false | number | string[] {
  const config = value?.trim();
  if (!config || config === 'false') return false;
  if (config === 'true') throw new Error('TRUST_PROXY=true is unsafe; specify proxy addresses or a fixed hop count');
  if (/^[0-9]+$/.test(config)) {
    const hops = Number(config);
    if (!Number.isSafeInteger(hops)) throw new Error('Invalid TRUST_PROXY hop count');
    return hops;
  }
  if (!Number.isNaN(Number(config))) throw new Error('TRUST_PROXY hop count must be a nonnegative integer');
  const addresses = config.split(',').map(address => address.trim());
  if (addresses.some(address => !address)) throw new Error('TRUST_PROXY contains an empty address');
  // Express validates addresses/CIDRs when app.set compiles its trust function.
  return addresses;
}

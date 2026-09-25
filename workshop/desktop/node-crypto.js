// node:crypto randomBytes, only as far as the host uses it.
export function randomBytes(size) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return {
    toString: encoding => encoding === 'hex' ? [...bytes].map(b => b.toString(16).padStart(2, '0')).join('') : btoa(String.fromCharCode(...bytes)),
    readUInt32LE: () => new DataView(bytes.buffer).getUint32(0, true),
  };
}

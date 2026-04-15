function ipv4ToLong(ip: string) {
  return ip.split('.').reduce((total, part) => (total << 8) + Number(part), 0) >>> 0
}

export function isIpInSubnet(ip: string, subnet: string) {
  const [range, prefixText] = subnet.split('/')

  if (!range || !prefixText) {
    return false
  }

  const prefix = Number(prefixText)

  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false
  }

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const ipValue = ipv4ToLong(ip)
  const subnetValue = ipv4ToLong(range)

  return (ipValue & mask) === (subnetValue & mask)
}
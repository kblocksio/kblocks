export default interface extern {
  _addARecord: (hostedZoneId: string, domainName: string, name: string, ip: string) => Promise<void>,
  _removeARecord: (hostedZoneId: string, domainName: string, name: string, ip: string) => Promise<void>,
}

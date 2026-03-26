const ANSI_RE = /\x1b\[[0-9;?]*[a-zA-Z]/g
const BLOCKS_RE = /[\u2580-\u259F]/g

export function cleanProgressLine(line: string): string {
  return line.replace(ANSI_RE, '').replace(BLOCKS_RE, '').trim()
}

export function cleanProgressOutput(output: string): string[] {
  return output
    .split(/[\n\r]+/)
    .map(cleanProgressLine)
    .filter(Boolean)
}

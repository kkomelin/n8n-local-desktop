'use strict'

const ANSI_RE = /\x1b\[[0-9;?]*[a-zA-Z]/g
const BLOCKS_RE = /[\u2580-\u259F]/g

/**
 * Cleans progress/log output by removing ANSI escape codes and Unicode block-drawing characters.
 *
 * @param {string} line - The raw output line to clean
 * @returns {string} - The cleaned line
 */
function cleanProgressLine(line) {
  return line.replace(ANSI_RE, '').replace(BLOCKS_RE, '').trim()
}

/**
 * Cleans and splits multiline output, returning non-empty cleaned lines.
 *
 * @param {string} output - The raw output potentially containing newlines
 * @returns {string[]} - Array of cleaned, non-empty lines
 */
function cleanProgressOutput(output) {
  const lines = output.split(/[\n\r]+/)
  return lines.map(cleanProgressLine).filter(Boolean)
}

module.exports = {
  cleanProgressLine,
  cleanProgressOutput,
}

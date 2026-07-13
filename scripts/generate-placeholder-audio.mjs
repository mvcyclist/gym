#!/usr/bin/env node
/**
 * Generate silent placeholder audio for guided routine fixtures.
 * Writes WAV files (no ffmpeg required).
 *
 * Usage: node scripts/generate-placeholder-audio.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public', 'audio', 'guided')

const routines = [
  { id: 'full_body_warmup_v1', seconds: 300 },
  { id: 'full_body_core_v1', seconds: 600 },
  { id: 'full_body_mobility_v1', seconds: 600 },
]

function writeSilentWav(filePath, durationSeconds) {
  const sampleRate = 44100
  const channels = 1
  const bitsPerSample = 16
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const byteRate = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const dataSize = numSamples * blockAlign
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  writeFileSync(filePath, buffer)
}

mkdirSync(outDir, { recursive: true })

for (const routine of routines) {
  const output = join(outDir, `${routine.id}.wav`)
  writeSilentWav(output, routine.seconds)
  console.log(`Wrote ${output} (${routine.seconds}s)`)
}

console.log('Done. Replace with ElevenLabs MP3s when scripts are ready.')

#!/usr/bin/env node
/**
 * Publish a guided routine: markdown script → ElevenLabs TTS → MP3 + fixture JSON.
 *
 * Setup (.env.local — never commit):
 *   ELEVENLABS_API_KEY=...
 *   ELEVENLABS_VOICE_ID=...        # ElevenLabs → Voices → copy voice ID
 *   ELEVENLABS_MODEL_ID=...        # optional, default eleven_turbo_v2_5
 *
 * Usage:
 *   npm run publish:guided -- full_body_core_v1
 *   npm run publish:guided -- --list-voices
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const ROUTINE_META = {
  full_body_warmup_v1: {
    title: 'Full Body Warm-up',
    description: 'Dynamic activation before main lifts.',
    segmentType: 'warmup',
    chapterMeta: [
      { id: 'intro', title: 'Introduction' },
      { id: 'arm-circles', title: 'Arm circles', exerciseId: 'warmup_segment' },
      { id: 'leg-swings', title: 'Leg swings' },
      { id: 'squat-to-stand', title: 'Bodyweight squat to stand' },
      { id: 'glute-bridges', title: 'Glute bridges' },
      { id: 'outro', title: 'Outro' },
    ],
  },
  full_body_core_v1: {
    title: 'Full Body Core',
    description: 'TRX core circuit — five exercises, two rounds, 30s on / 30s off.',
    segmentType: 'core',
    chapterMeta: [
      { id: 'intro', title: 'Introduction' },
      { id: 'r1-body-saw', title: 'Round 1 — TRX Body Saw', exerciseId: 'core_segment' },
      { id: 'r1-hip-dip-left', title: 'Round 1 — TRX Hip Dip — left' },
      { id: 'r1-hip-dip-right', title: 'Round 1 — TRX Hip Dip — right' },
      { id: 'r1-knee-tuck', title: 'Round 1 — TRX Knee Tuck' },
      { id: 'r1-shoulder-tap', title: 'Round 1 — TRX Plank Shoulder Tap' },
      { id: 'round-two', title: 'Round 2' },
      { id: 'r2-body-saw', title: 'Round 2 — TRX Body Saw' },
      { id: 'r2-hip-dip-left', title: 'Round 2 — TRX Hip Dip — left' },
      { id: 'r2-hip-dip-right', title: 'Round 2 — TRX Hip Dip — right' },
      { id: 'r2-knee-tuck', title: 'Round 2 — TRX Knee Tuck' },
      { id: 'r2-shoulder-tap', title: 'Round 2 — TRX Plank Shoulder Tap' },
      { id: 'outro', title: 'Outro' },
    ],
  },
  full_body_mobility_v1: {
    title: 'Full Body Mobility',
    description: 'TRX-assisted mobility — five holds, about ten minutes.',
    segmentType: 'mobility',
    chapterMeta: [
      { id: 'intro', title: 'Introduction' },
      { id: 'deep-squat-thoracic', title: 'TRX Deep Squat Hold + Thoracic Reach', exerciseId: 'mobility_segment' },
      { id: 'chest-opener', title: 'TRX Chest Opener' },
      { id: 'lat-stretch', title: 'TRX Lat Stretch' },
      { id: 'hamstring-stretch', title: 'TRX Hamstring Stretch' },
      { id: 'hip-flexor-lunge', title: 'TRX Hip Flexor Lunge + Overhead Reach' },
      { id: 'outro', title: 'Outro' },
    ],
  },
}

function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    const path = join(root, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  }
}

function parseMarkdownChapters(markdown) {
  const parts = markdown.split(/^## /m).filter(Boolean)
  return parts.map((part) => {
    const newline = part.indexOf('\n')
    const title = newline === -1 ? part.trim() : part.slice(0, newline).trim()
    const body = newline === -1 ? '' : part.slice(newline + 1).trim()
    return { title, body }
  })
}

function expandSpeechDirectives(text) {
  let result = text

  // [pause:1s] or [pause:1.5s] — SSML break (max 3s per ElevenLabs)
  result = result.replace(/\[pause:\s*([\d.]+)\s*s?\]/gi, (_, seconds) => {
    const clamped = Math.min(3, Math.max(0.1, parseFloat(seconds)))
    return `<break time="${clamped}s" />`
  })

  // [countdown:5] — em dashes only (SSML breaks here + every5 breaks cause ghost artifacts)
  result = result.replace(/\[countdown(?::\s*(\d+))?\]/gi, (_, raw) => {
    const count = Math.min(10, Math.max(1, parseInt(raw || '3', 10)))
    const words = [
      'zero',
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
    ]
    const spoken = []
    for (let i = count; i >= 1; i -= 1) {
      spoken.push(i === count ? words[i][0].toUpperCase() + words[i].slice(1) : words[i])
    }
    return `${spoken.join(' — ')}.`
  })

  // [every5:60] or [every5:60:3] — counts in small groups; one SSML break between groups only
  result = result.replace(/\[every5:\s*(\d+)(?::\s*([\d.]+))?\]/gi, (_, rawMax, rawBreak) => {
    const max = Math.min(120, Math.max(5, parseInt(rawMax, 10)))
    const breakSeconds = Math.min(3, Math.max(1, parseFloat(rawBreak || '3')))
    const labels = {
      5: 'Five',
      10: 'Ten',
      15: 'Fifteen',
      20: 'Twenty',
      25: 'Twenty-five',
      30: 'Thirty',
      35: 'Thirty-five',
      40: 'Forty',
      45: 'Forty-five',
      50: 'Fifty',
      55: 'Fifty-five',
      60: 'Sixty',
      65: 'Sixty-five',
      70: 'Seventy',
      75: 'Seventy-five',
      80: 'Eighty',
      85: 'Eighty-five',
      90: 'Ninety',
      95: 'Ninety-five',
      100: 'One hundred',
      105: 'One hundred five',
      110: 'One hundred ten',
      115: 'One hundred fifteen',
      120: 'Two minutes',
    }

    const ticks = []
    for (let seconds = 5; seconds <= max; seconds += 5) {
      ticks.push(labels[seconds] ?? `${seconds} seconds`)
    }

    const parts = []
    for (let index = 0; index < ticks.length; index += 1) {
      if (index > 0) parts.push(`<break time="${breakSeconds}s" />`)
      parts.push(ticks[index])
    }
    return parts.join(' ')
  })

  // [count:12] → grouped rep count (minimal breaks)
  result = result.replace(/\[count:\s*(\d+)\]/gi, (_, raw) => {
    const total = Math.min(20, Math.max(1, parseInt(raw, 10)))
    const words = [
      'Zero',
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
      'Twenty',
    ]
    const labels = []
    for (let i = 1; i <= total; i += 1) labels.push(words[i])
    const groupSize = 4
    const parts = []
    for (let index = 0; index < labels.length; index += groupSize) {
      if (index > 0) parts.push('<break time="2.5s" />')
      parts.push(labels.slice(index, index + groupSize).join(' ... '))
    }
    return parts.join(' ')
  })

  return result
}

function markdownToSpeech(markdown) {
  return expandSpeechDirectives(
    markdown
      .replace(/\[PLACEHOLDER:[^\]]+\]/g, '')
      .replace(/^##\s+.+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  )
}

function chaptersFromWeights(chapterMeta, parsed, durationSeconds) {
  if (chapterMeta.length !== parsed.length) {
    console.warn(
      `Warning: ${chapterMeta.length} chapter slots in config but ${parsed.length} ## sections in markdown.`,
    )
  }

  const count = chapterMeta.length
  const weights = chapterMeta.map((meta, index) => {
    const section = parsed[index]
    const textLen = section ? section.title.length + section.body.length : 1
    return Math.max(1, textLen)
  })
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  let cursor = 0
  return chapterMeta.map((meta, index) => {
    const slice = (weights[index] / totalWeight) * durationSeconds
    const startSeconds = Math.floor(cursor)
    cursor += slice
    const endSeconds = index === count - 1 ? durationSeconds : Math.floor(cursor)
    return {
      id: meta.id,
      title: meta.title,
      startSeconds,
      endSeconds,
      ...(meta.exerciseId ? { exerciseId: meta.exerciseId } : {}),
    }
  })
}

function getAudioDurationSeconds(filePath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8' },
    )
    const seconds = parseFloat(out.trim())
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds)
  } catch {
    // ffprobe not available
  }

  const bytes = readFileSync(filePath).length
  const estimated = Math.ceil(bytes / 16000)
  console.warn(`ffprobe unavailable — estimating duration as ~${estimated}s from file size.`)
  return Math.max(1, estimated)
}

async function listVoices(apiKey) {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  })
  if (!response.ok) {
    throw new Error(`Failed to list voices (${response.status}): ${await response.text()}`)
  }
  const data = await response.json()
  console.log('\nAvailable voices (copy voice_id into ELEVENLABS_VOICE_ID):\n')
  for (const voice of data.voices ?? []) {
    console.log(`  ${voice.name}`)
    console.log(`    voice_id: ${voice.voice_id}`)
    if (voice.labels?.accent) console.log(`    accent: ${voice.labels.accent}`)
    console.log('')
  }
}

function countBreakTags(text) {
  return (text.match(/<break\b/gi) ?? []).length
}

function splitMarkdownSections(markdown) {
  const chunks = markdown.split(/^## /m).filter(Boolean)
  return chunks.map((chunk) => {
    const newline = chunk.indexOf('\n')
    const title = newline === -1 ? chunk.trim() : chunk.slice(0, newline).trim()
    // Body only — ## titles are chapter markers for ffmpeg chunking / metadata, never speech.
    const body = newline === -1 ? '' : chunk.slice(newline + 1).trim()
    return { title, body }
  })
}

function hasFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function concatMp3Files(partPaths, outputPath) {
  const listPath = `${outputPath}.concat.txt`
  const listBody = partPaths.map((part) => `file '${part.replace(/'/g, "'\\''")}'`).join('\n')
  writeFileSync(listPath, listBody)
  try {
    // Re-encode instead of -c copy: ElevenLabs chunks have encoder-delay/DTS offsets that
    // make stream-copy concat warn and can click at section boundaries.
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:a libmp3lame -q:a 4 "${outputPath}"`,
      { stdio: 'inherit' },
    )
  } finally {
    try {
      execSync(`rm -f "${listPath}"`)
    } catch {
      // ignore cleanup errors
    }
  }
}

async function synthesize({ apiKey, voiceId, modelId, text }) {
  if (modelId.includes('eleven_v3') && countBreakTags(text) > 0) {
    console.warn(
      'Warning: eleven_v3 ignores SSML <break> tags and may produce artifacts. Use eleven_turbo_v2_5 or eleven_multilingual_v2.',
    )
  }

  const stability = parseFloat(process.env.ELEVENLABS_STABILITY ?? '0.55')
  const similarityBoost = parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST ?? '0.8')

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      language_code: 'en',
      voice_settings: {
        stability: Number.isFinite(stability) ? stability : 0.55,
        similarity_boost: Number.isFinite(similarityBoost) ? similarityBoost : 0.8,
        style: 0,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${await response.text()}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function synthesizeRoutineAudio({ apiKey, voiceId, modelId, markdown, tmpDir }) {
  const sections = splitMarkdownSections(markdown)
  const speechSections = sections
    .map((section) => ({
      title: section.title,
      text: markdownToSpeech(section.body),
    }))
    .filter((section) => section.text.length > 0)

  if (speechSections.length === 0) {
    throw new Error('Script is empty after removing placeholders.')
  }

  const useChunked = speechSections.length > 1
  if (useChunked && !hasFfmpeg()) {
    console.warn(
      'ffmpeg not found — generating as one file. Install ffmpeg for chunked synthesis (fewer ghost-voice artifacts).',
    )
  }

  if (!useChunked || !hasFfmpeg()) {
    const speechText = speechSections.map((section) => section.text).join('\n\n')
    const breaks = countBreakTags(speechText)
    if (breaks > 12) {
      console.warn(`Warning: ${breaks} SSML breaks in one generation — may cause audio artifacts.`)
    }
    return { speechText, audioBuffer: await synthesize({ apiKey, voiceId, modelId, text: speechText }) }
  }

  mkdirSync(tmpDir, { recursive: true })
  const partPaths = []
  const transcriptParts = []

  for (let index = 0; index < speechSections.length; index += 1) {
    const section = speechSections[index]
    const breaks = countBreakTags(section.text)
    console.log(`  Section ${index + 1}/${speechSections.length}: ${section.title} (${breaks} breaks)`)
    const buffer = await synthesize({ apiKey, voiceId, modelId, text: section.text })
    const partPath = join(tmpDir, `part-${index}.mp3`)
    writeFileSync(partPath, buffer)
    partPaths.push(partPath)
    transcriptParts.push(section.text)
  }

  const outputPath = join(tmpDir, 'combined.mp3')
  concatMp3Files(partPaths, outputPath)
  return {
    speechText: transcriptParts.join('\n\n'),
    audioBuffer: readFileSync(outputPath),
  }
}

async function publishRoutine(routineId) {
  const meta = ROUTINE_META[routineId]
  if (!meta) {
    throw new Error(`Unknown routine "${routineId}". Valid: ${Object.keys(ROUTINE_META).join(', ')}`)
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim()
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_turbo_v2_5'

  if (!apiKey) {
    throw new Error('Missing ELEVENLABS_API_KEY in .env.local')
  }
  if (!voiceId) {
    throw new Error('Missing ELEVENLABS_VOICE_ID in .env.local (run: npm run publish:guided -- --list-voices)')
  }

  const markdownPath = join(root, 'content', 'guided-routines', `${routineId}.md`)
  if (!existsSync(markdownPath)) {
    throw new Error(`Script not found: ${markdownPath}`)
  }

  const markdown = readFileSync(markdownPath, 'utf8')
  const parsed = parseMarkdownChapters(markdown)

  console.log(`Publishing ${routineId} with model ${modelId} (chunked by ## section when ffmpeg is available)...`)

  const { speechText, audioBuffer } = await synthesizeRoutineAudio({
    apiKey,
    voiceId,
    modelId,
    markdown,
    tmpDir: join(root, '.tmp', 'guided-audio', routineId),
  })

  if (!speechText) {
    throw new Error('Script is empty after removing placeholders.')
  }

  const audioDir = join(root, 'public', 'audio', 'guided')
  const publishedDir = join(root, 'src', 'fixtures', 'published')
  mkdirSync(audioDir, { recursive: true })
  mkdirSync(publishedDir, { recursive: true })

  const audioFile = `${routineId}.mp3`
  const audioPath = join(audioDir, audioFile)
  writeFileSync(audioPath, audioBuffer)
  console.log(`Wrote ${audioPath}`)

  const durationSeconds = getAudioDurationSeconds(audioPath)
  const chapters = chaptersFromWeights(meta.chapterMeta, parsed, durationSeconds)

  const routine = {
    id: routineId,
    title: meta.title,
    description: meta.description,
    segmentType: meta.segmentType,
    durationSeconds,
    audioUrl: `/audio/guided/${audioFile}`,
    transcript: speechText,
    chapters,
  }

  const jsonPath = join(publishedDir, `${routineId}.json`)
  writeFileSync(jsonPath, `${JSON.stringify(routine, null, 2)}\n`)
  console.log(`Wrote ${jsonPath}`)
  console.log(`Duration: ${durationSeconds}s (${Math.ceil(durationSeconds / 60)} min)`)
  console.log('\nChapter timestamps are proportional estimates — adjust in the JSON after listening if needed.')
}

async function main() {
  loadEnvFiles()
  const arg = process.argv[2]

  if (!arg || arg === '--help' || arg === '-h') {
    console.log(`Usage:
  npm run publish:guided -- <routine_id>
  npm run publish:guided -- --list-voices

Routine IDs: ${Object.keys(ROUTINE_META).join(', ')}`)
    return
  }

  if (arg === '--list-voices') {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
    if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY in .env.local')
    await listVoices(apiKey)
    return
  }

  await publishRoutine(arg)
}

main().catch((error) => {
  console.error(error.message ?? error)
  process.exit(1)
})

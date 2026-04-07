import { spawnSync } from 'node:child_process';
import { basename, extname, join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { processAudio } from './audio.js';

export interface VideoResult {
  title: string;
  transcript: string;
  markdown: string;
  duration?: string;
  sourcePath: string;
}

const SUPPORTED_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']);

export function isVideoFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export async function processVideo(filePath: string): Promise<VideoResult> {
  const ext = extname(filePath).toLowerCase();
  const title = basename(filePath, ext);

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported video format: ${ext}. Supported: ${[...SUPPORTED_EXTENSIONS].join(', ')}`);
  }

  // Check for ffmpeg
  if (!isFfmpegAvailable()) {
    return {
      title,
      transcript: '',
      markdown: buildMarkdown(title, filePath, '[Video file — install ffmpeg for audio extraction and transcription]'),
      sourcePath: filePath,
    };
  }

  // Step 1: Extract audio track via ffmpeg
  const audioPath = join(tmpdir(), `wikimem-video-${Date.now()}.wav`);
  const extractResult = spawnSync('ffmpeg', [
    '-i', filePath,
    '-vn',                    // no video
    '-acodec', 'pcm_s16le',  // WAV format
    '-ar', '16000',           // 16kHz (optimal for Whisper)
    '-ac', '1',               // mono
    '-y',                     // overwrite
    audioPath,
  ], { encoding: 'utf-8', timeout: 120000 });

  if (extractResult.status !== 0) {
    return {
      title,
      transcript: '',
      markdown: buildMarkdown(title, filePath, `[Video file — ffmpeg audio extraction failed: ${extractResult.stderr?.substring(0, 200)}]`),
      sourcePath: filePath,
    };
  }

  // Step 2: Transcribe the extracted audio
  try {
    const audioResult = await processAudio(audioPath);

    // Get video duration
    const duration = getDuration(filePath);

    // Clean up temp audio file
    if (existsSync(audioPath)) unlinkSync(audioPath);

    return {
      title,
      transcript: audioResult.transcript,
      markdown: buildMarkdown(title, filePath, audioResult.transcript, duration),
      duration,
      sourcePath: filePath,
    };
  } catch (error) {
    // Clean up on failure
    if (existsSync(audioPath)) unlinkSync(audioPath);

    return {
      title,
      transcript: '',
      markdown: buildMarkdown(title, filePath, `[Video file — transcription failed: ${error instanceof Error ? error.message : String(error)}]`),
      sourcePath: filePath,
    };
  }
}

function buildMarkdown(title: string, filePath: string, transcript: string, duration?: string): string {
  return `# ${title}

> **Source:** [${basename(filePath)}](${filePath})
> **Type:** Video${duration ? `\n> **Duration:** ${duration}` : ''}
> **Processed:** ${new Date().toISOString().split('T')[0]}

## Transcript

${transcript || '_No transcript available._'}
`;
}

function isFfmpegAvailable(): boolean {
  try {
    const result = spawnSync('ffmpeg', ['-version'], { encoding: 'utf-8', timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

function getDuration(filePath: string): string | undefined {
  try {
    const result = spawnSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
    ], { encoding: 'utf-8', timeout: 10000 });
    const seconds = parseFloat(result.stdout.trim());
    if (isNaN(seconds)) return undefined;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  } catch {
    return undefined;
  }
}

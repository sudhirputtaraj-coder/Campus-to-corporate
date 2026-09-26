import { MAX_RECORDING_SECONDS } from './practice';

// A canonical mono 16-bit WAV keeps duration verifiable on the server, even for a modified client.
export function encodeWav(samples: Float32Array, sampleRate = 16000): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, value < 0 ? value * 32768 : value * 32767, true);
  });
  return buffer;
}

export function validPracticeWav(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 44) return false;
  const view = new DataView(buffer);
  const text = (offset: number, length: number) => Array.from({ length }, (_, index) => String.fromCharCode(view.getUint8(offset + index))).join('');
  const size = buffer.byteLength - 44;
  return text(0, 4) === 'RIFF' && text(8, 4) === 'WAVE' && text(12, 4) === 'fmt ' && text(36, 4) === 'data'
    && view.getUint32(4, true) === buffer.byteLength - 8 && view.getUint32(16, true) === 16
    && view.getUint16(20, true) === 1 && view.getUint16(22, true) === 1
    && view.getUint32(24, true) === 16000 && view.getUint32(28, true) === 32000
    && view.getUint16(32, true) === 2 && view.getUint16(34, true) === 16
    && view.getUint32(40, true) === size && size % 2 === 0 && size >= 8000 && size <= MAX_RECORDING_SECONDS * 32000;
}

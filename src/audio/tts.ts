/** Browser-native text-to-speech (no API key, no network). */

export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isTTSAvailable()) window.speechSynthesis.cancel();
}

export async function processVoice(audioBlob) {
  const form = new FormData();
  form.append('audio', audioBlob, 'voice.webm');

  const res = await fetch('/api/voice/process', {
    method: 'POST',
    body: form,
  });

  return await res.json();
}

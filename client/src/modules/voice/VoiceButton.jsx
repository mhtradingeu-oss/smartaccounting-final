import React, { useState } from 'react';
import { processVoice } from './voiceService';

export default function VoiceButton({ onResult }) {
  const [recording, setRecording] = useState(false);
  let recorder;
  let chunks = [];

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });

      const result = await processVoice(blob);

      onResult?.(result);

      chunks = [];
    };

    recorder.start();
    setRecording(true);
  };

  const stop = () => {
    recorder.stop();
    setRecording(false);
  };

  return (
    <button onClick={recording ? stop : start}>
      {recording ? 'Stop 🎤' : 'Speak 🎤'}
    </button>
  );
}

import React, { useRef, useState } from 'react';
import { processVoice } from './voiceService';

export default function VoiceButton({ onResult }) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const result = await processVoice(blob);

      onResult?.(result);
      chunksRef.current = [];
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.start();
    setRecording(true);
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <button onClick={recording ? stop : start}>
      {recording ? 'Stop 🎤' : 'Speak 🎤'}
    </button>
  );
}

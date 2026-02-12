import { useReactMediaRecorder } from "react-media-recorder";
import { Mic, Square } from "lucide-react";
import { useEffect } from "react";

const AudioRecorder = ({ onRecordingComplete }) => {
  const { status, startRecording, stopRecording, mediaBlobUrl, clearBlobUrl } =
    useReactMediaRecorder({ audio: true });

  useEffect(() => {
    if (status === "stopped" && mediaBlobUrl) {
      fetch(mediaBlobUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "answer.wav", { type: "audio/wav" });
          
          // 1. Send the file to the parent
          onRecordingComplete(file);
          
          // 2. CRITICAL FIX: Clear the memory so we don't send it again!
          clearBlobUrl(); 
        });
    }
  }, [status, mediaBlobUrl, onRecordingComplete, clearBlobUrl]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-4">
        {status !== "recording" ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg"
          >
            <Mic size={20} />
            Start Answer
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full animate-pulse shadow-lg"
          >
            <Square size={20} />
            Stop Recording
          </button>
        )}
      </div>
      {status === "recording" && (
        <p className="text-sm text-red-500 font-semibold">Recording...</p>
      )}
    </div>
  );
};

export default AudioRecorder;
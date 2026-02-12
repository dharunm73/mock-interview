import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { User, Bot, Loader2, Upload, StopCircle, CheckCircle, AlertCircle, Award } from "lucide-react";
import AudioRecorder from "./AudioRecorder";

const API_BASE_URL = "http://127.0.0.1:8000";

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [report, setReport] = useState(null); // The final report data

  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // --- 1. END INTERVIEW FUNCTION ---
  // We define this first so other functions can call it
  const handleEndInterview = async () => {
    if (!sessionId) return;
    setLoading(true);
    
    // Add a visual indicator that we are generating the report
    setChatHistory((prev) => [...prev, { role: "user", content: "🛑 Ending Interview..." }]);

    const formData = new FormData();
    formData.append("session_id", sessionId);

    try {
      const res = await axios.post(`${API_BASE_URL}/end-interview`, formData);
      setReport(res.data.report); // This triggers the View Switch
    } catch (error) {
      console.error("Error ending interview:", error);
      alert("Failed to generate report. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. START INTERVIEW ---
  const handleStartInterview = async () => {
    if (!resumeFile) return alert("Please select a resume file first.");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", resumeFile);

    try {
      const res = await axios.post(`${API_BASE_URL}/start-interview`, formData);
      setSessionId(res.data.session_id);
      setChatHistory([{ role: "ai", content: res.data.current_question }]);
    } catch (error) {
      console.error("Error starting interview:", error);
      alert("Failed to start interview. Is backend running?");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. SUBMIT AUDIO ANSWER ---
  const handleAudioSubmit = async (audioFile) => {
    setLoading(true);
    setChatHistory((prev) => [...prev, { role: "user", content: "🎤 Audio Answer Sent..." }]);

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("audio_file", audioFile);

    try {
      const res = await axios.post(`${API_BASE_URL}/submit-answer`, formData);
      const data = res.data;

      // Update Chat with real text
      setChatHistory((prev) => {
        const newHistory = [...prev];
        // Update user's last message
        newHistory[newHistory.length - 1].content = data.user_transcription;
        
        // Only add AI response if interview is NOT finished
        if (!data.is_finished && data.ai_response) {
            newHistory.push({ role: "ai", content: data.ai_response });
        }
        return newHistory;
      });

      // --- CHECK FOR AUTO-END ---
      if (data.is_finished) {
        // Call the end function directly!
        await handleEndInterview();
      }

    } catch (error) {
      console.error("Error submitting answer:", error);
      alert("Failed to process answer.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 font-sans">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-2">
        🤖 AI Interviewer <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Beta</span>
      </h1>

      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
        
        {/* --- VIEW 1: REPORT CARD --- */}
        {report ? (
          <div className="p-10 animate-fade-in space-y-8 overflow-y-auto max-h-[80vh]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center border-b pb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Interview Report</h2>
              </div>
              <div className="flex items-center gap-6 mt-4 md:mt-0">
                <div className="text-center">
                   <span className={`text-4xl font-bold ${
                     report.score >= 80 ? "text-green-600" : report.score >= 50 ? "text-yellow-600" : "text-red-600"
                   }`}>{report.score}/100</span>
                   <p className="text-xs text-gray-400 uppercase tracking-wide">Final Score</p>
                </div>
                <div className={`px-6 py-2 rounded-full text-white font-bold shadow-md ${
                  report.verdict === "Strong Hire" || report.verdict === "Hire" ? "bg-green-500" : "bg-red-500"
                }`}>
                  {report.verdict.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded text-center border border-gray-100">
                    <p className="text-3xl font-bold text-blue-600">{report.technical_score || 0}</p>
                    <p className="text-xs text-gray-500 uppercase mt-1">Technical (70%)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded text-center border border-gray-100">
                    <p className="text-3xl font-bold text-purple-600">{report.confidence_score || 0}</p>
                    <p className="text-xs text-gray-500 uppercase mt-1">Confidence (30%)</p>
                </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Award size={20} /> Executive Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{report.summary}</p>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <CheckCircle size={20} /> Key Strengths
                </h3>
                <ul className="space-y-2">
                  {report.strengths && report.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                      <span className="mt-1 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-red-50 p-6 rounded-lg border border-red-100">
                <h3 className="font-semibold text-red-800 mb-4 flex items-center gap-2">
                  <AlertCircle size={20} /> Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {report.weaknesses && report.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                      <span className="mt-1 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-center pt-6">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                >
                  Start New Interview
                </button>
            </div>
          </div>
        ) : (
          
          /* --- VIEW 2 & 3: UPLOAD & CHAT --- */
          !sessionId ? (
            <div className="flex flex-col items-center justify-center flex-1 p-10 space-y-6">
              <div className="bg-blue-50 p-6 rounded-full">
                <Upload size={48} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700">Upload your Resume to Begin</h2>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setResumeFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={handleStartInterview}
                disabled={!resumeFile || loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Start Interview"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 h-[600px]">
              <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm z-10">
                 <span className="text-sm font-medium text-gray-500">Live Session: {sessionId.slice(0, 8)}...</span>
                 
                 {/* MANUAL END BUTTON */}
                 <button 
                   onClick={handleEndInterview}
                   className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors"
                 >
                   <StopCircle size={16} /> End Interview
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm flex gap-3 ${
                      msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                    }`}>
                      <div className="mt-1">{msg.role === "user" ? <User size={18} /> : <Bot size={18} />}</div>
                      <p className="leading-relaxed text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 p-4 rounded-2xl rounded-bl-none flex items-center gap-2 text-gray-500 animate-pulse">
                      <Loader2 size={16} className="animate-spin" /> AI is thinking...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-gray-100 flex justify-center">
                <AudioRecorder onRecordingComplete={handleAudioSubmit} />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;
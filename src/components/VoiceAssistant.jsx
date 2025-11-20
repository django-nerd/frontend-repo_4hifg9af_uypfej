import { useEffect, useMemo, useRef, useState } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "";

export default function VoiceAssistant() {
  const [messages, setMessages] = useState([
    { role: "system", content: "أهلاً! كيف أستطيع مساعدتك؟" },
  ]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("llama3.1");
  const [streaming, setStreaming] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [partial, setPartial] = useState("");

  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const recognitionRef = useRef(null);
  const abortRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partial]);

  // Setup Web Speech API for Arabic STT
  useEffect(() => {
    const w = window;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = "ar";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
        else interimTranscript += e.results[i][0].transcript;
      }
      if (finalTranscript) {
        setInput((prev) => (prev ? prev + " " : "") + finalTranscript.trim());
      }
      setPartial(interimTranscript);
    };
    rec.onend = () => {
      if (micOn) rec.start();
    };
    recognitionRef.current = rec;
  }, [micOn]);

  const toggleMic = () => {
    const rec = recognitionRef.current;
    if (!rec) return alert("المتصفح لا يدعم التعرف على الصوت");
    if (micOn) {
      rec.stop();
      setMicOn(false);
    } else {
      setPartial("");
      rec.start();
      setMicOn(true);
    }
  };

  const speak = (text) => {
    if (!synth) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar-SA";
    utter.rate = 1.0;
    synth.cancel();
    synth.speak(utter);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", content: input.trim() }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: newMessages, stream: true }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("شبكة غير متاحة");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        chunk.split("\n\n").forEach((line) => {
          const prefix = "data: ";
          if (line.startsWith(prefix)) {
            const data = line.slice(prefix.length);
            assistant += data;
            setMessages((prev) => {
              const base = prev.filter((m) => m.role !== "assistant_temp");
              return [...base, { role: "assistant_temp", content: assistant }];
            });
          }
        });
      }
      setMessages((prev) => {
        const base = prev.filter((m) => m.role !== "assistant_temp");
        return [...base, { role: "assistant", content: assistant }];
      });
      setStreaming(false);
      speak(assistant);
    } catch (e) {
      setStreaming(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "حدث خطأ في الاتصال" }]);
    }
  };

  const stopStream = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div dir="rtl" className="min-h-screen text-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto grid gap-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">المساعد البيئي الذكي</h1>
          <div className="flex items-center gap-2">
            <select value={model} onChange={(e) => setModel(e.target.value)} className="bg-slate-800/70 border border-slate-700 rounded px-2 py-1">
              <option value="llama3.1">llama3.1</option>
              <option value="qwen2.5">qwen2.5</option>
              <option value="gemma2">gemma2</option>
              <option value="aya">aya</option>
            </select>
            {!streaming ? (
              <button onClick={sendMessage} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500">إرسال</button>
            ) : (
              <button onClick={stopStream} className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500">إيقاف</button>
            )}
            <button onClick={toggleMic} className={`px-3 py-1 rounded ${micOn ? "bg-teal-600" : "bg-slate-700"}`}>{micOn ? "إيقاف الميكروفون" : "تشغيل الميكروفون"}</button>
          </div>
        </header>

        <section className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 h-[60vh] overflow-y-auto">
          {messages.map((m, idx) => (
            <div key={idx} className={`mb-3 ${m.role === "user" ? "text-right" : "text-left"}`}>
              <div className={`inline-block px-3 py-2 rounded ${m.role === "user" ? "bg-blue-600/70" : m.role === "assistant" || m.role === "assistant_temp" ? "bg-slate-700/70" : "bg-slate-700/30"}`}>
                <span className="whitespace-pre-wrap">{m.content}</span>
              </div>
            </div>
          ))}
          {partial && (
            <div className="mb-3 text-right">
              <div className="inline-block px-3 py-2 rounded bg-blue-600/30">
                <span className="opacity-80">{partial}</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </section>

        <footer className="flex items-center gap-2">
          <input
            className="flex-1 bg-slate-800/70 border border-slate-700 rounded px-3 py-2"
            placeholder="تحدث أو اكتب سؤالك هنا..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500">إرسال</button>
        </footer>
      </div>
    </div>
  );
}

const chat = document.getElementById("chat");
const message = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const level = document.getElementById("level");

let history = [];

function addMessage(role, html, extraClass = "") {
  const div = document.createElement("div");
  div.className = `msg ${role} ${extraClass}`;
  div.innerHTML = html;
  chat.appendChild(div);
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  return div;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("Bu tarayıcı sesli okuma desteklemiyor.");
    return;
  }

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;

  speechSynthesis.speak(utterance);
}

function renderBotReply(data) {
  const reply = escapeHtml(data.reply || "");
  const corrected = escapeHtml(data.corrected || "");
  const explanation = escapeHtml(data.explanation || "");
  const nextQuestion = escapeHtml(data.nextQuestion || "");

  const html = `
    <b>Friend:</b><br>${reply}

    <div class="card">
      <b>Correction</b><br>
      ${corrected || "No correction needed. Great job!"}
    </div>

    <div class="card">
      <b>Why?</b><br>
      ${explanation || "Your sentence is understandable."}
    </div>

    <div class="card">
      <b>Keep talking</b><br>
      ${nextQuestion || "Tell me more."}
    </div>

    <button class="speak" onclick="speak('${String(data.reply || "").replaceAll("'", "\\'")}')">🔊 Dinle</button>
  `;

  addMessage("bot", html);
  speak(data.reply || "");
}

async function sendMessage() {
  const text = message.value.trim();
  if (!text) return;

  addMessage("user", `<b>You:</b><br>${escapeHtml(text)}`);
  message.value = "";

  const loading = addMessage("bot", "Friend düşünüyor...", "loading");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        level: level.value,
        history
      })
    });

    const data = await res.json();

    loading.remove();

    if (!res.ok) {
      addMessage("bot error", `Hata: ${escapeHtml(data.error || "Bilinmeyen hata")}`);
      return;
    }

    history.push({ role: "user", content: text });
    history.push({ role: "assistant", content: data.reply });

    history = history.slice(-10);

    renderBotReply(data);
  } catch (err) {
    loading.remove();
    addMessage("bot error", "Bağlantı hatası. Vercel API çalışıyor mu kontrol et.");
  }
}

sendBtn.addEventListener("click", sendMessage);

message.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function startMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Bu tarayıcı mikrofonla yazıya çevirme desteklemiyor. Chrome deneyebilirsin.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  micBtn.textContent = "Dinliyorum...";
  recognition.start();

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    message.value = text;
    micBtn.textContent = "🎙 Konuş";
  };

  recognition.onerror = () => {
    micBtn.textContent = "🎙 Konuş";
    alert("Mikrofon algılanamadı.");
  };

  recognition.onend = () => {
    micBtn.textContent = "🎙 Konuş";
  };
}

micBtn.addEventListener("click", startMic);

addMessage("bot", `
  <b>Friend:</b><br>
  Hi! I am your English speaking partner. Tell me about your day in English.
  <div class="card">
    <b>Example</b><br>
    I went to work today and I drank coffee.
  </div>
`);
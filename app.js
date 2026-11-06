// ضع رابط Cloudflare Worker بعد نشره في هذا المتغير:
const API_URL = "https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev";

const form = document.getElementById("chatForm");
const input = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const messagesEl = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const historyEl = document.getElementById("history");

let messages = [];
let conversations = JSON.parse(localStorage.getItem("amr-ai-chats") || "[]");

function saveConversations() {
  localStorage.setItem("amr-ai-chats", JSON.stringify(conversations.slice(0, 30)));
  renderHistory();
}
function renderHistory() {
  historyEl.innerHTML = "";
  conversations.forEach((chat, index) => {
    const btn = document.createElement("button");
    btn.className = "history-item";
    btn.textContent = chat.title || "محادثة جديدة";
    btn.addEventListener("click", () => {
      messages = chat.messages || [];
      renderMessages();
      document.querySelector(".sidebar").classList.remove("open");
    });
    historyEl.appendChild(btn);
  });
}
function addMessage(role, text) {
  const item = { role, text };
  messages.push(item);
  renderMessages();
}
function renderMessages() {
  welcome.style.display = messages.length ? "none" : "flex";
  messagesEl.innerHTML = "";
  messages.forEach(msg => {
    const row = document.createElement("div");
    row.className = `message ${msg.role}`;
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = msg.role === "user" ? "أنت" : "✦";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = msg.text;
    row.append(avatar, bubble);
    messagesEl.appendChild(row);
  });
  document.getElementById("conversation").scrollTop = document.getElementById("conversation").scrollHeight;
}
function persistCurrent() {
  if (!messages.length) return;
  const title = messages.find(m => m.role === "user")?.text.slice(0, 35) || "محادثة جديدة";
  conversations.unshift({ title, messages });
  conversations = conversations.slice(0, 30);
  saveConversations();
}
async function sendMessage(text) {
  const clean = text.trim();
  if (!clean || sendBtn.disabled) return;
  if (!API_URL.startsWith("https://") || API_URL.includes("YOUR-WORKER-NAME")) {
    alert("لازم تضيف رابط Cloudflare Worker في ملف app.js أولًا.");
    return;
  }

  addMessage("user", clean);
  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;
  const waiting = document.createElement("div");
  waiting.className = "message assistant";
  waiting.innerHTML = '<div class="msg-avatar">✦</div><div class="bubble typing">AMR AI بيفكر...</div>';
  messagesEl.appendChild(waiting);

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.slice(-12).map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          text: m.text
        }))
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `خطأ من الخادم: ${response.status}`);
    if (!data.reply) throw new Error("الخادم لم يرجع إجابة.");
    waiting.remove();
    addMessage("assistant", data.reply);
    persistCurrent();
  } catch (error) {
    waiting.remove();
    addMessage("assistant", `حصل خطأ: ${error.message}\nتأكد من نشر Worker وضبط مفتاح Gemini ورابط الخادم.`);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", e => {
  e.preventDefault();
  sendMessage(input.value);
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
});
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});
document.querySelectorAll(".suggestion").forEach(btn => {
  btn.addEventListener("click", () => sendMessage(btn.dataset.prompt));
});
document.getElementById("newChat").addEventListener("click", () => {
  messages = [];
  renderMessages();
  document.querySelector(".sidebar").classList.remove("open");
});
document.getElementById("clearChat").addEventListener("click", () => {
  if (!messages.length) return;
  if (confirm("تمسح المحادثة الحالية من الشاشة؟")) {
    messages = [];
    renderMessages();
  }
});
document.getElementById("menuBtn").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});
renderHistory();
renderMessages();

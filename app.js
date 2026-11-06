
// ==========================================
// NEXORA AI - Main Application
// ==========================================

const API_URL = "https://nexora-ai.egyptianshops1.workers.dev";

const form = document.getElementById("chatForm");
const input = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const messagesEl = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const historyEl = document.getElementById("history");

let messages = [];

let conversations = JSON.parse(
  localStorage.getItem("amr-ai-chats") || "[]"
);

let activeChatId = null;
let isTyping = false;

// ==========================================
// معرفات المحادثات القديمة
// ==========================================

conversations = conversations.map(chat => ({
  ...chat,
  id: chat.id || crypto.randomUUID()
}));

// ==========================================
// حفظ المحادثات
// ==========================================

function saveConversations() {
  localStorage.setItem(
    "amr-ai-chats",
    JSON.stringify(conversations.slice(0, 30))
  );

  renderHistory();
}

// ==========================================
// عرض سجل المحادثات
// ==========================================

function renderHistory() {
  historyEl.innerHTML = "";

  conversations.forEach(chat => {
    const btn = document.createElement("button");

    btn.className = "history-item";
    btn.textContent = chat.title || "محادثة جديدة";

    if (chat.id === activeChatId) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      if (isTyping) return;

      activeChatId = chat.id;
      messages = [...(chat.messages || [])];

      renderMessages();

      document.querySelector(".sidebar").classList.remove("open");
    });

    historyEl.appendChild(btn);
  });
}

// ==========================================
// حفظ المحادثة الحالية
// ==========================================

function persistCurrent() {
  if (!messages.length) return;

  const title =
    messages.find(m => m.role === "user")?.text.slice(0, 35) ||
    "محادثة جديدة";

  let chat = conversations.find(c => c.id === activeChatId);

  if (chat) {
    chat.messages = [...messages];
    chat.title = title;
    chat.updatedAt = Date.now();
  } else {
    activeChatId = crypto.randomUUID();

    chat = {
      id: activeChatId,
      title,
      messages: [...messages],
      updatedAt: Date.now()
    };

    conversations.unshift(chat);
  }

  conversations.sort(
    (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
  );

  conversations = conversations.slice(0, 30);

  saveConversations();
}

// ==========================================
// إضافة رسالة
// ==========================================

function addMessage(role, text) {
  messages.push({ role, text });
  renderMessages();
}

// ==========================================
// عرض الرسائل
// ==========================================

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

  scrollToBottom();
}

// ==========================================
// النزول لآخر المحادثة
// ==========================================

function scrollToBottom() {
  const conversation = document.getElementById("conversation");

  conversation.scrollTop = conversation.scrollHeight;
}

// ==========================================
// تقسيم الإجابة إلى أسطر
// ==========================================

function splitResponseIntoLines(text) {
  const originalLines = text.split("\n");
  const result = [];
  const maxCharacters = 75;

  originalLines.forEach(originalLine => {
    if (!originalLine.trim()) {
      result.push("");
      return;
    }

    const words = originalLine.split(/\s+/);
    let currentLine = "";

    words.forEach(word => {
      const testLine = currentLine
        ? currentLine + " " + word
        : word;

      if (
        testLine.length > maxCharacters &&
        currentLine
      ) {
        result.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      result.push(currentLine);
    }
  });

  return result;
}

// ==========================================
// عرض رد NEXORA AI سطرًا بعد سطر
// ==========================================

function typeAssistantMessage(text) {
  return new Promise(resolve => {
    const row = document.createElement("div");
    row.className = "message assistant";

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = "✦";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    row.append(avatar, bubble);
    messagesEl.appendChild(row);

    welcome.style.display = "none";

    const lines = splitResponseIntoLines(text);

    let index = 0;

    function showNextLine() {
      if (index >= lines.length) {
        messages.push({
          role: "assistant",
          text
        });

        persistCurrent();
        resolve();
        return;
      }

      if (index > 0) {
        bubble.textContent += "\n";
      }

      bubble.textContent += lines[index];

      index++;

      scrollToBottom();

      setTimeout(showNextLine, 160);
    }

    showNextLine();
  });
}

// ==========================================
// إرسال الرسائل إلى Gemini
// ==========================================

async function sendMessage(text) {
  const clean = text.trim();

  if (!clean || sendBtn.disabled || isTyping) return;

  if (!API_URL.startsWith("https://")) {
    alert("تأكد من رابط Cloudflare Worker.");
    return;
  }

  addMessage("user", clean);

  input.value = "";
  input.style.height = "auto";

  sendBtn.disabled = true;
  isTyping = true;

  const waiting = document.createElement("div");

  waiting.className = "message assistant";

  waiting.innerHTML = `
    <div class="msg-avatar">✦</div>
    <div class="bubble typing">NEXORA AI بيفكر...</div>
  `;

  messagesEl.appendChild(waiting);
  scrollToBottom();

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        messages: messages.slice(-12).map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          text: m.text
        }))
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `خطأ من الخادم: ${response.status}`
      );
    }

    if (!data.reply || typeof data.reply !== "string") {
      throw new Error("الخادم لم يرجع إجابة صحيحة.");
    }

    waiting.remove();

    await typeAssistantMessage(data.reply);

  } catch (error) {
    waiting.remove();

    addMessage(
      "assistant",
      `حدث خطأ: ${error.message}\nتأكد من اتصال الخادم وإعدادات Gemini.`
    );

    persistCurrent();

  } finally {
    sendBtn.disabled = false;
    isTyping = false;
    input.focus();
  }
}

// ==========================================
// إرسال النموذج
// ==========================================

form.addEventListener("submit", e => {
  e.preventDefault();
  sendMessage(input.value);
});

// ==========================================
// تكبير مربع الكتابة
// ==========================================

input.addEventListener("input", () => {
  input.style.height = "auto";

  input.style.height =
    Math.min(input.scrollHeight, 180) + "px";
});

// ==========================================
// Enter للإرسال
// ==========================================

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// ==========================================
// الاقتراحات الجاهزة
// ==========================================

document.querySelectorAll(".suggestion").forEach(btn => {
  btn.addEventListener("click", () => {
    sendMessage(btn.dataset.prompt);
  });
});

// ==========================================
// محادثة جديدة
// ==========================================

document.getElementById("newChat").addEventListener("click", () => {
  if (isTyping) return;

  messages = [];
  activeChatId = null;

  renderMessages();
  renderHistory();

  document.querySelector(".sidebar").classList.remove("open");
});

// ==========================================
// مسح المحادثة الحالية من الشاشة
// ==========================================

document.getElementById("clearChat").addEventListener("click", () => {
  if (!messages.length || isTyping) return;

  if (confirm("تمسح المحادثة الحالية من الشاشة؟")) {
    messages = [];
    activeChatId = null;

    renderMessages();
    renderHistory();
  }
});

// ==========================================
// القائمة الجانبية
// ==========================================

document.getElementById("menuBtn").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

// ==========================================
// تشغيل التطبيق
// ==========================================

renderHistory();
renderMessages();

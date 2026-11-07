// NEXORA AI - Supabase authentication and per-user conversations
const API_URL = "https://nexora-ai.egyptianshops1.workers.dev";
const SUPABASE_URL = "https://phnknceukzdsaibaoklx.supabase.co";
const SUPABASE_KEY = "sb_publishable_6Ox7ZfOWOE5iFJFus2MsTw_aedbJSU9";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("chatForm");
const input = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const messagesEl = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const historyEl = document.getElementById("history");

const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const authTitle = document.getElementById("authTitle");
const authSubmit = document.getElementById("authSubmit");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const authOpen = document.getElementById("authOpen");
const logoutBtn = document.getElementById("logoutBtn");

let messages = [];
let conversations = [];
let activeChatId = null;
let isTyping = false;
let currentUser = null;
let authMode = "login";

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#d34b62" : "#5c3dcc";
}

function openAuthModal(mode = "login") {
  setAuthMode(mode);
  setAuthMessage("");
  authModal.classList.remove("hidden");
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  loginTab.classList.toggle("active", !isSignup);
  signupTab.classList.toggle("active", isSignup);
  authTitle.textContent = isSignup ? "أنشئ حسابك في NEXORA" : "مرحبًا بك في NEXORA";
  document.querySelector(".modal-subtitle").textContent = isSignup
    ? "أنشئ حسابًا لحفظ محادثاتك والوصول إليها من أي جهاز."
    : "سجّل دخولك للوصول إلى محادثاتك المحفوظة.";
  authPassword.autocomplete = isSignup ? "new-password" : "current-password";
}

function updateProfile() {
  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  const avatarEl = document.getElementById("profileAvatar");

  if (currentUser) {
    nameEl.textContent = currentUser.user_metadata?.name || currentUser.email.split("@")[0];
    emailEl.textContent = currentUser.email;
    avatarEl.textContent = (currentUser.email || "N").charAt(0).toUpperCase();
    authOpen.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    nameEl.textContent = "زائر";
    emailEl.textContent = "سجّل الدخول لحفظ محادثاتك";
    avatarEl.textContent = "N";
    authOpen.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
}

function readGuestChats() {
  try {
    return JSON.parse(localStorage.getItem("nexora-guest-chats") || "[]");
  } catch {
    return [];
  }
}

function saveGuestChats() {
  localStorage.setItem("nexora-guest-chats", JSON.stringify(conversations.slice(0, 30)));
}

async function loadUserChats() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("nexora_chats")
    .select("id,title,messages,updated_at")
    .eq("user_id", currentUser.id)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Load chats error:", error);
    alert("تم تسجيل الدخول، لكن تعذّر تحميل المحادثات. تأكد من تنفيذ ملف supabase-schema.sql في Supabase.");
    conversations = [];
  } else {
    conversations = (data || []).map(chat => ({
      id: chat.id,
      title: chat.title || "محادثة جديدة",
      messages: Array.isArray(chat.messages) ? chat.messages : [],
      updatedAt: new Date(chat.updated_at).getTime()
    }));
  }

  messages = [];
  activeChatId = null;
  renderMessages();
  renderHistory();
}

async function persistCurrent() {
  if (!messages.length) return;

  const title = messages.find(message => message.role === "user")?.text.slice(0, 35) || "محادثة جديدة";
  const chatId = activeChatId || crypto.randomUUID();
  activeChatId = chatId;

  const chat = {
    id: chatId,
    title,
    messages: [...messages],
    updatedAt: Date.now()
  };

  const existingIndex = conversations.findIndex(item => item.id === chatId);
  if (existingIndex >= 0) conversations[existingIndex] = chat;
  else conversations.unshift(chat);

  conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  conversations = conversations.slice(0, 30);
  renderHistory();

  if (!currentUser) {
    saveGuestChats();
    return;
  }

  const { error } = await supabaseClient.from("nexora_chats").upsert({
    id: chat.id,
    user_id: currentUser.id,
    title: chat.title,
    messages: chat.messages,
    updated_at: new Date(chat.updatedAt).toISOString()
  }, { onConflict: "id" });

  if (error) {
    console.error("Save chat error:", error);
    alert("تعذّر حفظ المحادثة في حسابك: " + error.message);
  }
}

function renderHistory() {
  historyEl.innerHTML = "";

  conversations.forEach(chat => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.textContent = chat.title || "محادثة جديدة";

    if (chat.id === activeChatId) button.classList.add("active");

    button.addEventListener("click", () => {
      if (isTyping) return;
      activeChatId = chat.id;
      messages = [...(chat.messages || [])];
      renderMessages();
      document.querySelector(".sidebar").classList.remove("open");
    });

    historyEl.appendChild(button);
  });
}

function addMessage(role, text) {
  messages.push({ role, text });
  renderMessages();
}

function renderMessages() {
  welcome.style.display = messages.length ? "none" : "flex";
  messagesEl.innerHTML = "";

  messages.forEach(message => {
    const row = document.createElement("div");
    row.className = "message " + message.role;

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = message.role === "user" ? "أنت" : "✦";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = message.text;

    row.append(avatar, bubble);
    messagesEl.appendChild(row);
  });

  scrollToBottom();
}

function scrollToBottom() {
  const conversation = document.getElementById("conversation");
  conversation.scrollTop = conversation.scrollHeight;
}

function splitResponseIntoLines(text) {
  const result = [];
  const maxCharacters = 75;

  text.split("\n").forEach(line => {
    if (!line.trim()) {
      result.push("");
      return;
    }

    let currentLine = "";
    line.split(/\s+/).forEach(word => {
      const testLine = currentLine ? currentLine + " " + word : word;
      if (testLine.length > maxCharacters && currentLine) {
        result.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) result.push(currentLine);
  });

  return result;
}

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
        messages.push({ role: "assistant", text });
        persistCurrent();
        resolve();
        return;
      }

      if (index > 0) bubble.textContent += "\n";
      bubble.textContent += lines[index++];
      scrollToBottom();
      setTimeout(showNextLine, 100);
    }

    showNextLine();
  });
}

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

  // Official NEXORA AI developer attribution.
  const identityQuestion = /(?:مين|من|ما|ايه|ماهو|ما هي|what|who).{0,35}(?:صنعك|عملك|طورك|برمجك|أنشأك|مطورك|مؤسس|developer|created you|made you|built you)|(?:صنعك|عملك|طورك|برمجك|أنشأك|مطورك).{0,25}(?:مين|من|who|what)/i.test(clean);
  if (identityQuestion) {
    try {
      await typeAssistantMessage("أنا NEXORA AI، المساعد الذكي الذي طوّره AMR (Developer AMR). قد أستخدم نماذج وخدمات ذكاء اصطناعي من شركات أخرى لتشغيل بعض قدراتي، لكن مطوّر NEXORA AI وصاحب المشروع هو AMR.");
    } finally {
      sendBtn.disabled = false;
      isTyping = false;
      input.focus();
    }
    return;
  }

  const waiting = document.createElement("div");
  waiting.className = "message assistant";

  const waitingAvatar = document.createElement("div");
  waitingAvatar.className = "msg-avatar";
  waitingAvatar.textContent = "✦";

  const waitingBubble = document.createElement("div");
  waitingBubble.className = "bubble typing";
  waitingBubble.textContent = "NEXORA AI بيفكر...";

  waiting.append(waitingAvatar, waitingBubble);
  messagesEl.appendChild(waiting);
  scrollToBottom();

  try {
    const response = await fetch(API_URL + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.slice(-12).map(message => ({
          role: message.role === "assistant" ? "model" : "user",
          text: message.text
        }))
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "خطأ من الخادم: " + response.status);
    if (!data.reply || typeof data.reply !== "string") throw new Error("الخادم لم يرجع إجابة صحيحة.");

    waiting.remove();
    await typeAssistantMessage(data.reply);
  } catch (error) {
    waiting.remove();
    addMessage("assistant", "حدث خطأ: " + error.message + "\nتأكد من اتصال الخادم وإعدادات Gemini.");
    await persistCurrent();
  } finally {
    sendBtn.disabled = false;
    isTyping = false;
    input.focus();
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});

document.getElementById("newChat").addEventListener("click", () => {
  if (isTyping) return;
  messages = [];
  activeChatId = null;
  renderMessages();
  renderHistory();
  document.querySelector(".sidebar").classList.remove("open");
});

document.getElementById("clearChat").addEventListener("click", () => {
  if (!messages.length || isTyping) return;

  if (confirm("تمسح المحادثة الحالية من الشاشة؟")) {
    messages = [];
    activeChatId = null;
    renderMessages();
    renderHistory();
  }
});

document.getElementById("menuBtn").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});


const resetPasswordBtn = document.getElementById("resetPasswordBtn");
resetPasswordBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  if (!email) {
    setAuthMessage("اكتب بريدك الإلكتروني أولًا ثم اضغط نسيت كلمة المرور.", true);
    authEmail.focus();
    return;
  }
  resetPasswordBtn.disabled = true;
  setAuthMessage("جارٍ إرسال رابط استعادة كلمة المرور...");
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: "https://amr-1-one.github.io/NEXORA-AI/"
    });
    if (error) throw error;
    setAuthMessage("لو البريد مسجل عندنا، هيوصلك رابط لاستعادة كلمة المرور. افحص صندوق الوارد والرسائل غير المرغوب فيها.");
  } catch (error) {
    setAuthMessage(error.message || "تعذّر إرسال رابط الاستعادة.", true);
  } finally {
    resetPasswordBtn.disabled = false;
  }
});

authOpen.addEventListener("click", () => openAuthModal("login"));
document.getElementById("authClose").addEventListener("click", closeAuthModal);

authModal.addEventListener("click", event => {
  if (event.target === authModal) closeAuthModal();
});

loginTab.addEventListener("click", () => {
  setAuthMode("login");
  setAuthMessage("");
});

signupTab.addEventListener("click", () => {
  setAuthMode("signup");
  setAuthMessage("");
});

authForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = authEmail.value.trim();
  const password = authPassword.value;

  authSubmit.disabled = true;
  authSubmit.textContent = "جارٍ التنفيذ...";
  setAuthMessage("");

  try {
    if (authMode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "https://amr-1-one.github.io/NEXORA-AI/"
        }
      });

      if (error) throw error;

      if (data.session) {
        setAuthMessage("تم إنشاء الحساب وتسجيل الدخول بنجاح.");
      } else {
        setAuthMessage("تم إنشاء الحساب. افتح رسالة التأكيد التي أرسلناها إلى بريدك الإلكتروني، ثم سجّل الدخول.");
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthMessage("تم تسجيل الدخول بنجاح.");
    }
  } catch (error) {
    setAuthMessage(error.message || "حدث خطأ. حاول مرة أخرى.", true);
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = authMode === "signup" ? "إنشاء حساب" : "تسجيل الدخول";
  }
});

logoutBtn.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) alert("تعذّر تسجيل الخروج: " + error.message);
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (_event === "PASSWORD_RECOVERY") {
    setTimeout(async () => {
      const newPassword = prompt("اكتب كلمة المرور الجديدة (6 أحرف على الأقل):");
      if (newPassword && newPassword.length >= 6) {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        alert(error ? "تعذّر تحديث كلمة المرور: " + error.message : "تم تحديث كلمة المرور بنجاح.");
      } else if (newPassword !== null) {
        alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      }
    }, 0);
  }  const nextUser = session?.user || null;

  if (currentUser?.id === nextUser?.id) return;

  currentUser = nextUser;
  updateProfile();

  // Run data requests after the auth callback releases Supabase's internal lock.
  setTimeout(async () => {
    if (currentUser) {
      await loadUserChats();
      closeAuthModal();
    } else {
      conversations = readGuestChats();
      messages = [];
      activeChatId = null;
      renderMessages();
      renderHistory();
    }
  }, 0);
});

async function initializeApp() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) console.error("Session error:", error);

  currentUser = data.session?.user || null;
  updateProfile();

  if (currentUser) {
    await loadUserChats();
  } else {
    conversations = readGuestChats();
    renderHistory();
    renderMessages();
  }
}

initializeApp();

// NEXORA AI - Supabase authentication and per-user conversations
const API_URL = "https://nexora-ai.egyptianshops1.workers.dev";
const SUPABASE_URL = "https://phnknceukzdsaibaoklx.supabase.co";
const SUPABASE_KEY = "sb_publishable_6Ox7ZfOWOE5iFJFus2MsTw_aedbJSU9";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("chatForm");
const input = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const micStatus = document.getElementById("micStatus");
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
let speechRecognition = null;
let isRecording = false;
let speechHadError = false;
let speechBaseText = "";

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


const defaultPreferences = { name: "", language: "ar", theme: "light", color: "#7455e8" };
let preferences = { ...defaultPreferences };

function validHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "");
}

function applyPreferences() {
  const root = document.documentElement;
  root.dataset.theme = preferences.theme === "dark" ? "dark" : "light";
  const color = validHexColor(preferences.color) ? preferences.color : defaultPreferences.color;
  root.style.setProperty("--purple", color);
  root.style.setProperty("--purple-dark", color);
  root.style.setProperty("--purple-light", color + "18");
  const isEnglish = preferences.language === "en";
  document.documentElement.lang = isEnglish ? "en" : "ar";
  document.documentElement.dir = isEnglish ? "ltr" : "rtl";

  const translations = isEnglish ? {
    "#newChat": "＋ New chat", ".side-label": "Your chats",
    "#authOpen": "Sign in / Create account", "#logoutBtn": "Sign out",
    "#clearChat": "Clear chat", "#prompt": "Message NEXORA AI...",
    ".disclaimer": "NEXORA AI can make mistakes; check important information.",
    ".eyebrow": "A smart space for all your ideas",
    ".welcome h1": "Welcome to NEXORA AI",
    ".welcome p": "Ask, learn, create, and let's get started.",
    "#settingsOpen": "⚙️ Settings", "#settingsTitle": "NEXORA Settings",
    'label[for="settingsName"]': "Display name", 'label[for="settingsLanguage"]': "Interface language",
    'label[for="settingsTheme"]': "Appearance", 'label[for="settingsColor"]': "Accent color",
    "#settingsSave": "Save settings", "#settingsCancel": "Cancel",
    "#settingsClose": "×"
  } : {
    "#newChat": "＋ محادثة جديدة", ".side-label": "محادثاتك",
    "#authOpen": "تسجيل الدخول / إنشاء حساب", "#logoutBtn": "تسجيل الخروج",
    "#clearChat": "مسح المحادثة", "#prompt": "اكتب رسالتك إلى NEXORA AI...",
    ".disclaimer": "قد يخطئ NEXORA AI أحيانًا؛ راجع المعلومات المهمة.",
    ".eyebrow": "مساحة ذكية لكل أفكارك",
    ".welcome h1": "أهلاً بك في NEXORA AI",
    ".welcome p": "اسأل، تعلّم، ابتكر، ودعنا نبدأ من هنا.",
    "#settingsOpen": "⚙️ الإعدادات", "#settingsTitle": "إعدادات NEXORA",
    'label[for="settingsName"]': "اسم العرض", 'label[for="settingsLanguage"]': "لغة الواجهة",
    'label[for="settingsTheme"]': "المظهر", 'label[for="settingsColor"]': "اللون الأساسي",
    "#settingsSave": "حفظ الإعدادات", "#settingsCancel": "إلغاء",
    "#settingsClose": "×"
  };
  Object.entries(translations).forEach(([selector, value]) => {
    const element = document.querySelector(selector);
    if (!element) return;
    if (selector === "#prompt") element.placeholder = value;
    else if (selector === ".welcome h1") element.innerHTML = isEnglish ? 'Welcome to <span>NEXORA AI</span>' : 'أهلاً بك في <span>NEXORA AI</span>';
    else element.textContent = value;
  });
  document.querySelectorAll(".suggestion").forEach((button, index) => {
    const en = ["💡 Explain a topic", "⌨️ Write some code", "📚 Help me study", "🚀 Suggest ideas"];
    const ar = ["💡 اشرح لي موضوعًا", "⌨️ اكتب لي كودًا", "📚 ساعدني في المذاكرة", "🚀 اقترح أفكارًا"];
    button.textContent = (isEnglish ? en : ar)[index] || button.textContent;
  });
  const nameEl = document.getElementById("profileName");
  if (currentUser && preferences.name) nameEl.textContent = preferences.name;
  const saveButton = document.getElementById("settingsSave");
  if (saveButton) saveButton.textContent = isEnglish ? "Save settings" : "حفظ الإعدادات";
  const voiceButton = document.getElementById("micBtn");
  if (voiceButton) {
    const voiceLabel = isEnglish ? (isRecording ? "Stop recording" : "Voice input") : (isRecording ? "إيقاف التسجيل" : "تسجيل صوتي");
    voiceButton.title = voiceLabel;
    voiceButton.setAttribute("aria-label", voiceLabel);
  }
}

function loadLocalPreferences() {
  try {
    return { ...defaultPreferences, ...(JSON.parse(localStorage.getItem("nexora-preferences") || "{}")) };
  } catch {
    return { ...defaultPreferences };
  }
}

async function loadPreferences() {
  if (currentUser) {
    const saved = currentUser.user_metadata?.nexora_preferences || {};
    preferences = { ...defaultPreferences, ...saved };
    if (!preferences.name) preferences.name = currentUser.user_metadata?.name || "";
  } else {
    preferences = loadLocalPreferences();
  }
  if (!["ar", "en"].includes(preferences.language)) preferences.language = "ar";
  if (!["light", "dark"].includes(preferences.theme)) preferences.theme = "light";
  if (!validHexColor(preferences.color)) preferences.color = defaultPreferences.color;
  applyPreferences();
}

async function savePreferences(event) {
  event.preventDefault();
  const name = document.getElementById("settingsName").value.trim().slice(0, 40);
  preferences = {
    name,
    language: document.getElementById("settingsLanguage").value,
    theme: document.getElementById("settingsTheme").value,
    color: document.getElementById("settingsColor").value
  };
  applyPreferences();
  const message = document.getElementById("settingsMessage");
  const saveButton = document.getElementById("settingsSave");
  saveButton.disabled = true;
  try {
    if (currentUser) {
      const { error } = await supabaseClient.auth.updateUser({
        data: { name, nexora_preferences: preferences }
      });
      if (error) throw error;
      const { data } = await supabaseClient.auth.getUser();
      if (data.user) currentUser = data.user;
      message.textContent = preferences.language === "en" ? "Settings saved to your account." : "تم حفظ الإعدادات في حسابك بنجاح.";
    } else {
      localStorage.setItem("nexora-preferences", JSON.stringify(preferences));
      message.textContent = preferences.language === "en" ? "Settings saved on this device. Sign in to sync them across devices." : "تم حفظ الإعدادات على هذا الجهاز. سجّل الدخول لمزامنتها بين أجهزتك.";
    }
    updateProfile();
    applyPreferences();
    document.getElementById("settingsModal").classList.add("hidden");
  } catch (error) {
    message.textContent = (preferences.language === "en" ? "Could not save: " : "تعذّر الحفظ: ") + error.message;
  } finally {
    saveButton.disabled = false;
  }
}

function openSettings() {
  document.getElementById("settingsName").value = preferences.name || currentUser?.user_metadata?.name || "";
  document.getElementById("settingsLanguage").value = preferences.language;
  document.getElementById("settingsTheme").value = preferences.theme;
  document.getElementById("settingsColor").value = preferences.color;
  document.getElementById("settingsMessage").textContent = currentUser
    ? (preferences.language === "en" ? "Your settings sync with your account." : "إعداداتك متزامنة مع حسابك.")
    : (preferences.language === "en" ? "Guest settings are saved on this device only." : "إعدادات الزائر تُحفظ على هذا الجهاز فقط.");
  document.getElementById("settingsModal").classList.remove("hidden");
}

function updateProfile() {
  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  const avatarEl = document.getElementById("profileAvatar");

  if (currentUser) {
    nameEl.textContent = preferences.name || currentUser.user_metadata?.name || currentUser.email.split("@")[0];
    emailEl.textContent = currentUser.email;
    avatarEl.textContent = (preferences.name || currentUser.email || "N").charAt(0).toUpperCase();
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

// Voice input: browser speech recognition converts speech into editable text.
micBtn.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micStatus.textContent = preferences.language === "en"
      ? "Voice input is not supported in this browser. Try the latest Chrome."
      : "التسجيل الصوتي غير مدعوم في المتصفح ده. جرّب أحدث إصدار من Chrome.";
    return;
  }

  if (isRecording && speechRecognition) {
    speechRecognition.stop();
    return;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.lang = preferences.language === "en" ? "en-US" : "ar-EG";
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechBaseText = input.value.trim();

  speechRecognition.onstart = () => {
    speechHadError = false;
    isRecording = true;
    micBtn.classList.add("recording");
    micBtn.setAttribute("aria-pressed", "true");
    micBtn.title = preferences.language === "en" ? "Stop recording" : "إيقاف التسجيل";
    micStatus.textContent = preferences.language === "en" ? "Listening… speak now" : "جاري الاستماع… اتكلم دلوقتي";
  };

  speechRecognition.onresult = event => {
    // The results list already contains the complete transcript for this session.
    // Rebuild it on every event instead of appending, which can duplicate long phrases.
    const finalParts = [];
    const interimParts = [];

    for (let i = 0; i < event.results.length; i++) {
      const phrase = event.results[i][0].transcript.trim();
      if (!phrase) continue;

      if (event.results[i].isFinal) finalParts.push(phrase);
      else interimParts.push(phrase);
    }

    const spokenText = [...finalParts, ...interimParts].join(" ");
    input.value = [speechBaseText, spokenText].filter(Boolean).join(speechBaseText ? " " : "");
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 180) + "px";
  };

  speechRecognition.onerror = event => {
    speechHadError = true;
    const messages = {
      "not-allowed": preferences.language === "en" ? "Microphone permission was blocked. Allow it in your browser." : "إذن الميكروفون مرفوض. اسمح للمتصفح باستخدامه.",
      "no-speech": preferences.language === "en" ? "No speech was detected. Try again." : "لم يتم التقاط كلام. حاول مرة أخرى.",
      "audio-capture": preferences.language === "en" ? "No microphone was found." : "لم يتم العثور على ميكروفون.",
      "network": preferences.language === "en" ? "Speech recognition network error. Try again." : "حدث خطأ في اتصال خدمة تحويل الصوت إلى نص. حاول مرة أخرى."
    };
    micStatus.textContent = messages[event.error] || (preferences.language === "en" ? "Voice input error. Try again." : "حصل خطأ في التسجيل الصوتي. حاول مرة أخرى.");
  };

  speechRecognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove("recording");
    micBtn.setAttribute("aria-pressed", "false");
    micBtn.title = preferences.language === "en" ? "Voice input" : "تسجيل صوتي";
    if (!speechHadError) {
      micStatus.textContent = preferences.language === "en" ? "Recording stopped. Review the text before sending." : "انتهى التسجيل. راجع النص قبل الإرسال.";
    }
  };

  try {
    micStatus.textContent = "";
    speechRecognition.start();
  } catch (error) {
    micStatus.textContent = preferences.language === "en" ? "Could not start the microphone. Try again." : "تعذر بدء الميكروفون. حاول مرة أخرى.";
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

document.getElementById("settingsOpen").addEventListener("click", openSettings);
document.getElementById("settingsClose").addEventListener("click", () => document.getElementById("settingsModal").classList.add("hidden"));
document.getElementById("settingsCancel").addEventListener("click", () => document.getElementById("settingsModal").classList.add("hidden"));
document.getElementById("settingsModal").addEventListener("click", event => {
  if (event.target.id === "settingsModal") event.currentTarget.classList.add("hidden");
});
document.getElementById("settingsForm").addEventListener("submit", async event => {
  await savePreferences(event);
});
// Settings are applied only after the user presses Save.


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

supabaseClient.auth.onAuthStateChange(async (_event, session) => {
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
  await loadPreferences();
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
  await loadPreferences();
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

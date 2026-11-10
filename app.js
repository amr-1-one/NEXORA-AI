// NEXORA AI - Supabase authentication and per-user conversations
const API_URL = "https://nexora-ai.egyptianshops1.workers.dev";
const SUPABASE_URL = "https://phnknceukzdsaibaoklx.supabase.co";
const SUPABASE_KEY = "sb_publishable_6Ox7ZfOWOE5iFJFus2MsTw_aedbJSU9";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("chatForm");
const input = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const fileInput = document.getElementById("fileInput");
const attachBtn = document.getElementById("attachBtn");
const attachmentList = document.getElementById("attachmentList");
let selectedFiles = [];
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
const googleLoginBtn = document.getElementById("googleLoginBtn");
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


const defaultPreferences = { name: "", language: "ar", theme: "light", color: "#7455e8", responseLength: "balanced" };
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
    'label[for="settingsResponseLength"]': "Response length",
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
    'label[for="settingsResponseLength"]': "طول الردود",
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
  const responseLengthSelect = document.getElementById("settingsResponseLength");
  if (responseLengthSelect) {
    const labels = isEnglish ? { concise: "Concise", balanced: "Balanced", detailed: "Detailed" } : { concise: "مختصر", balanced: "متوازن", detailed: "تفصيلي" };
    [...responseLengthSelect.options].forEach(option => { option.textContent = labels[option.value] || option.textContent; });
  }
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
  if (!["concise", "balanced", "detailed"].includes(preferences.responseLength)) preferences.responseLength = "balanced";
  applyPreferences();
}

async function savePreferences(event) {
  event.preventDefault();
  const name = document.getElementById("settingsName").value.trim().slice(0, 40);
  preferences = {
    name,
    language: document.getElementById("settingsLanguage").value,
    theme: document.getElementById("settingsTheme").value,
    color: document.getElementById("settingsColor").value,
    responseLength: document.getElementById("settingsResponseLength").value
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
  document.getElementById("settingsResponseLength").value = preferences.responseLength || "balanced";
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
    messages: messages.map(({ imageDataUrl, ...message }) => message),
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

async function deleteConversation(chatId) {
  if (isTyping) return;
  const chat = conversations.find(item => item.id === chatId);
  if (!chat) return;

  const isEnglish = preferences.language === "en";
  const confirmed = confirm(isEnglish
    ? "Permanently delete this conversation?"
    : "هل تريد حذف هذه المحادثة نهائيًا؟");
  if (!confirmed) return;

  if (currentUser) {
    const { error } = await supabaseClient
      .from("nexora_chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Delete chat error:", error);
      alert((isEnglish ? "Could not delete conversation: " : "تعذّر حذف المحادثة: ") + error.message);
      return;
    }
  }

  conversations = conversations.filter(item => item.id !== chatId);
  if (!currentUser) saveGuestChats();

  if (activeChatId === chatId) {
    activeChatId = null;
    messages = [];
    renderMessages();
  }

  renderHistory();
}

function renderHistory() {
  historyEl.innerHTML = "";

  conversations.forEach(chat => {
    const row = document.createElement("div");
    row.className = "history-row";

    const button = document.createElement("button");
    button.className = "history-item";
    button.textContent = chat.title || "محادثة جديدة";
    button.type = "button";

    if (chat.id === activeChatId) button.classList.add("active");

    button.addEventListener("click", () => {
      if (isTyping) return;
      activeChatId = chat.id;
      messages = [...(chat.messages || [])];
      renderMessages();
      renderHistory();
      closeHistoryPanel();
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "history-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = preferences.language === "en" ? "Delete conversation" : "حذف المحادثة";
    deleteButton.setAttribute("aria-label", deleteButton.title);
    deleteButton.addEventListener("click", () => deleteConversation(chat.id));

    row.append(button, deleteButton);
    historyEl.appendChild(row);
  });
}

function addMessage(role, text, displayText = text) {
  messages.push({ role, text, displayText });
  renderMessages();
}

async function copyTextToClipboard(text, button) {
  const originalLabel = button.textContent;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      helper.remove();
      if (!copied) throw new Error("Copy failed");
    }
    button.textContent = preferences.language === "en" ? "Copied ✓" : "تم النسخ ✓";
  } catch {
    button.textContent = preferences.language === "en" ? "Copy failed" : "تعذّر النسخ";
  }
  setTimeout(() => { button.textContent = originalLabel; }, 1600);
}

function makeCopyButton(text, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "message-copy-btn";
  button.textContent = label;
  button.addEventListener("click", () => copyTextToClipboard(text, button));
  return button;
}

let activeSpeakButton = null;
let speechRunId = 0;

function cleanTextForSpeech(value) {
  const codeFence = new RegExp("\x60{3}[\\s\\S]*?\x60{3}", "g");
  return String(value || "")
    .replace(codeFence, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/【[^】]*】/g, " ")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/\b(?:https?|www)\S+/gi, " ")
    .replace(/[|*_~>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speakAssistantMessage(message, button) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    micStatus.textContent = "تشغيل الصوت غير مدعوم في المتصفح ده.";
    return;
  }

  if (activeSpeakButton === button && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
    speechRunId++;
    window.speechSynthesis.cancel();
    button.classList.remove("speaking");
    activeSpeakButton = null;
    return;
  }

  speechRunId++;
  const thisRun = speechRunId;
  window.speechSynthesis.cancel();
  if (activeSpeakButton) activeSpeakButton.classList.remove("speaking");

  const textToRead = cleanTextForSpeech(message?.text);
  if (!textToRead) {
    activeSpeakButton = null;
    micStatus.textContent = "الرد ده مفيهوش نص أقدر أقراه.";
    return;
  }

  // One utterance avoids Chrome queue gaps and dropped chunks for normal answers.
  const chunks = [];
  for (let i = 0; i < textToRead.length; i += 2800) chunks.push(textToRead.slice(i, i + 2800));
  let index = 0;
  let started = false;
  activeSpeakButton = button;
  button.classList.add("speaking");

  const finish = (errorMessage = "") => {
    if (thisRun !== speechRunId) return;
    button.classList.remove("speaking");
    if (activeSpeakButton === button) activeSpeakButton = null;
    if (errorMessage) {
      micStatus.textContent = errorMessage;
      button.title = errorMessage;
    }
  };

  const speakNext = () => {
    if (thisRun !== speechRunId) return;
    if (index >= chunks.length) return finish();

    const chunk = chunks[index++];
    const isArabic = /[\u0600-\u06FF]/.test(chunk);
    const lang = isArabic ? "ar-EG" : "en-US";
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.toLowerCase() === lang.toLowerCase())
      || voices.find(v => v.lang.toLowerCase().startsWith(isArabic ? "ar-" : "en-"));
    // If no matching Arabic voice is installed, let the browser choose its default
    // instead of silently stopping the whole playback.
    if (voice) utterance.voice = voice;

    utterance.onstart = () => { started = true; };
    utterance.onend = () => {
      if (thisRun === speechRunId) setTimeout(speakNext, 60);
    };
    utterance.onerror = (event) => {
      if (thisRun !== speechRunId) return;
      const reason = event.error || "unknown";
      finish("المتصفح وقف القراءة (" + reason + "). جرّب تفعيل صوت عربي من إعدادات Windows.");
    };

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      finish("تعذّر تشغيل الصوت: " + error.message);
    }
  };

  // Chrome may ignore speak() immediately after cancel(); wait briefly.
  setTimeout(() => {
    if (thisRun === speechRunId) speakNext();
  }, 250);
}

function makeSpeakButton(message) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "message-copy-btn message-speak-btn";
  button.title = "قراءة الرد بصوت";
  button.setAttribute("aria-label", button.title);
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  button.addEventListener("click", () => speakAssistantMessage(message, button));
  return button;
}
function renderAssistantContent(bubble, message) {
  const raw = message.text || "";
  const parts = raw.split(/```([\w+-]*)\n?([\s\S]*?)```/g);

  for (let i = 0; i < parts.length; i += 3) {
    const prose = parts[i] || "";
    if (prose) {
      const textPart = document.createElement("div");
      textPart.className = "assistant-prose";
      prose.split("\n").forEach((line, index) => {
        if (index) textPart.appendChild(document.createElement("br"));
        textPart.appendChild(document.createTextNode(line));
      });
      bubble.appendChild(textPart);
    }

    if (i + 2 < parts.length) {
      const language = (parts[i + 1] || "").trim() || "code";
      const code = (parts[i + 2] || "").replace(/\n$/, "");
      const block = document.createElement("section");
      block.className = "code-block";

      const header = document.createElement("div");
      header.className = "code-block-header";
      const languageLabel = document.createElement("span");
      languageLabel.textContent = language;
      const codeCopy = makeCopyButton(code, preferences.language === "en" ? "Copy code" : "نسخ الكود");
      header.append(languageLabel, codeCopy);

      const pre = document.createElement("pre");
      const codeElement = document.createElement("code");
      codeElement.textContent = code;
      pre.appendChild(codeElement);
      block.append(header, pre);
      bubble.appendChild(block);
    }
  }

  const actions = document.createElement("div");
  actions.className = "assistant-message-actions";
  actions.append(makeCopyButton(raw, preferences.language === "en" ? "Copy answer" : "نسخ الإجابة"), makeSpeakButton(message));
  bubble.appendChild(actions);

  if (message.imageDataUrl) {
    const image = document.createElement("img");
    image.className = "chat-generated-image";
    image.src = message.imageDataUrl;
    image.alt = preferences.language === "en" ? "Edited image" : "الصورة بعد التعديل";
    image.loading = "lazy";
    bubble.appendChild(image);
  }
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
    if (message.role === "assistant") {
      renderAssistantContent(bubble, message);
    } else {
      bubble.textContent = message.displayText || message.text;
    }

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

function typeAssistantImageMessage(text, imageDataUrl) {
  const message = { role: "assistant", text, imageDataUrl };
  messages.push(message);
  renderMessages();
  persistCurrent();
}

function isImageEditRequest(prompt) {
  return /(?:عدّل|عدل|تعديل|غيّر|غير|تغيير|شيل|احذف|امسح|ضيف|أضف|اضف|حط|خلّي|خلي|حوّل|حول|قص|حسّن|حسن|تحسين|زوّد|زود|استبدل|بدّل|بدل|غيّرلي|غيرلي|اعملها|خلّيها|خليها|edit|modify|change|remove|erase|add|replace|turn into|convert|enhance|improve|crop|background|color)/i.test(prompt || "");
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
        const message = { role: "assistant", text };
        messages.push(message);
        bubble.textContent = "";
        renderAssistantContent(bubble, message);
        persistCurrent();
        resolve();
        return;
      }

      if (index > 0) bubble.textContent += "\n";
      bubble.textContent += lines[index++];
      scrollToBottom();
      setTimeout(showNextLine, 15);
    }

    showNextLine();
  });
}

function getResponseLengthInstruction() {
  const instructions = {
    concise: preferences.language === "en"
      ? "Response style preference: answer concisely and directly, focusing on the essential points. Keep necessary context and safety details."
      : "تفضيل أسلوب الرد: أجب باختصار ووضوح وركّز على النقاط الأساسية، مع عدم حذف المعلومات الضرورية أو تنبيهات السلامة.",
    detailed: preferences.language === "en"
      ? "Response style preference: provide a detailed, well-organized explanation with useful context and examples when they help."
      : "تفضيل أسلوب الرد: قدّم شرحًا تفصيليًا ومنظمًا، وأضف السياق والأمثلة المفيدة عند الحاجة.",
    balanced: preferences.language === "en"
      ? "Response style preference: use a balanced, natural level of detail. Be clear and avoid unnecessary repetition."
      : "تفضيل أسلوب الرد: استخدم طولًا متوازنًا وطبيعيًا، وكن واضحًا وتجنب التكرار غير الضروري."
  };
  return instructions[preferences.responseLength] || instructions.balanced;
}

async function sendMessage(text) {
  let clean = text.trim();
  const originalPrompt = clean;
  if ((!clean && !selectedFiles.length) || sendBtn.disabled || isTyping) return;

  if (!API_URL.startsWith("https://")) {
    alert("تأكد من رابط Cloudflare Worker.");
    return;
  }

  // Lock immediately, including while files are being extracted.
  // This prevents repeated clicks from sending the same attachment multiple times.
  sendBtn.disabled = true;
  isTyping = true;

  let attachmentContext = "";
  let imageAttachments = [];
  let visibleAttachmentNames = [];
  let waiting = null;
  let waitingBubble = null;

  // Show immediate feedback so users know the attachment is being processed.
  if (selectedFiles.length) {
    waiting = document.createElement("div");
    waiting.className = "message assistant";
    const waitingAvatar = document.createElement("div");
    waitingAvatar.className = "msg-avatar";
    waitingAvatar.textContent = "✦";
    waitingBubble = document.createElement("div");
    waitingBubble.className = "bubble typing";
    waitingBubble.textContent = "جارٍ تجهيز الملف وقراءة محتواه... من فضلك انتظر.";
    waiting.append(waitingAvatar, waitingBubble);
    messagesEl.appendChild(waiting);
    scrollToBottom();
  }

  if (selectedFiles.length) {
    try {
      const extracted = [];
      let totalImageBytes = 0;
      for (const file of selectedFiles) {
        const imageMimeType = getSupportedImageMimeType(file);
        if (imageMimeType) {
          totalImageBytes += file.size;
          if (totalImageBytes > 12 * 1024 * 1024) {
            throw new Error("إجمالي حجم الصور في الرسالة الواحدة يجب ألا يتجاوز 12 ميجابايت.");
          }
          imageAttachments.push({
            mimeType: imageMimeType,
            data: await fileToBase64(file),
            name: file.name
          });
        }
        const content = await extractAttachmentText(file);
        extracted.push("محتوى الملف " + file.name + ":\\n" + content.slice(0, 20000));
        visibleAttachmentNames.push(file.name);
      }
      attachmentContext = extracted.join("\\n\\n");
      if (waitingBubble) waitingBubble.textContent = "تم تجهيز الملف، جارٍ إرسال رسالتك...";
      renderSelectedFiles();
      selectedFiles = [];
      renderSelectedFiles();
    } catch (error) {
      if (waiting) waiting.remove();
      alert("تعذّر قراءة الملف: " + error.message);
      sendBtn.disabled = false;
      isTyping = false;
      input.focus();
      return;
    }
  }

  const fullMessage = [clean, attachmentContext].filter(Boolean).join("\\n\\n");
  const displayMessage = [clean, visibleAttachmentNames.length ? "📎 " + visibleAttachmentNames.join("، ") : ""].filter(Boolean).join("\\n");
  clean = fullMessage;

  addMessage("user", clean, displayMessage || clean);
  input.value = "";
  input.style.height = "auto";

  // Official NEXORA AI developer attribution.
  const identityQuestion = /(?:مين|من|ما|ايه|ماهو|ما هي|what|who).{0,35}(?:صنعك|عملك|طورك|برمجك|أنشأك|مطورك|مؤسس|developer|created you|made you|built you)|(?:صنعك|عملك|طورك|برمجك|أنشأك|مطورك).{0,25}(?:مين|من|who|what)/i.test(clean);
  if (identityQuestion) {
    if (waiting) waiting.remove();
    try {
      await typeAssistantMessage("أنا NEXORA AI، المساعد الذكي الذي طوّره AMR (Developer AMR). قد أستخدم نماذج وخدمات ذكاء اصطناعي من شركات أخرى لتشغيل بعض قدراتي، لكن مطوّر NEXORA AI وصاحب المشروع هو AMR.");
    } finally {
      sendBtn.disabled = false;
      isTyping = false;
      input.focus();
    }
    return;
  }

  // Route explicit image-edit requests to Gemini's image-generation model.
  if (imageAttachments.length && isImageEditRequest(originalPrompt)) {
    if (!waiting) {
      waiting = document.createElement("div");
      waiting.className = "message assistant";
      const avatar = document.createElement("div");
      avatar.className = "msg-avatar";
      avatar.textContent = "✦";
      waitingBubble = document.createElement("div");
      waitingBubble.className = "bubble typing";
      waiting.append(avatar, waitingBubble);
      messagesEl.appendChild(waiting);
    }
    waitingBubble.textContent = "جارٍ تعديل الصورة... قد يستغرق ذلك بعض الوقت.";
    scrollToBottom();

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch(API_URL + "/api/edit-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { "Authorization": "Bearer " + accessToken } : {})
        },
        body: JSON.stringify({
          prompt: originalPrompt,
          images: imageAttachments.map(({ mimeType, data }) => ({ mimeType, data }))
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذّر تعديل الصورة: " + response.status);
      if (!data.image?.data) throw new Error("الخادم لم يرجع صورة معدّلة.");

      waiting.remove();
      const mimeType = data.image.mimeType || "image/png";
      const imageDataUrl = "data:" + mimeType + ";base64," + data.image.data;
      await typeAssistantImageMessage(data.reply || "تم تعديل الصورة بنجاح.", imageDataUrl);

      if (typeof data.moderationWarning === "string" && data.moderationWarning.trim()) {
        alert(data.moderationWarning);
      }
    } catch (error) {
      if (waiting) waiting.remove();
      addMessage("assistant", "تعذّر تعديل الصورة: " + error.message);
      await persistCurrent();
    } finally {
      sendBtn.disabled = false;
      isTyping = false;
      input.focus();
    }
    return;
  }

  if (!waiting) {
    waiting = document.createElement("div");
    waiting.className = "message assistant";
    const waitingAvatar = document.createElement("div");
    waitingAvatar.className = "msg-avatar";
    waitingAvatar.textContent = "✦";
    waitingBubble = document.createElement("div");
    waitingBubble.className = "bubble typing";
    waiting.append(waitingAvatar, waitingBubble);
    messagesEl.appendChild(waiting);
  }
  waitingBubble.textContent = "NEXORA AI بيفكر...";
  scrollToBottom();

  try {
    // Attach the current Supabase access token so the Worker can verify
    // the sender. Never send a user_id supplied by the browser.
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const response = await fetch(API_URL + "/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { "Authorization": "Bearer " + accessToken } : {})
      },
      body: JSON.stringify({
        messages: messages.slice(-12).map((message, index, recentMessages) => ({
          role: message.role === "assistant" ? "model" : "user",
          text: message.text + (index === recentMessages.length - 1 && message.role !== "assistant"
            ? "\n\n" + getResponseLengthInstruction()
            : "")
        })),
        images: imageAttachments
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "خطأ من الخادم: " + response.status);
    if (!data.reply || typeof data.reply !== "string") throw new Error("الخادم لم يرجع إجابة صحيحة.");

    waiting.remove();
    await typeAssistantMessage(data.reply);

    // The Worker may return a warning after recording a moderation event.
    if (typeof data.moderationWarning === "string" && data.moderationWarning.trim()) {
      alert(data.moderationWarning);
    }
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


function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(script => script.src === src);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error("فشل تحميل أداة قراءة الملف"));
    document.head.appendChild(script);
  });
}

function getSupportedImageMimeType(file) {
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  const supported = ["image/jpeg", "image/png", "image/webp"];
  if (mime.startsWith("image/") && !supported.includes(mime)) {
    throw new Error("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.");
  }
  if (supported.includes(mime)) return mime;
  if (/\\.(jpe?g)$/.test(name)) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return null;
}

async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function extractAttachmentText(file) {
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) throw new Error("حجم الملف أكبر من 10 ميجابايت.");
  const name = file.name.toLowerCase();

  if (file.type === "text/plain" || name.endsWith(".txt")) {
    const text = await file.text();
    if (!text.trim()) throw new Error("الملف النصي فارغ.");
    return text;
  }

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 25); pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map(item => item.str).join(" "));
    }
    const text = pages.join("\\n");
    if (!text.trim()) throw new Error("لم أجد نصًا قابلًا للاستخراج داخل PDF.");
    return text;
  }

  if (name.endsWith(".docx")) {
    await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!result.value.trim()) throw new Error("ملف Word لا يحتوي على نص قابل للقراءة.");
    return result.value;
  }

  if (file.type.startsWith("image/") || getSupportedImageMimeType(file)) {
    try {
      await loadExternalScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
      const result = await Tesseract.recognize(file, "ara+eng");
      if (result.data.text.trim()) {
        return "نص OCR مبدئي (قد يحتوي على أخطاء؛ افحص الصورة الأصلية أيضًا):\\n" + result.data.text;
      }
    } catch (error) {
      console.warn("Image OCR unavailable; the original image will still be sent to vision model.", error);
    }
    return "تعذّر استخراج نص موثوق آليًا. افحص الصورة الأصلية بصريًا ولا تخمّن أي نص غير واضح.";
  }

  throw new Error("الأنواع المدعومة: PDF وWord وTXT والصور.");
}

function renderSelectedFiles() {
  attachmentList.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";
    const name = document.createElement("span");
    name.textContent = "📎 " + file.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "إزالة الملف");
    remove.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      renderSelectedFiles();
    });
    chip.append(name, remove);
    attachmentList.appendChild(chip);
  });
  attachmentList.classList.toggle("has-files", selectedFiles.length > 0);
}

attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const incoming = [...fileInput.files];
  for (const file of incoming) {
    if (selectedFiles.length >= 3) {
      alert("يمكنك إرفاق 3 ملفات كحد أقصى في الرسالة الواحدة.");
      break;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("الحد الأقصى لحجم الملف الواحد 10 ميجابايت: " + file.name);
      continue;
    }
    if (!selectedFiles.some(existing => existing.name === file.name && existing.size === file.size)) {
      selectedFiles.push(file);
    }
  }
  fileInput.value = "";
  renderSelectedFiles();
});

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

// Voice input: keep each SpeechRecognition result by its stable index.
// This prevents Chrome's repeated onresult events from appending the same words again.
let speechFinalParts = [];
let speechInterimParts = [];

function normalizeSpeechPart(value) {
  return (value || "").replace(/\\s+/g, " ").trim();
}

function renderSpeechTranscript() {
  const parts = [];
  const count = Math.max(speechFinalParts.length, speechInterimParts.length);
  for (let i = 0; i < count; i++) {
    const part = normalizeSpeechPart(speechFinalParts[i] || speechInterimParts[i] || "");
    if (!part) continue;
    const previous = parts[parts.length - 1];
    // Ignore an identical adjacent segment if the browser reports it twice.
    if (previous && previous.replace(/[.,!?؟،؛:]+$/g, "") === part.replace(/[.,!?؟،؛:]+$/g, "")) continue;
    parts.push(part);
  }

  const spokenText = parts.join(" ");
  input.value = [speechBaseText, spokenText].filter(Boolean).join(speechBaseText ? " " : "");
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
}

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
  speechFinalParts = [];
  speechInterimParts = [];

  speechRecognition.onstart = () => {
    speechHadError = false;
    isRecording = true;
    micBtn.classList.add("recording");
    micBtn.setAttribute("aria-pressed", "true");
    micBtn.title = preferences.language === "en" ? "Stop recording" : "إيقاف التسجيل";
    micStatus.textContent = preferences.language === "en" ? "Listening… speak now" : "جاري الاستماع… اتكلم دلوقتي";
  };

  speechRecognition.onresult = event => {
    // Update only the changed result slots. Never concatenate the full results
    // array on every event, because Chrome sends previous results again.
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const phrase = normalizeSpeechPart(result[0]?.transcript || "");
      if (result.isFinal) {
        speechFinalParts[i] = phrase;
        speechInterimParts[i] = "";
      } else {
        speechInterimParts[i] = phrase;
      }
    }
    renderSpeechTranscript();
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
  closeHistoryPanel();
});

document.getElementById("clearChat").addEventListener("click", () => {
  if (isTyping) return;
  if (activeChatId) {
    deleteConversation(activeChatId);
    return;
  }
  if (!messages.length) return;
  if (confirm(preferences.language === "en" ? "Clear this unsaved conversation?" : "تمسح المحادثة الحالية غير المحفوظة؟")) {
    messages = [];
    renderMessages();
  }
});

function closeHistoryPanel() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.remove("open", "history-open");
  sidebar.classList.add("collapsed");
}

document.getElementById("menuBtn").addEventListener("click", event => {
  event.stopPropagation();
  const sidebar = document.querySelector(".sidebar");
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  if (isMobile) {
    const opening = !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", opening);
    sidebar.classList.toggle("history-open", opening);
  } else {
    const opening = sidebar.classList.contains("collapsed");
    sidebar.classList.toggle("collapsed", !opening);
    sidebar.classList.toggle("history-open", opening);
  }
});

document.addEventListener("click", event => {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar.classList.contains("history-open")) return;
  if (sidebar.contains(event.target) || event.target.closest("#menuBtn")) return;
  closeHistoryPanel();
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

googleLoginBtn.addEventListener("click", async () => {
  googleLoginBtn.disabled = true;
  setAuthMessage("جارٍ تحويلك إلى Google...");
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://amr-1-one.github.io/NEXORA-AI/"
      }
    });
    if (error) throw error;
  } catch (error) {
    setAuthMessage(error.message || "تعذّر بدء تسجيل الدخول باستخدام Google.", true);
    googleLoginBtn.disabled = false;
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


// PWA install prompt (kept separate from chat/auth logic).
(() => {
  const installButton = document.getElementById("installAppBtn");
  if (!installButton) return;

  let installPrompt = null;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    installButton.hidden = true;
    return;
  }

  installButton.hidden = false;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!installPrompt) {
      alert("لتثبيت NEXORA AI: افتح قائمة المتصفح ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».");
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
  });
})();

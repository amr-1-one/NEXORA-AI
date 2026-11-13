// NEXORA AI - Supabase authentication and per-user conversations
const API_URL = "https://nexora-ai.egyptianshops1.workers.dev";
const SUPABASE_URL = "https://phnknceukzdsaibaoklx.supabase.co";
const SUPABASE_KEY = "sb_publishable_6Ox7ZfOWOE5iFJFus2MsTw_aedbJSU9";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("chatForm");
const input = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const stopBtn = document.getElementById("stopBtn");
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
let activeRequestController = null;
let activeRequestWaiting = null;
let activeTypingStop = null;
let typingTimer = null;
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
  const chatSearch = document.getElementById("chatSearch");
  if (chatSearch) chatSearch.placeholder = isEnglish ? "Search your conversations..." : "ابحث في محادثاتك...";
  const createFolder = document.getElementById("createFolderBtn");
  if (createFolder) createFolder.textContent = isEnglish ? "＋ New folder" : "＋ مجلد جديد";
  const memoryButton = document.getElementById("openMemoryBtn");
  if (memoryButton) memoryButton.textContent = isEnglish ? "🧠 My memory" : "🧠 ذاكرتي";
  if (!document.getElementById("memoryModal")?.classList.contains("hidden")) renderNexoraMemory();
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


let chatOrganization={folders:[],pinnedIds:[],folderByChat:{},titleOverrides:{}};
let activeFolderFilter="all",chatSearchQuery="";
function normalizeChatOrganization(value){
 const d=value&&typeof value==="object"?value:{};
 return {folders:Array.isArray(d.folders)?[...new Set(d.folders.filter(x=>typeof x==="string"&&x.trim()))]:[],pinnedIds:Array.isArray(d.pinnedIds)?[...new Set(d.pinnedIds)]:[],folderByChat:d.folderByChat&&typeof d.folderByChat==="object"?d.folderByChat:{},titleOverrides:d.titleOverrides&&typeof d.titleOverrides==="object"?d.titleOverrides:{}};
}
function loadChatOrganization(){
 activeFolderFilter="all";
 if(currentUser)chatOrganization=normalizeChatOrganization(currentUser.user_metadata?.nexora_chat_organization);
 else{try{chatOrganization=normalizeChatOrganization(JSON.parse(localStorage.getItem("nexora-chat-organization")||"{}"));}catch{chatOrganization=normalizeChatOrganization({});}}
}
async function saveChatOrganization(){
 chatOrganization=normalizeChatOrganization(chatOrganization);
 if(!currentUser){localStorage.setItem("nexora-chat-organization",JSON.stringify(chatOrganization));return;}
 const {data,error}=await supabaseClient.auth.updateUser({data:{...(currentUser.user_metadata||{}),nexora_chat_organization:chatOrganization}});
 if(error){console.error("Save chat organization error:",error);alert((preferences.language==="en"?"Could not save chat organization: ":"تعذّر حفظ تنظيم المحادثات: ")+error.message);return;}
 if(data?.user)currentUser=data.user;
}
function chatTextMatches(chat,query){
 if(!query)return true;
 return [chat.title,...(chat.messages||[]).map(m=>m.text||"")].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase());
}
function renderFolderFilters(){
 const el=document.getElementById("folderFilters");if(!el)return;el.innerHTML="";
 const en=preferences.language==="en";
 [{id:"all",label:en?"All":"الكل"},...chatOrganization.folders.map(name=>({id:name,label:"📁 "+name}))].forEach(folder=>{
  const b=document.createElement("button");b.type="button";b.className="folder-filter"+(activeFolderFilter===folder.id?" active":"");b.textContent=folder.label;
  b.addEventListener("click",()=>{activeFolderFilter=folder.id;renderHistory();});el.appendChild(b);
 });
}
async function createChatFolder(){
 const en=preferences.language==="en",name=prompt(en?"Enter a folder name:":"اكتب اسم المجلد الجديد:");
 if(!name||!name.trim())return;const clean=name.trim().slice(0,32);
 if(chatOrganization.folders.some(x=>x.toLocaleLowerCase()===clean.toLocaleLowerCase())){alert(en?"This folder already exists.":"هذا المجلد موجود بالفعل.");return;}
 chatOrganization.folders.push(clean);activeFolderFilter=clean;await saveChatOrganization();renderHistory();
}
async function renameConversation(id){
 if(isTyping)return;const chat=conversations.find(x=>x.id===id);if(!chat)return;
 const en=preferences.language==="en",value=prompt(en?"New conversation name:":"اكتب الاسم الجديد للمحادثة:",chat.title||"");
 if(!value||!value.trim())return;const title=value.trim().slice(0,80);
 chatOrganization.titleOverrides[id]=title;chat.title=title;
 if(currentUser){const {error}=await supabaseClient.from("nexora_chats").update({title}).eq("id",id).eq("user_id",currentUser.id);if(error){alert((en?"Could not rename conversation: ":"تعذّر تغيير اسم المحادثة: ")+error.message);return;}}
 else saveGuestChats();
 await saveChatOrganization();renderHistory();
}
async function togglePinnedConversation(id){
 const ids=new Set(chatOrganization.pinnedIds);if(ids.has(id))ids.delete(id);else ids.add(id);
 chatOrganization.pinnedIds=[...ids];await saveChatOrganization();renderHistory();
}
async function moveConversationToFolder(id){
 const en=preferences.language==="en",none=en?"No folder":"بدون مجلد";
 const value=prompt((en?"Type a folder name, or ":"اكتب اسم المجلد، أو ")+none+":\n"+[none,...chatOrganization.folders].join("\n"),chatOrganization.folderByChat[id]||none);
 if(value===null)return;const name=value.trim();
 if(!name||name===none)delete chatOrganization.folderByChat[id];
 else{const clean=name.slice(0,32);if(!chatOrganization.folders.includes(clean))chatOrganization.folders.push(clean);chatOrganization.folderByChat[id]=clean;}
 await saveChatOrganization();renderHistory();
}


let nexoraMemory = [];

function normalizeNexoraMemory(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(item => typeof item === "string").map(item => item.trim()).filter(Boolean))].slice(0, 30);
}
function loadNexoraMemory() {
  if (currentUser) {
    nexoraMemory = normalizeNexoraMemory(currentUser.user_metadata?.nexora_memory);
  } else {
    try { nexoraMemory = normalizeNexoraMemory(JSON.parse(localStorage.getItem("nexora-memory") || "[]")); }
    catch { nexoraMemory = []; }
  }
}
async function saveNexoraMemory() {
  nexoraMemory = normalizeNexoraMemory(nexoraMemory);
  if (!currentUser) {
    localStorage.setItem("nexora-memory", JSON.stringify(nexoraMemory));
    return true;
  }
  const { data, error } = await supabaseClient.auth.updateUser({
    data: { ...(currentUser.user_metadata || {}), nexora_memory: nexoraMemory }
  });
  if (error) {
    console.error("Save NEXORA memory error:", error);
    alert((preferences.language === "en" ? "Could not save memory: " : "تعذّر حفظ الذاكرة: ") + error.message);
    return false;
  }
  if (data?.user) currentUser = data.user;
  return true;
}
function getNexoraMemoryContext() {
  if (!nexoraMemory.length) return "";
  const facts = nexoraMemory.map((item, index) => (index + 1) + ". " + item).join("\n");
  return preferences.language === "en"
    ? "\n\n[Saved user memory — use these facts only when relevant, do not invent details, and do not repeat the list unless asked:\n" + facts + "]"
    : "\n\n[ذاكرة محفوظة عن المستخدم — استخدم هذه المعلومات فقط عندما تكون ذات صلة، ولا تخترع معلومات إضافية، ولا تسرد الذاكرة إلا إذا طُلب منك ذلك:\n" + facts + "]";
}
function extractExplicitMemory(text) {
  const value = String(text || "").trim();
  if (!value) return null;
  let match = value.match(/^(?:أنا\s+)?اسمي\s+(.{1,50})$/i);
  if (match) return "اسم المستخدم: " + match[1].replace(/[.!؟?،,]+$/g, "").trim();
  match = value.match(/^(?:my name is|i am|i'm)\s+([a-z][a-z0-9 _'-]{0,38})[.!?]*$/i);
  if (match) return "User's name: " + match[1].trim();
  match = value.match(/^(?:افتكر(?:\s+إن)?|احفظ(?:\s+إن)?|خلي بالك(?:\s+إن)?|تذكر(?:\s+أن)?|remember(?:\s+that)?|please remember(?:\s+that)?)\s+(.{3,160})$/i);
  if (match) return match[1].trim();
  return null;
}
async function rememberFromUserMessage(text) {
  const fact = extractExplicitMemory(text);
  if (!fact) return;
  const exists = nexoraMemory.some(item => item.toLocaleLowerCase() === fact.toLocaleLowerCase());
  if (exists) return;
  nexoraMemory.unshift(fact);
  nexoraMemory = nexoraMemory.slice(0, 30);
  await saveNexoraMemory();
}
function renderNexoraMemory() {
  const list = document.getElementById("memoryList");
  if (!list) return;
  list.innerHTML = "";
  const en = preferences.language === "en";
  if (!nexoraMemory.length) {
    const empty = document.createElement("p");
    empty.className = "memory-empty";
    empty.textContent = en ? "No saved memories yet. Tell NEXORA “remember that…” or add one above." : "لا توجد ذكريات محفوظة بعد. قل لـ NEXORA «افتكر إن…» أو أضف معلومة من الأعلى.";
    list.appendChild(empty);
  }
  nexoraMemory.forEach((fact, index) => {
    const row = document.createElement("div");
    row.className = "memory-item";
    const text = document.createElement("span");
    text.textContent = fact;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "memory-remove-btn";
    remove.textContent = "×";
    remove.title = en ? "Delete memory" : "حذف الذكرى";
    remove.addEventListener("click", async () => {
      nexoraMemory.splice(index, 1);
      if (await saveNexoraMemory()) renderNexoraMemory();
    });
    row.append(text, remove);
    list.appendChild(row);
  });
  const status = document.getElementById("memoryStatus");
  if (status) status.textContent = currentUser
    ? (en ? "Memories sync with your signed-in account." : "ذكرياتك متزامنة مع حسابك وتظهر في محادثاتك الجديدة.")
    : (en ? "Guest memories are stored on this device only. Sign in to sync across devices." : "ذكريات الزائر محفوظة على هذا الجهاز فقط. سجّل الدخول لمزامنتها بين أجهزتك.");
  const title = document.getElementById("memoryTitle");
  if (title) title.textContent = en ? "NEXORA Memory" : "ذاكرة NEXORA";
  const subtitle = document.getElementById("memorySubtitle");
  if (subtitle) subtitle.textContent = en ? "Facts you choose to save for future conversations." : "معلومات توافق على حفظها لتتذكرها NEXORA في المحادثات الجديدة.";
  const add = document.getElementById("memoryAddBtn");
  if (add) add.textContent = en ? "Add" : "إضافة";
  const input = document.getElementById("memoryInput");
  if (input) input.placeholder = en ? "Example: My name is King; I prefer short explanations" : "مثال: اسمي كينج، وأفضل الشرح المختصر";
  const clear = document.getElementById("memoryClearBtn");
  if (clear) clear.textContent = en ? "Clear all memories" : "مسح كل الذكريات";
}
async function addManualMemory() {
  const input = document.getElementById("memoryInput");
  const fact = input.value.trim().slice(0, 180);
  if (!fact) return;
  if (nexoraMemory.some(item => item.toLocaleLowerCase() === fact.toLocaleLowerCase())) {
    alert(preferences.language === "en" ? "This memory already exists." : "المعلومة دي محفوظة بالفعل.");
    return;
  }
  nexoraMemory.unshift(fact);
  nexoraMemory = nexoraMemory.slice(0, 30);
  if (await saveNexoraMemory()) {
    input.value = "";
    renderNexoraMemory();
  } else nexoraMemory.shift();
}
async function clearNexoraMemory() {
  if (!confirm(preferences.language === "en" ? "Delete all saved memories?" : "هل تريد مسح كل الذكريات المحفوظة؟")) return;
  const previous = nexoraMemory;
  nexoraMemory = [];
  if (await saveNexoraMemory()) renderNexoraMemory();
  else nexoraMemory = previous;
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
  loadChatOrganization();

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
      title: chatOrganization.titleOverrides[chat.id] || chat.title || "محادثة جديدة",
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

  const chatId = activeChatId || crypto.randomUUID();
  activeChatId = chatId;
  const previousChat = conversations.find(item => item.id === chatId);
  const generatedTitle = messages.find(message => message.role === "user")?.text.slice(0, 35) || "محادثة جديدة";
  const title = chatOrganization.titleOverrides[chatId] || previousChat?.title || generatedTitle;
  const chat = {
    ...(previousChat || {}),
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
  chatOrganization.pinnedIds = chatOrganization.pinnedIds.filter(id => id !== chatId);
  delete chatOrganization.folderByChat[chatId];
  delete chatOrganization.titleOverrides[chatId];
  await saveChatOrganization();
  if (!currentUser) saveGuestChats();

  if (activeChatId === chatId) {
    activeChatId = null;
    messages = [];
    renderMessages();
  }

  renderHistory();
}

function renderHistory(){
 historyEl.innerHTML="";
 renderFolderFilters();
 const pinned=new Set(chatOrganization.pinnedIds);
 const list=conversations.filter(c=>activeFolderFilter==="all"||chatOrganization.folderByChat[c.id]===activeFolderFilter)
 .filter(c=>chatTextMatches(c,chatSearchQuery))
 .sort((a,b)=>(Number(pinned.has(b.id))-Number(pinned.has(a.id)))||((b.updatedAt||0)-(a.updatedAt||0)));
 if(!list.length){
  const e=document.createElement("div");
  e.className="history-empty";
  e.textContent=preferences.language==="en"?"No matching conversations.":"لا توجد محادثات مطابقة.";
  historyEl.appendChild(e);
  return;
 }
 list.forEach(chat=>{
  const row=document.createElement("div");
  row.className="history-row";
  if(chat.id===activeChatId)row.classList.add("active");
  const open=document.createElement("button");
  open.className="history-item";
  open.type="button";
  open.textContent=(pinned.has(chat.id)?"📌 ":"")+(chat.title||(preferences.language==="en"?"New chat":"محادثة جديدة"));
  open.title=chat.title||"";
  if(chat.id===activeChatId)open.classList.add("active");
  open.addEventListener("click",()=>{
   if(isTyping)return;
   activeChatId=chat.id;
   messages=[...(chat.messages||[])];
   renderMessages();
   renderHistory();
   closeHistoryPanel();
  });

  const menuWrap=document.createElement("div");
  menuWrap.className="history-menu-wrap";
  const menuButton=document.createElement("button");
  menuButton.type="button";
  menuButton.className="history-menu-trigger";
  menuButton.textContent="⋮";
  menuButton.title=preferences.language==="en"?"Conversation options":"خيارات المحادثة";
  menuButton.setAttribute("aria-label",menuButton.title);
  menuButton.setAttribute("aria-expanded","false");
  menuButton.addEventListener("click",event=>{
   event.stopPropagation();
   const wasOpen=menuWrap.classList.contains("menu-open");
   historyEl.querySelectorAll(".history-menu-wrap.menu-open").forEach(el=>{
    el.classList.remove("menu-open");
    el.querySelector(".history-menu-trigger")?.setAttribute("aria-expanded","false");
   });
   if(!wasOpen){
    menuWrap.classList.add("menu-open");
    menuButton.setAttribute("aria-expanded","true");
   }
  });

  const actions=document.createElement("div");
  actions.className="history-actions";
  const action=(symbol,title,handler,cls="history-action")=>{
   const b=document.createElement("button");
   b.type="button";
   b.className=cls;
   b.textContent=symbol+"  "+title;
   b.title=title;
   b.setAttribute("aria-label",title);
   b.addEventListener("click",event=>{
    event.stopPropagation();
    menuWrap.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded","false");
    handler();
   });
   return b;
  };
  actions.append(
   action(pinned.has(chat.id)?"📌":"☆",preferences.language==="en"?(pinned.has(chat.id)?"Unpin":"Pin"):(pinned.has(chat.id)?"إلغاء التثبيت":"تثبيت"),()=>togglePinnedConversation(chat.id)),
   action("✎",preferences.language==="en"?"Rename":"إعادة التسمية",()=>renameConversation(chat.id)),
   action("📁",preferences.language==="en"?"Move to folder":"نقل إلى مجلد",()=>moveConversationToFolder(chat.id)),
   action("⌫",preferences.language==="en"?"Delete conversation":"حذف المحادثة",()=>deleteConversation(chat.id),"history-action history-delete")
  );
  menuWrap.append(menuButton,actions);
  row.append(open,menuWrap);
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
let activeSpeechAudio = null;
let activeSpeechUrl = null;
let speechRunId = 0;

function cleanTextForSpeech(value) {
  const codeFence = new RegExp("\\x60{3}[\s\\S]*?\\x60{3}", "g");
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

function stopAssistantSpeech() {
  if (activeSpeechAudio) {
    activeSpeechAudio.pause();
    activeSpeechAudio.removeAttribute("src");
    activeSpeechAudio.load();
    activeSpeechAudio = null;
  }
  if (activeSpeechUrl) {
    URL.revokeObjectURL(activeSpeechUrl);
    activeSpeechUrl = null;
  }
  if (activeSpeakButton) activeSpeakButton.classList.remove("speaking");
  activeSpeakButton = null;
}

async function speakAssistantMessage(message, button) {
  if (activeSpeakButton === button && activeSpeechAudio) {
    speechRunId++;
    stopAssistantSpeech();
    micStatus.textContent = "";
    return;
  }

  speechRunId++;
  const thisRun = speechRunId;
  stopAssistantSpeech();

  const textToRead = cleanTextForSpeech(message?.text);
  if (!textToRead) {
    micStatus.textContent = preferences.language === "en"
      ? "There is no text to read."
      : "الرد ده مفيهوش نص أقدر أقراه.";
    return;
  }
  if (textToRead.length > 5000) {
    micStatus.textContent = preferences.language === "en"
      ? "This answer is too long to read at once. Try a shorter answer."
      : "الرد طويل جدًا للقراءة مرة واحدة. اطلب تلخيصه أو تقسيمه.";
    return;
  }

  activeSpeakButton = button;
  button.classList.add("speaking");
  button.title = preferences.language === "en" ? "Preparing audio…" : "جاري تجهيز الصوت…";
  micStatus.textContent = preferences.language === "en" ? "Preparing audio…" : "جاري تجهيز الصوت…";

  const finish = (errorMessage = "") => {
    if (thisRun !== speechRunId) return;
    stopAssistantSpeech();
    button.title = preferences.language === "en" ? "Read answer aloud" : "قراءة الرد بصوت";
    if (errorMessage) micStatus.textContent = errorMessage;
    else micStatus.textContent = "";
  };

  try {
    // TTS is available to signed-in users only. The Worker verifies this token.
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error(preferences.language === "en"
        ? "Sign in to use voice reading."
        : "سجّل الدخول أولًا لاستخدام القراءة الصوتية.");
    }

    const response = await fetch(API_URL + "/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + accessToken
      },
      body: JSON.stringify({ text: textToRead })
    });

    if (thisRun !== speechRunId) return;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || (preferences.language === "en"
        ? "Audio generation failed."
        : "تعذّر إنشاء الصوت."));
    }

    const audioBlob = await response.blob();
    if (!audioBlob.size) throw new Error(preferences.language === "en"
      ? "The audio response was empty."
      : "ملف الصوت وصل فارغ.");

    if (thisRun !== speechRunId) return;

    activeSpeechUrl = URL.createObjectURL(audioBlob);
    activeSpeechAudio = new Audio(activeSpeechUrl);
    activeSpeechAudio.preload = "auto";
    activeSpeechAudio.onended = () => finish();
    activeSpeechAudio.onerror = () => finish(preferences.language === "en"
      ? "Could not play the generated audio."
      : "تعذّر تشغيل الملف الصوتي.");

    await activeSpeechAudio.play();
    if (thisRun === speechRunId) {
      button.title = preferences.language === "en" ? "Stop reading" : "إيقاف القراءة";
      micStatus.textContent = "";
    }
  } catch (error) {
    finish((preferences.language === "en" ? "Audio error: " : "مشكلة في الصوت: ") +
      (error?.message || "Unknown error"));
  }
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

function makeFeedbackControls(message) {
  const wrap = document.createElement("div");
  wrap.className = "assistant-feedback";
  const isEnglish = preferences.language === "en";
  const feedbackChatId = activeChatId;

  if (message.feedbackSubmitted) {
    const done = document.createElement("span");
    done.className = "feedback-status";
    done.textContent = isEnglish ? "Thanks for your feedback" : "شكرًا على تقييمك";
    wrap.appendChild(done);
    return wrap;
  }

  const prompt = document.createElement("span");
  prompt.className = "feedback-prompt";
  prompt.textContent = isEnglish ? "Was this answer helpful?" : "هل كان الرد مفيدًا؟";

  const positive = document.createElement("button");
  positive.type = "button";
  positive.className = "feedback-choice";
  positive.textContent = isEnglish ? "Helpful" : "مفيد";

  const negative = document.createElement("button");
  negative.type = "button";
  negative.className = "feedback-choice";
  negative.textContent = isEnglish ? "Not helpful" : "غير مفيد";

  const status = document.createElement("span");
  status.className = "feedback-status";

  const saveFeedback = async (rating, reason = "") => {
    positive.disabled = true;
    negative.disabled = true;
    status.textContent = isEnglish ? "Sending…" : "جارٍ الإرسال…";
    const { error } = await supabaseClient.from("nexora_feedback").insert({
      user_id: currentUser?.id || null,
      chat_id: feedbackChatId || null,
      message_text: String(message.text || "").slice(0, 5000),
      rating,
      reason: reason.trim() ? reason.trim().slice(0, 500) : null
    });

    if (error) {
      positive.disabled = false;
      negative.disabled = false;
      status.textContent = isEnglish ? "Could not send. Try again." : "تعذّر إرسال التقييم. حاول مرة أخرى.";
      console.error("Feedback save error:", error);
      return;
    }

    message.feedbackSubmitted = true;
    message.feedbackRating = rating;
    status.textContent = isEnglish ? "Thanks for your feedback" : "شكرًا على تقييمك";
    prompt.remove();
    positive.remove();
    negative.remove();
    form?.remove();
    if (activeChatId === feedbackChatId) await persistCurrent();
  };

  let form = null;
  positive.addEventListener("click", () => saveFeedback("positive"));
  negative.addEventListener("click", () => {
    if (form) return;
    form = document.createElement("div");
    form.className = "feedback-report-form";
    const reason = document.createElement("textarea");
    reason.maxLength = 500;
    reason.rows = 2;
    reason.placeholder = isEnglish
      ? "What was wrong with this answer? (optional)"
      : "إيه المشكلة في الرد؟ (اختياري)";
    const submit = document.createElement("button");
    submit.type = "button";
    submit.className = "feedback-choice feedback-submit";
    submit.textContent = isEnglish ? "Send report" : "إرسال البلاغ";
    submit.addEventListener("click", () => {
      submit.disabled = true;
      saveFeedback("negative", reason.value).finally(() => { submit.disabled = false; });
    });
    form.append(reason, submit);
    wrap.appendChild(form);
    reason.focus();
  });

  wrap.append(prompt, positive, negative, status);
  return wrap;
}

function appendTextWithLinks(container, text) {
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<]+)/gi;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    let urlText = match[3] || match[0];
    let trailing = "";
    while (/[.,!?؟،؛:)}\]]$/.test(urlText)) {
      trailing = urlText.slice(-1) + trailing;
      urlText = urlText.slice(0, -1);
    }

    try {
      const parsed = new URL(urlText);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        const link = document.createElement("a");
        link.href = parsed.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "assistant-link";
        link.textContent = match[2] || (/^https?:\/\/wa\.me\//i.test(urlText)
          ? (preferences.language === "en" ? "Open WhatsApp chat" : "اضغط هنا للتواصل عبر واتساب")
          : urlText);
        container.appendChild(link);
      } else {
        container.appendChild(document.createTextNode(match[0]));
      }
    } catch {
      container.appendChild(document.createTextNode(match[0]));
    }

    if (trailing) container.appendChild(document.createTextNode(trailing));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
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
        appendTextWithLinks(textPart, line);
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
  actions.appendChild(makeFeedbackControls(message));
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

function isImageGenerationRequest(prompt) {
  return /(?:اعمل|أنشئ|انشئ|ولد|ولّد|ارسم|صمم|صمّم|ابتكر|اصنع|اعملي|اعمللي).{0,35}(?:صورة|صور|رسمة|تصميم)|(?:صورة|رسمة|تصميم).{0,30}(?:من|لـ|عن|توضح|تُظهر)|(?:generate|create|make|draw|design).{0,30}(?:an? image|picture|illustration|artwork)/i.test(prompt || "");
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
    let settled = false;
    const finish = (content) => {
      if (settled) return;
      settled = true;
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = null;
      const message = { role: "assistant", text: content };
      if (content.trim()) messages.push(message);
      bubble.textContent = "";
      if (content.trim()) renderAssistantContent(bubble, message);
      else row.remove();
      activeTypingStop = null;
      persistCurrent();
      resolve();
    };
    activeTypingStop = () => finish(bubble.textContent || "");
    function showNextLine() {
      if (settled) return;
      if (index >= lines.length) {
        finish(text);
        return;
      }
      if (index > 0) bubble.textContent += "\n";
      bubble.textContent += lines[index++];
      scrollToBottom();
      typingTimer = setTimeout(showNextLine, 15);
    }
    showNextLine();
  });
}

function stopAssistantResponse() {
  if (!isTyping) return;
  if (activeRequestController) {
    activeRequestController.abort();
    activeRequestController = null;
  }
  if (activeRequestWaiting) {
    activeRequestWaiting.remove();
    activeRequestWaiting = null;
  }
  if (activeTypingStop) activeTypingStop();
  // Keep the composer locked until the aborted request reaches its finally block.
  input.focus();
}

if (stopBtn) stopBtn.addEventListener("click", stopAssistantResponse);

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

  // Route text-only image generation requests to the dedicated image endpoint.
  if (!imageAttachments.length && isImageGenerationRequest(originalPrompt)) {
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
    waitingBubble.textContent = "جارٍ إنشاء الصورة... قد يستغرق ذلك بعض الوقت.";
    scrollToBottom();

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch(API_URL + "/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { "Authorization": "Bearer " + accessToken } : {})
        },
        body: JSON.stringify({ prompt: originalPrompt })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذّر إنشاء الصورة: " + response.status);
      if (!data.image?.data) throw new Error("الخادم لم يرجع صورة مولّدة.");

      waiting.remove();
      const mimeType = data.image.mimeType || "image/png";
      const imageDataUrl = "data:" + mimeType + ";base64," + data.image.data;
      await typeAssistantImageMessage(data.reply || "تم إنشاء الصورة بنجاح.", imageDataUrl);
    } catch (error) {
      if (waiting) waiting.remove();
      addMessage("assistant", "تعذّر إنشاء الصورة: " + error.message);
      await persistCurrent();
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
    await rememberFromUserMessage(originalPrompt);
    const memoryContext = getNexoraMemoryContext();

    activeRequestController = new AbortController();
    activeRequestWaiting = waiting;
    stopBtn.hidden = false;
    const response = await fetch(API_URL + "/api/chat", {
      signal: activeRequestController.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { "Authorization": "Bearer " + accessToken } : {})
      },
      body: JSON.stringify({
        messages: messages.slice(-12).map((message, index, recentMessages) => ({
          role: message.role === "assistant" ? "model" : "user",
          text: message.text + (index === recentMessages.length - 1 && message.role !== "assistant"
            ? "\n\n" + getResponseLengthInstruction() + memoryContext
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
    if (error?.name !== "AbortError") {
      waiting.remove();
      addMessage("assistant", "حدث خطأ: " + error.message + "\nتأكد من اتصال الخادم وإعدادات Gemini.");
      await persistCurrent();
    }
  } finally {
    activeRequestController = null;
    activeRequestWaiting = null;
    stopBtn.hidden = true;
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
  return (value || "").replace(/\s+/g, " ").trim();
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

const chatSearchInput=document.getElementById("chatSearch");
if(chatSearchInput)chatSearchInput.addEventListener("input",()=>{chatSearchQuery=chatSearchInput.value.trim();renderHistory();});
const createFolderButton=document.getElementById("createFolderBtn");
if(createFolderButton)createFolderButton.addEventListener("click",createChatFolder);

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
document.getElementById("openMemoryBtn").addEventListener("click", () => {
  loadNexoraMemory();
  renderNexoraMemory();
  document.getElementById("memoryModal").classList.remove("hidden");
});
document.getElementById("memoryClose").addEventListener("click", () => document.getElementById("memoryModal").classList.add("hidden"));
document.getElementById("memoryModal").addEventListener("click", event => {
  if (event.target.id === "memoryModal") event.currentTarget.classList.add("hidden");
});
document.getElementById("memoryAddBtn").addEventListener("click", addManualMemory);
document.getElementById("memoryInput").addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); addManualMemory(); }
});
document.getElementById("memoryClearBtn").addEventListener("click", clearNexoraMemory);

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
  loadNexoraMemory();
  updateProfile();

  // Run data requests after the auth callback releases Supabase's internal lock.
  setTimeout(async () => {
    if (currentUser) {
      await loadUserChats();
      closeAuthModal();
    } else {
      loadChatOrganization();
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
  loadNexoraMemory();
  updateProfile();

  if (currentUser) {
    await loadUserChats();
  } else {
    loadChatOrganization();
    conversations = readGuestChats();
    renderHistory();
    renderMessages();
  }
}

initializeApp();


// NEXORA icon picker: choose an icon before installing the PWA.
(() => {
  const names = ["Orbit", "Prism", "Halo", "Hex", "Rise", "Noir"];
  const iconPath = (n) => `./icons/nexora-style-${n}.svg`;
  const manifestPath = (n) => `./manifest-style-${n}.json`;
  const manifestLink = document.getElementById("appManifest");
  const chooserButton = document.getElementById("chooseAppIconBtn");
  if (!chooserButton || !manifestLink) return;
  let selected = Math.min(6, Math.max(1, Number(localStorage.getItem("nexora-app-icon") || 1)));
  const installed = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const applySelection = () => {
    manifestLink.href = manifestPath(selected);
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement("link");
      appleIcon.rel = "apple-touch-icon";
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = iconPath(selected);
  };
  applySelection();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop hidden";
  backdrop.id = "iconPickerModal";
  backdrop.innerHTML = `<section class="icon-picker-modal" role="dialog" aria-modal="true" aria-labelledby="iconPickerTitle">
    <div class="icon-picker-head"><h2 id="iconPickerTitle">اختار أيقونة NEXORA</h2><button class="icon-picker-close" type="button" aria-label="إغلاق">×</button></div>
    <p class="icon-picker-note">اختار الشكل اللي يعجبك. الأفضل تختار الأيقونة قبل تثبيت التطبيق.</p>
    <div class="icon-picker-grid">${names.map((name,i)=>`<button class="icon-choice" type="button" data-icon="${i+1}"><img src="${iconPath(i+1)}" alt=""><span>${name}</span></button>`).join("")}</div>
    <p class="icon-picker-status" aria-live="polite"></p>
  </section>`;
  document.body.appendChild(backdrop);
  const status = backdrop.querySelector(".icon-picker-status");
  const render = () => {
    backdrop.querySelectorAll(".icon-choice").forEach(button => {
      const active = Number(button.dataset.icon) === selected;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };
  const open = () => { render(); status.textContent = installed() ? "التطبيق مثبت بالفعل. تغيير الأيقونة يتطلب إزالة التطبيق من الشاشة الرئيسية ثم تثبيته مرة أخرى بعد اختيار الأيقونة." : "تم حفظ اختيارك على هذا الجهاز. ثبّت التطبيق بعد الاختيار لاستخدام الأيقونة الجديدة."; backdrop.classList.remove("hidden"); };
  const close = () => backdrop.classList.add("hidden");
  chooserButton.addEventListener("click", open);
  backdrop.querySelector(".icon-picker-close").addEventListener("click", close);
  backdrop.addEventListener("click", event => { if (event.target === backdrop) close(); });
  backdrop.querySelectorAll(".icon-choice").forEach(button => button.addEventListener("click", () => {
    selected = Number(button.dataset.icon);
    localStorage.setItem("nexora-app-icon", String(selected));
    applySelection();
    render();
    status.textContent = installed() ? "تم حفظ الاختيار. لتظهر الأيقونة الجديدة، أزل نسخة NEXORA المثبتة ثم أعد تثبيتها." : "تم اختيار الأيقونة! يمكنك الآن تثبيت NEXORA بها.";
  }));
})();
 
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


// Close conversation menus when the user clicks elsewhere or presses Escape.
document.addEventListener("click", event => {
 if (event.target.closest(".history-menu-wrap")) return;
 document.querySelectorAll(".history-menu-wrap.menu-open").forEach(el => {
  el.classList.remove("menu-open");
  el.querySelector(".history-menu-trigger")?.setAttribute("aria-expanded","false");
 });
});
document.addEventListener("keydown", event => {
 if (event.key !== "Escape") return;
 document.querySelectorAll(".history-menu-wrap.menu-open").forEach(el => {
  el.classList.remove("menu-open");
  el.querySelector(".history-menu-trigger")?.setAttribute("aria-expanded","false");
 });
});

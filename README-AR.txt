AMR AI — النسخة الأولى
======================

محتويات المشروع:
- index.html و style.css و app.js: واجهة الموقع.
- worker/index.js: خادم Cloudflare Worker.
- worker/wrangler.toml: إعدادات Worker.

الخطوة 1 — افتح المجلد في Visual Studio Code
افتح VS Code ثم File > Open Folder واختر مجلد amr-ai-v1.

الخطوة 2 — أنشئ مفتاح Gemini API
افتح https://aistudio.google.com/app/apikey
أنشئ مفتاح API. لا تضع المفتاح في app.js أو أي ملف داخل الواجهة.

الخطوة 3 — انشر الخادم
1. افتح مجلد worker في Terminal.
2. ثبّت Node.js إذا لم يكن مثبتًا.
3. نفّذ:
   npm install -g wrangler
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY
4. الصق مفتاح Gemini عندما يطلبه منك Wrangler.
5. انشر:
   npx wrangler deploy

بعد النشر انسخ رابط Worker الذي يظهر لك.

الخطوة 4 — اربط الواجهة بالخادم
افتح app.js في المجلد الرئيسي.
غيّر السطر:
const API_URL = "https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev";
إلى رابط Worker الحقيقي، بدون /health أو /api/chat.

الخطوة 5 — اختبر الخادم
افتح:
https://رابط-worker/health
المفروض تشوف JSON فيه:
ok: true
keyConfigured: true

الخطوة 6 — شغّل الواجهة محليًا
افتح index.html في المتصفح، أو استخدم إضافة Live Server في VS Code.

الخطوة 7 — النشر
ارفع ملفات الواجهة الرئيسية (index.html و style.css و app.js) إلى مستودع GitHub
وفعّل GitHub Pages من Settings > Pages.

ملاحظات:
- النسخة الأولى تدعم المحادثة النصية وحفظ سجل المحادثات في نفس المتصفح.
- سجل المحادثات محفوظ محليًا على الجهاز، وليس متزامنًا بين الأجهزة.
- استخدام Gemini المجاني له حدود وقد تتغير؛ راجع صفحة الأسعار والحدود الرسمية.
- لا ترفع ملفات .dev.vars أو .env أو أي مفاتيح API إلى GitHub.
- لا تضع مفتاح Gemini في app.js مطلقًا.
- هذه نسخة أولى قابلة للتطوير؛ رفع الملفات والصور والصوت والبحث المباشر ليست مفعّلة بعد.

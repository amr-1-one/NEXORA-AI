export default {
  async fetch(request, env) {
    // 1. السماح بطلبات الـ CORS عشان الموقع يقدر يكلم السيرفر
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 2. استقبال طلب الـ POST
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/chat") {
      try {
        const body = await request.json();
        const messages = body.messages || [];

        // 3. إرسال الطلب لـ Google Gemini (باستخدام موديل شغال ومستقر)
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: messages.map(m => ({
              role: m.role === "model" ? "model" : "user",
              parts: [{ text: m.text }]
            }))
          })
        });

        const data = await geminiResponse.json();

        // لو فيه خطأ راجع من جوجل، نرجعه بوضوح عشان نعرفه
        if (!geminiResponse.ok) {
          throw new Error(data.error?.message || "خطأ من جوجل API");
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً، لم أتمكن من الرد.";

        return new Response(JSON.stringify({ reply }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};

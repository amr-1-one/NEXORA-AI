export default {
  async fetch(request, env) {
    // 1. التعامل مع CORS Preflight (OPTIONS requests)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 2. التحقق أن الطلب POST وللمسار /api/chat
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/chat") {
      try {
        const body = await request.json();
        const messages = body.messages || [];

        // هنا بتبعت الطلب لـ Google Gemini API باستخدام مفتاحك المخزن في الـ Environment Variables (GEMINI_API_KEY)
      https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })) })
        });

        const data = await geminiResponse.json();
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
};export default {
  async fetch(request, env) {
    // 1. التعامل مع CORS Preflight (OPTIONS requests)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 2. التحقق أن الطلب POST وللمسار /api/chat
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/chat") {
      try {
        const body = await request.json();
        const messages = body.messages || [];

        // هنا بتبعت الطلب لـ Google Gemini API باستخدام مفتاحك المخزن في الـ Environment Variables (GEMINI_API_KEY)
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })) })
        });

        const data = await geminiResponse.json();
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

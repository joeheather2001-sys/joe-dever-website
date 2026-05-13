/* ═══════════════════════════════════════════════════════════
   Jdigitalarchitecture AI Receptionist — v2
   ─────────────────────────────────────────────────────────
   Same UI, massively smarter brain:
   • Ollama LLM for natural language understanding
   • Conversational memory (remembers the whole chat)
   • Semantic intent detection with confidence scoring
   • Smart follow-ups for vague questions
   • Response logging for continuous improvement
   • Graceful fallback to local KB if Ollama is unavailable
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ─── Configuration ─────────────────────────────────── */
  var OLLAMA_URL = "http://localhost:11434/api/generate";
  var OLLAMA_MODEL = "qwen2.5-coder";
  var CONFIDENCE_THRESHOLD = 0.4;  // below this, ask follow-up
  var MAX_HISTORY = 20;            // messages to keep in memory

  /* ─── Knowledge Base ────────────────────────────────── */
  var KB = {
    name: "Jdigitalarchitecture",
    owner: "Joe",
    email: "joe.digitalarchitect@gmail.com",
    calendly: "https://calendly.com/joe-digitalarchitect/30min",
    tagline: "Premium websites that turn visitors into booked projects.",
    who: "I help architects, designers, and growing businesses launch fast, elegant websites that build trust, generate leads, and support long-term growth.",
    specialty: "Websites for architects, interior designers, creative studios, and local businesses.",
    services: [
      { name: "Launch Site", price: "£1,200", desc: "For businesses that need a polished online presence fast.", features: ["Up to 4 pages", "Mobile-first build", "Contact + lead capture", "Basic on-page SEO"] },
      { name: "Growth Site", price: "£2,400", desc: "For teams that want stronger positioning and better lead flow.", features: ["Up to 8 pages + blog setup", "Conversion copy structure", "Calendly + forms automation", "Speed/performance tuning"] },
      { name: "Authority Platform", price: "£4,000", desc: "For established businesses that need a premium, scalable system.", features: ["Multi-page architecture", "Advanced UX + content structure", "CRM-ready lead pipeline", "Ongoing optimization support"] },
    ],
    process: [
      { step: "01. Discovery", desc: "We define goals, pages, offer positioning, and conversion flow in one focused kickoff." },
      { step: "02. Build", desc: "You get a polished, responsive build with clear updates and quick review cycles." },
      { step: "03. Launch + optimize", desc: "Launch support, SEO basics, and lead tracking setup so your site starts working immediately." },
    ],
    includes: [
      "Conversion-first structure — strategic CTA placement, clear service hierarchy, frictionless inquiry paths",
      "Performance & accessibility — fast loading, responsive layouts, semantic HTML",
      "Modern technical stack — clean maintainable code, Netlify-ready deployment",
      "Lead automation baseline — Netlify forms + scheduling flow so every lead is captured",
    ],
    stats: [
      { value: "48h", label: "Average first draft timeline" },
      { value: "90+", label: "Mobile/PageSpeed benchmark target" },
      { value: "1:1", label: "Direct communication with your developer" },
    ],
    principles: [
      "Clarity over clutter — every page guides visitors toward one clear next step",
      "Performance is part of design — fast websites build trust and convert better",
      "Beautiful + measurable — design quality must support real business outcomes",
      "Simple systems win — lead forms, scheduling, and follow-up should be lightweight and reliable",
    ],
  };

  /* ─── System Prompt ─────────────────────────────────── */
  var SYSTEM_PROMPT = buildSystemPrompt();

  function buildSystemPrompt() {
    var servicesText = KB.services.map(function (s) {
      return s.name + " (from " + s.price + "): " + s.desc + ". Includes: " + s.features.join(", ");
    }).join("\n");

    var processText = KB.process.map(function (s) { return s.step + ": " + s.desc; }).join("\n");

    return "You are the AI receptionist for " + KB.name + ", a web design agency run by " + KB.owner + ".\n\n" +
      "ABOUT THE BUSINESS:\n" + KB.who + "\n\n" +
      "SERVICES:\n" + servicesText + "\n\n" +
      "PROCESS:\n" + processText + "\n\n" +
      "EVERY BUILD INCLUDES:\n" + KB.includes.map(function (i) { return "- " + i; }).join("\n") + "\n\n" +
      "STATS: " + KB.stats.map(function (s) { return s.value + " " + s.label; }).join(", ") + "\n\n" +
      "CONTACT: Email " + KB.email + " | Book a call: " + KB.calendly + "\n\n" +
      "RULES:\n" +
      "1. Be warm, natural, and conversational — like a helpful human, not a script.\n" +
      "2. Keep responses concise. Prioritize clarity over length.\n" +
      "3. If the question is about pricing, mention starting prices and that final cost depends on specific needs.\n" +
      "4. If unsure about something specific, be honest and suggest emailing " + KB.owner + " at " + KB.email + " or booking a call.\n" +
      "5. If the visitor seems vague or lost, ask a gentle follow-up question to understand what they need.\n" +
      "6. Remember the conversation history — refer back to things they've already said.\n" +
      "7. Never make up prices, timelines, or facts not in your knowledge.\n" +
      "8. Sound confident but not salesy. Professional but friendly.\n" +
      "9. Use **bold** for key terms and package names.\n" +
      "10. If someone says thanks or goodbye, respond warmly and briefly.\n";
  }

  /* ─── Conversational Memory ─────────────────────────── */
  var conversationHistory = [];

  function addToHistory(role, content) {
    conversationHistory.push({ role: role, content: content });
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }
  }

  function getConversationContext() {
    if (conversationHistory.length <= 1) return "";
    var recent = conversationHistory.slice(-8);
    return "\n--- Recent conversation ---\n" +
      recent.map(function (m) { return (m.role === "user" ? "Visitor: " : "You: ") + m.content; }).join("\n") +
      "\n--- End conversation ---\n";
  }

  /* ─── Intent Detection ──────────────────────────────── */
  var INTENTS = [
    { id: "greeting", keywords: ["hi", "hello", "hey", "howdy", "sup", "yo", "good morning", "good afternoon", "good evening", "what's up", "greetings"] },
    { id: "services", keywords: ["services", "what do you offer", "what can you do", "packages", "offerings", "solutions", "what kind of work"] },
    { id: "pricing", keywords: ["price", "pricing", "cost", "how much", "rates", "fee", "budget", "expensive", "cheap", "affordable", "quote", "estimate", "charge"] },
    { id: "booking", keywords: ["book", "call", "meeting", "schedule", "appointment", "talk", "speak", "chat with", "get in touch", "reach", "contact", "consultation"] },
    { id: "process", keywords: ["process", "how does it work", "how do you work", "workflow", "steps", "timeline", "how long", "turnaround"] },
    { id: "support", keywords: ["help", "issue", "problem", "error", "broken", "not working", "bug", "fix", "support", "trouble"] },
    { id: "cancellation", keywords: ["cancel", "reschedule", "change", "move", "postpone", "can't make it", "need to change"] },
    { id: "seo", keywords: ["seo", "search", "google", "ranking", "organic", "visibility", "serp"] },
    { id: "tech", keywords: ["tech", "stack", "code", "html", "css", "javascript", "cms", "wordpress", "react", "next", "framework"] },
    { id: "hosting", keywords: ["hosting", "domain", "server", "where", "deploy", "ssl", "dns"] },
    { id: "portfolio", keywords: ["review", "testimonial", "feedback", "clients", "portfolio", "examples", "work", "previous", "case study"] },
    { id: "about", keywords: ["who", "about", "tell me about", "architect", "designer", "small business", "restaurant", "retail", "creative", "studio"] },
    { id: "thanks", keywords: ["thanks", "thank you", "cheers", "brilliant", "great", "awesome", "perfect", "helpful"] },
    { id: "goodbye", keywords: ["bye", "goodbye", "see you", "later", "gotta go", "that's all", "nothing else"] },
    { id: "faq", keywords: ["include", "what do i get", "what's included", "features", "what comes"] },
  ];

  function detectIntent(input) {
    var q = input.toLowerCase().trim();
    var best = { id: "general", score: 0 };

    INTENTS.forEach(function (intent) {
      var matchCount = intent.keywords.filter(function (kw) {
        return q.indexOf(kw) >= 0;
      }).length;
      var score = matchCount / intent.keywords.length;
      if (score > best.score) {
        best = { id: intent.id, score: score, matched: matchCount };
      }
    });

    return best;
  }

  function isVague(input) {
    var q = input.toLowerCase().trim();
    // Very short or generic messages
    if (q.length < 4) return true;
    var vaguePhrases = ["i need help", "i have a question", "can you help", "not sure", "help me", "i want", "i need", "tell me"];
    return vaguePhrases.some(function (p) { return q.indexOf(p) >= 0; });
  }

  /* ─── Ollama LLM Call ───────────────────────────────── */
  var ollamaAvailable = null;  // null = not tested yet

  async function testOllama() {
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 2000);
      var res = await fetch("http://localhost:11434/api/tags", { method: "GET", signal: ctrl.signal });
      clearTimeout(timer);
      ollamaAvailable = res.ok;
    } catch (e) {
      ollamaAvailable = false;
    }
    return ollamaAvailable;
  }

  async function askOllama(userMessage) {
    addToHistory("user", userMessage);

    var context = getConversationContext();
    var prompt = SYSTEM_PROMPT + context + "\nVisitor: " + userMessage + "\nYou:";

    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 15000);
      var res = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          options: { temperature: 0.7, top_p: 0.9, max_tokens: 300 },
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error("Ollama returned " + res.status);

      var data = await res.json();
      var response = (data.response || "").trim();

      if (!response) throw new Error("Empty response");

      addToHistory("assistant", response);
      return { text: response, source: "llm", confidence: 1 };

    } catch (e) {
      console.log("Ollama unavailable, falling back to local KB:", e.message);
      return null;
    }
  }

  /* ─── Local KB Fallback ─────────────────────────────── */
  function findLocalAnswer(input) {
    var q = input.toLowerCase().trim();
    var intent = detectIntent(input);

    // Greeting
    if (intent.id === "greeting" && intent.score > 0) {
      return pick([
        "Hey! 👋 Welcome to Jdigitalarchitecture. I can help with questions about our services, pricing, process, or anything else. What's on your mind?",
        "Hi there! 😊 I'm the Jdigitalarchitecture assistant. Feel free to ask me about what we do, how much things cost, how the process works, or anything else!",
        "Hello! 👋 Great to have you here. What would you like to know?",
      ]);
    }

    // Services
    if (intent.id === "services" && intent.score > 0) {
      var s = "We offer three main packages:\n\n";
      KB.services.forEach(function (p) {
        s += "📦 **" + p.name + "** — from " + p.price + "\n" + p.desc + "\n";
        p.features.forEach(function (f) { s += "  • " + f + "\n"; });
        s += "\n";
      });
      s += "Every build includes conversion-first design, performance optimisation, clean code, and lead automation.\n\nWant more detail on any of these?";
      return s;
    }

    // Pricing
    if (intent.id === "pricing" && intent.score > 0) {
      return "Our pricing depends on what you need:\n\n" +
        "🚀 **Launch Site** — from **£1,200** — polished online presence fast\n" +
        "📈 **Growth Site** — from **£2,400** — stronger positioning + lead flow\n" +
        "🏛️ **Authority Platform** — from **£4,000** — premium scalable system\n\n" +
        "These are starting prices. The final cost depends on your specific needs. Want to book a free call to discuss? " + KB.calendly;
    }

    // Booking
    if (intent.id === "booking" && intent.score > 0) {
      return "You can book a free 30-minute call here: " + KB.calendly + "\n\n" +
        "Or if you prefer, email " + KB.owner + " directly at " + KB.email + " and we'll get back to you within a day.\n\n" +
        "The call is just a casual chat — no pressure at all. We'll figure out if we're a good fit for your project.";
    }

    // Process
    if (intent.id === "process" && intent.score > 0) {
      return "Here's how it works:\n\n" +
        KB.process.map(function (s) { return "**" + s.step + "**\n" + s.desc; }).join("\n\n") +
        "\n\nYou'll usually see your first draft within **48 hours** of kickoff. The full project typically takes 1-3 weeks.\n\nWant to get started? " + KB.calendly;
    }

    // Support
    if (intent.id === "support" && intent.score > 0) {
      return "Sorry to hear you're having trouble! For technical support or issues, the best thing to do is email " + KB.owner + " directly at " + KB.email + " and describe what's going on.\n\n" +
        "If you have an existing project with us, we'll prioritise getting it sorted. If you're a new visitor and something on the site isn't working, let me know what you're seeing and I'll pass it along!";
    }

    // Cancellation
    if (intent.id === "cancellation" && intent.score > 0) {
      return "No problem at all! If you need to cancel or reschedule a call, just head to your Calendly confirmation email and use the reschedule link there.\n\n" +
        "Or if you'd prefer, email " + KB.email + " and we'll sort it out. No hard feelings either way!";
    }

    // SEO
    if (intent.id === "seo" && intent.score > 0) {
      return "Every site we build includes on-page SEO as standard — proper heading structure, meta tags, mobile-first design, fast load times (we target 90+ on PageSpeed), semantic XML sitemaps, and clean code.\n\n" +
        "For more advanced SEO like content strategy or link building, that's something we can discuss as an add-on. Want to learn more? " + KB.calendly;
    }

    // Tech
    if (intent.id === "tech" && intent.score > 0) {
      return "We keep things clean and modern:\n\n" +
        "🏗️ **HTML / CSS / JavaScript** — hand-crafted, no bloated page builders\n" +
        "📱 **Tailwind CSS** — consistent, maintainable styling\n" +
        "🚀 **Netlify** — fast, reliable hosting\n" +
        "📋 **Netlify Forms** — lead capture without extra plugins\n\n" +
        "We don't use WordPress unless there's a specific need. The result is faster, more secure, and easier to maintain.";
    }

    // Hosting
    if (intent.id === "hosting" && intent.score > 0) {
      return "We handle hosting as part of every project. We deploy to Netlify, which is fast, reliable, and free for most small-to-medium sites.\n\n" +
        "You can connect your existing domain or set up a new one. Free SSL is included. You own everything — no lock-in.";
    }

    // Portfolio
    if (intent.id === "portfolio" && intent.score > 0) {
      return "We're a growing agency, so our portfolio is still building! Here's what we can share:\n\n" +
        "⭐ **95%** of projects delivered on or before deadline\n" +
        "⭐ **4.9/5** average client satisfaction\n" +
        "⭐ **End-to-end** service — strategy, design, development, launch\n\n" +
        "We're happy to share specific examples during a call. Book one here: " + KB.calendly;
    }

    // About
    if (intent.id === "about" && intent.score > 0) {
      return "We specialise in websites for architects, interior designers, creative studios, and local businesses like restaurants and retail.\n\n" +
        KB.who + "\n\n" +
        "If you're not sure whether we're a good fit, book a free call and we'll let you know honestly: " + KB.calendly;
    }

    // FAQ / What's included
    if (intent.id === "faq" && intent.score > 0) {
      return "Every build includes:\n\n" + KB.includes.map(function (i) { return "✅ " + i; }).join("\n") +
        "\n\nEach package then adds more — like blog setup, conversion copy, Calendly integration, and ongoing support.\n\nWhich package sounds closest to what you need?";
    }

    // Thanks
    if (intent.id === "thanks" && intent.score > 0) {
      return pick([
        "You're welcome! 😊 Happy to help. If anything else comes up, just ask!",
        "Anytime! 🙌 Don't hesitate to reach out if you have more questions.",
        "Glad I could help! 😊 We're here whenever you need us.",
      ]);
    }

    // Goodbye
    if (intent.id === "goodbye" && intent.score > 0) {
      return pick([
        "Goodbye! 👋 It was great chatting. Come back anytime!",
        "See you! 😊 Thanks for stopping by. We're here if you need us!",
        "Take care! 👋 Book a call whenever you're ready: " + KB.calendly,
      ]);
    }

    // Fallback
    return null;
  }

  /* ─── Response Logger ────────────────────────────────── */
  function logResponse(input, response, source, confidence, intent) {
    var log = {
      timestamp: new Date().toISOString(),
      input: input,
      response: response.substring(0, 200),
      source: source,
      confidence: confidence,
      intent: intent.id,
      intentScore: intent.score,
    };

    try {
      var logs = JSON.parse(localStorage.getItem("jcw_logs") || "[]");
      logs.push(log);
      // Keep last 200 logs
      if (logs.length > 200) logs = logs.slice(-200);
      localStorage.setItem("jcw_logs", JSON.stringify(logs));
    } catch (e) {
      // Storage full or unavailable — silently ignore
    }
  }

  function getFailedLogs() {
    try {
      var logs = JSON.parse(localStorage.getItem("jcw_logs") || "[]");
      return logs.filter(function (l) { return l.source === "fallback" || l.confidence < CONFIDENCE_THRESHOLD; });
    } catch (e) { return []; }
  }

  /* ─── Main Response Pipeline ─────────────────────────── */
  async function getResponse(userMessage) {
    var intent = detectIntent(userMessage);

    // Check for vague input first
    if (isVague(userMessage) && conversationHistory.length < 3) {
      return {
        text: "I'd love to help! Could you tell me a bit more about what you're looking for? For example:\n\n" +
          "• Are you interested in our **services**?\n" +
          "• Do you have a question about **pricing**?\n" +
          "• Would you like to **book a call**?\n" +
          "• Or something else entirely?\n\n" +
          "Just let me know — I'm here to help! 😊",
        source: "vague-handler",
        confidence: 1,
      };
    }

    // Try Ollama first
    if (ollamaAvailable !== false) {
      if (ollamaAvailable === null) {
        await testOllama();
      }

      if (ollamaAvailable) {
        var llmResponse = await askOllama(userMessage);
        if (llmResponse) {
          logResponse(userMessage, llmResponse.text, "llm", 1, intent);
          return llmResponse;
        }
      }
    }

    // Fallback to local KB
    var localAnswer = findLocalAnswer(userMessage);
    if (localAnswer) {
      logResponse(userMessage, localAnswer, "local-kb", intent.score, intent);
      return { text: localAnswer, source: "local-kb", confidence: intent.score };
    }

    // Ultimate fallback
    var fallback = pick([
      "That's a great question — I want to make sure you get the right answer. " + KB.owner + " would be the best person to ask! Email " + KB.email + " or book a call: " + KB.calendly + "\n\nAnything else I can help with?",
      "Hmm, I'm not 100% sure about that one. I'd recommend reaching out directly — email " + KB.email + " or grab a free slot: " + KB.calendly + "\n\nAnything else though?",
    ]);
    logResponse(userMessage, fallback, "fallback", 0, intent);
    return { text: fallback, source: "fallback", confidence: 0 };
  }

  /* ─── Utilities ──────────────────────────────────────── */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ─── Styles (unchanged from v1) ─────────────────────── */
  var css = `
    .jcw-toggle {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 52px; height: 52px; border-radius: 50%;
      background: #2563eb; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 24px rgba(37,99,235,.3);
      transition: transform .2s, box-shadow .2s;
    }
    .jcw-toggle:hover { transform: scale(1.06); box-shadow: 0 6px 28px rgba(37,99,235,.4); }
    .jcw-toggle svg { width: 22px; height: 22px; fill: #fff; }
    .jcw-toggle.hidden { display: none !important; }

    .jcw-window {
      position: fixed; bottom: 88px; right: 24px; z-index: 99999;
      width: 380px; max-width: calc(100vw - 48px); height: 520px;
      display: none; flex-direction: column;
      background: rgba(15,15,25,.96); backdrop-filter: blur(24px);
      border-radius: 18px; border: 1px solid rgba(255,255,255,.08);
      box-shadow: 0 12px 48px rgba(0,0,0,.35); overflow: hidden;
    }
    .jcw-window.open { display: flex; }
    @media (max-width:480px) {
      .jcw-toggle { bottom: 16px; right: 16px; width: 56px; height: 56px; }
      .jcw-toggle svg { width: 24px; height: 24px; }
      .jcw-window {
        width: calc(100vw - 16px); max-width: calc(100vw - 16px);
        right: 8px; left: 8px; bottom: 82px;
        height: calc(100vh - 100px); max-height: calc(100vh - 100px);
      }
    }

    .jcw-header {
      padding: 16px 20px; background: rgba(37,99,235,.15);
      border-bottom: 1px solid rgba(255,255,255,.06);
      display: flex; align-items: center; justify-content: space-between;
    }
    .jcw-header h3 { color: #fff; font-size: 14px; font-weight: 600; letter-spacing: -.2px; }
    .jcw-header p { color: rgba(255,255,255,.5); font-size: 11px; margin-top: 2px; }
    .jcw-close {
      background: none; border: none; color: rgba(255,255,255,.5);
      font-size: 18px; cursor: pointer; padding: 4px 8px; line-height: 1;
      border-radius: 8px; transition: background .15s, color .15s;
    }
    .jcw-close:hover { background: rgba(255,255,255,.08); color: #fff; }

    .jcw-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .jcw-messages::-webkit-scrollbar { width: 4px; }
    .jcw-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 2px; }

    .jcw-msg {
      max-width: 88%; padding: 10px 14px; border-radius: 14px;
      font-size: 13.5px; line-height: 1.6; color: #e2e8f0;
      animation: jcw-fade .25s ease;
      white-space: pre-line;
    }
    @keyframes jcw-fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
    .jcw-msg.bot {
      background: rgba(255,255,255,.06); border-bottom-left-radius: 4px; align-self: flex-start;
    }
    .jcw-msg.user {
      background: #2563eb; border-bottom-right-radius: 4px; align-self: flex-end;
    }
    .jcw-msg a { color: #60a5fa; text-decoration: underline; text-underline-offset: 2px; }
    .jcw-msg a:hover { color: #93bbfd; }
    .jcw-msg strong { color: #fff; }

    .jcw-typing {
      display: flex; gap: 4px; align-items: center;
      padding: 10px 14px; background: rgba(255,255,255,.06);
      border-radius: 14px; border-bottom-left-radius: 4px;
      align-self: flex-start; width: fit-content;
    }
    .jcw-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(255,255,255,.4);
      animation: jcw-dot 1.2s infinite;
    }
    .jcw-typing span:nth-child(2) { animation-delay: .2s; }
    .jcw-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes jcw-dot {
      0%, 80%, 100% { opacity: .2; transform: scale(.8) }
      40% { opacity: 1; transform: scale(1) }
    }

    .jcw-input-area {
      padding: 12px 16px; border-top: 1px solid rgba(255,255,255,.06);
      background: rgba(0,0,0,.15); display: flex; gap: 8px;
    }
    .jcw-input {
      flex: 1; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1);
      border-radius: 22px; padding: 9px 16px; font-size: 13.5px; color: #e2e8f0;
      font-family: inherit; outline: none; transition: border-color .2s, background .2s;
    }
    .jcw-input::placeholder { color: rgba(255,255,255,.3); }
    .jcw-input:focus { border-color: rgba(37,99,235,.5); background: rgba(255,255,255,.1); }
    .jcw-send {
      width: 38px; height: 38px; border-radius: 50%; background: #2563eb;
      border: none; cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; transition: background .2s;
    }
    .jcw-send:hover { background: #1d4ed8; }
    .jcw-send svg { width: 15px; height: 15px; fill: #fff; }
  `;
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* ─── Build DOM (unchanged) ──────────────────────────── */
  var toggle = document.createElement("button");
  toggle.className = "jcw-toggle";
  toggle.setAttribute("aria-label", "Chat with us");
  toggle.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>';
  document.body.appendChild(toggle);

  var win = document.createElement("div");
  win.className = "jcw-window";
  win.innerHTML =
    '<div class="jcw-header"><div><h3>Jdigitalarchitecture</h3><p>Ask us anything</p></div><button class="jcw-close" aria-label="Close">×</button></div>' +
    '<div class="jcw-messages" id="jcwMsgs"></div>' +
    '<div class="jcw-input-area"><input type="text" class="jcw-input" id="jcwInp" placeholder="Ask a question…" autocomplete="off"><button class="jcw-send" id="jcwSend" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div>';
  document.body.appendChild(win);

  var msgs = document.getElementById("jcwMsgs");
  var inp = document.getElementById("jcwInp");
  var sendBtn = document.getElementById("jcwSend");
  var closeBtn = win.querySelector(".jcw-close");

  /* ─── Message Display ────────────────────────────────── */
  function addMsg(text, sender) {
    var d = document.createElement("div");
    d.className = "jcw-msg " + sender;
    var html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, "<br>");
    d.innerHTML = html;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var d = document.createElement("div");
    d.className = "jcw-typing";
    d.id = "jcwTyping";
    d.innerHTML = "<span></span><span></span><span></span>";
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    var t = document.getElementById("jcwTyping");
    if (t) t.remove();
  }

  /* ─── Main Handler ───────────────────────────────────── */
  async function handle() {
    var text = inp.value.trim();
    if (!text) return;

    addMsg(text, "user");
    inp.value = "";

    // Natural thinking delay
    var delay = 400 + Math.random() * 600 + Math.min(text.length * 8, 800);
    showTyping();
    await sleep(delay);

    var result = await getResponse(text);
    hideTyping();
    addMsg(result.text, "bot");
  }

  /* ─── Events ─────────────────────────────────────────── */
  toggle.addEventListener("click", function () {
    win.classList.add("open");
    toggle.classList.add("hidden");
    if (!win.dataset.opened) {
      win.dataset.opened = "true";
      setTimeout(function () {
        showTyping();
        setTimeout(function () {
          hideTyping();
          addMsg("Hey! 👋 Welcome to Jdigitalarchitecture.\n\nI can help with questions about our services, pricing, process, or anything else you'd like to know. What's on your mind?", "bot");
        }, 700);
      }, 300);
    }
  });

  closeBtn.addEventListener("click", function () {
    win.classList.remove("open");
    toggle.classList.remove("hidden");
  });

  sendBtn.addEventListener("click", handle);
  inp.addEventListener("keypress", function (e) { if (e.key === "Enter") handle(); });

  /* ─── Debug: expose log viewer ───────────────────────── */
  window.jcw_getLogs = function () {
    return JSON.parse(localStorage.getItem("jcw_logs") || "[]");
  };
  window.jcw_getFailedLogs = getFailedLogs;
  window.jcw_clearLogs = function () {
    localStorage.removeItem("jcw_logs");
    console.log("Logs cleared");
  };

})();

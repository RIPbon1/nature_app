const path = require('path');
const express = require('express');
const Groq = require('groq-sdk');
const nodemailer = require('nodemailer');
const { DatasetIndex } = require('./datasets/index');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

// Serve static assets
app.use('/static', express.static(path.join(__dirname, 'static')));

// Datasets
const DATASETS_DIR = process.env.DATASETS_DIR || path.join(__dirname, 'datasets');
const datasetIndex = new DatasetIndex(DATASETS_DIR);
datasetIndex.load();

// Groq client
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || process.env.GROQ || process.env.GROQ_KEY;
if (!process.env.GROQ_API_KEY && (process.env.GROK_API_KEY || process.env.GROQ || process.env.GROQ_KEY)) {
  console.warn('[AirAware] GROQ_API_KEY not set; using fallback env var for Groq API key. Consider renaming to GROQ_API_KEY in .env');
}
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';

// Email (contact form) configuration
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || process.env.SMTP_TO || process.env.GMAIL_TO;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true; // true for 465
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;

let mailTransporter = null;
if (SMTP_USER && SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
} else {
  console.warn('[AirAware] Email not configured. Set SMTP_USER and SMTP_PASS (or GMAIL_USER and GMAIL_APP_PASSWORD) in .env to enable contact form emails.');
}

// Routes
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/weather', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/contact', (_req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/chatbot', (_req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

app.get('/charts', (_req, res) => {
  res.sendFile(path.join(__dirname, 'charts.html'));
});

// Dataset maintenance endpoints
app.get('/api/datasets/stats', (_req, res) => {
  try {
    res.json({ success: true, stats: datasetIndex.stats() });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to read dataset stats' });
  }
});

app.post('/api/datasets/reload', (_req, res) => {
  try {
    datasetIndex.load();
    res.json({ success: true, stats: datasetIndex.stats() });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reload datasets' });
  }
});

// Knowledge service status endpoint
app.get('/api/knowledge/stats', async (_req, res) => {
  try {
    const { default: knowledgeService } = await import('./knowledgeService.js');
    const stats = await knowledgeService.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to read knowledge service stats' });
  }
});

// Chat endpoint using GroqRAGService for weather-focused responses
app.post('/api/chat', async (req, res) => {
  try {
    const message = (req.body && req.body.message ? String(req.body.message) : '').trim();
    if (!message) {
      return res.status(400).json({ success: false, error: 'Missing message' });
    }

    // Extract additional context from request
    const conversationHistory = req.body?.conversationHistory || [];
    const userLocation = req.body?.userLocation || null;

    // Use GroqRAGService if available, otherwise fallback to basic dataset search
    if (groq) {
      try {
        // Import and use GroqRAGService
        const { default: groqRAGService } = await import('./groqRAGService.js');
        const response = await groqRAGService.generateResponse(
          message, 
          conversationHistory, 
          userLocation
        );
        
        return res.json({ success: true, answer: response });
      } catch (ragError) {
        console.error('GroqRAGService error, falling back to basic chat:', ragError);
        // Fall through to basic implementation
      }
    }

    // Check if question is weather-related before using knowledge service
    if (!this.isWeatherRelated(message)) {
      return res.json({
        success: true,
        answer: `🌤️ **I'm AirAware, your weather expert!**

I'm designed specifically to help with weather, climate, and air quality questions.

**What I can help with:**
• Weather safety and preparation
• Air quality information  
• Climate patterns and changes
• Storm and extreme weather advice
• Seasonal weather guidance

Please ask me about weather-related topics!`
      });
    }

    // Fallback to enhanced knowledge service
    try {
      const { default: knowledgeService } = await import('./knowledgeService.js');
      const relevantKnowledge = await knowledgeService.searchSimilar(message, 3);
      
      if (relevantKnowledge && relevantKnowledge.length > 0) {
        let response = `🌤️ **Based on our weather knowledge base:**

`;
        
        relevantKnowledge.forEach((knowledge, index) => {
          response += `**${knowledge.title}**

${knowledge.content}

`;
        });
        
        response += `💡 **Note:** This response is from our local weather knowledge base. For more personalized weather advice, please set GROQ_API_KEY in your .env file.`;
        
        return res.json({ success: true, answer: response });
      }
    } catch (knowledgeError) {
      console.error('Knowledge service error:', knowledgeError);
    }

    // Final fallback to basic dataset context approach
    const topK = Number.isInteger(req.body?.topK) ? req.body.topK : 4;
    const contextResults = datasetIndex.search(message, Math.max(1, Math.min(8, topK)));
    const context = contextResults.map((r, i) => `# Document ${i + 1} (score=${r.score.toFixed(3)}, file=${r.meta.file})\n${r.text}`).join('\n\n');

    const systemPrompt = `You are AirAware, a helpful assistant for weather, air quality, and related health guidance.\nUse the provided context when relevant. If the answer is not present in the context, answer from your general knowledge clearly and concisely. If safety is involved, prefer conservative guidance.`;

    const userPrompt = contextResults.length > 0
      ? `User question: ${message}\n\nContext:\n${context}`
      : `User question: ${message}`;

    if (!groq) {
      return res.json({
        success: true,
        answer: 'Chat is configured. To enable Groq responses, set GROQ_API_KEY in a .env file and restart the server.',
        context: contextResults
      });
    }

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 512
    });

    const text = completion?.choices?.[0]?.message?.content || '';
    res.json({ success: true, answer: text, context: contextResults });
  } catch (err) {
    const status = err?.status || 500;
    res.status(status).json({ success: false, error: 'Chat failed' });
  }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const name = (req.body && req.body.name ? String(req.body.name) : '').trim();
    const email = (req.body && req.body.email ? String(req.body.email) : '').trim();
    const message = (req.body && (req.body.error || req.body.message) ? String(req.body.error || req.body.message) : '').trim();

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Missing name, email, or message' });
    }

    if (!mailTransporter) {
      return res.status(503).json({
        success: false,
        error: 'Email not configured on server. Ask admin to set SMTP_USER and SMTP_PASS (or GMAIL_USER and GMAIL_APP_PASSWORD) in .env.'
      });
    }

    const to = CONTACT_TO_EMAIL || SMTP_USER;
    const subject = `AirAware contact: ${name} reported an issue`;
    const text = `New contact submission from AirAware\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `\nMessage / Error:\n${message}\n`;

    await mailTransporter.sendMail({
      from: `AirAware Contact <${SMTP_USER}>`,
      to,
      replyTo: email,
      subject,
      text
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// Fallback 404
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Helper function to check if a question is weather-related
function isWeatherRelated(question) {
  const weatherKeywords = [
    'weather', 'climate', 'temperature', 'rain', 'snow', 'storm', 'thunder', 'lightning',
    'wind', 'humidity', 'air quality', 'aqi', 'forecast', 'sunny', 'cloudy', 'fog',
    'hurricane', 'tornado', 'blizzard', 'flood', 'drought', 'heat', 'cold', 'freeze',
    'frost', 'hail', 'sleet', 'mist', 'dew', 'pressure', 'barometer', 'thermometer',
    'season', 'spring', 'summer', 'fall', 'autumn', 'winter', 'monsoon', 'typhoon',
    'cyclone', 'tsunami', 'earthquake', 'volcano', 'smog', 'pollution', 'ozone',
    'uv', 'ultraviolet', 'sunburn', 'heatstroke', 'hypothermia', 'frostbite',
    'meteorology', 'atmosphere', 'precipitation', 'evaporation', 'condensation',
    'weatherman', 'meteorologist', 'weather station', 'radar', 'satellite'
  ];

  const questionLower = question.toLowerCase();
  return weatherKeywords.some(keyword => questionLower.includes(keyword));
}

app.listen(PORT, () => {
  console.log(`AirAware server running on http://localhost:${PORT}`);
});






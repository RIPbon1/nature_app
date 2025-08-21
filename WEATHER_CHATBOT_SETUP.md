# 🌤️ AirAware Weather Expert Chatbot - Complete Setup Guide

## 🚀 **What's New**

Your AirAware chatbot has been transformed into a **comprehensive weather expert** with:

- **🌤️ GroqRAGService** - AI-powered weather responses with multi-language support
- **📚 Enhanced Knowledge Base** - 50+ weather topics with SQLite database
- **🌍 Multi-language Support** - Hindi, Marathi, Gujarati, Arabic, Spanish, English
- **📍 Location Awareness** - Personalized weather advice based on user location
- **💬 Conversation Memory** - Context-aware responses with chat history
- **📧 Contact Form** - Email routing to your Gmail for error reports
- **🎯 Weather-Only Focus** - Automatically redirects non-weather questions to weather topics
- **📖 Improved Readability** - Spaced-out, friendly responses for better user experience

## 📋 **Prerequisites**

1. **Node.js** (v16 or higher)
2. **Groq API Key** (for AI responses)
3. **Gmail App Password** (for contact form emails)

## 🔧 **Installation & Setup**

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Environment Configuration**
Create a `.env` file in your project root:

```bash
# Required for AI responses
GROQ_API_KEY=your_groq_api_key_here

# Optional: Gmail for contact form
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# Optional: Custom settings
GROQ_MODEL=llama3-8b-8192
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
```

### 3. **Get Your Groq API Key**
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up/Login
3. Create an API key
4. Add to your `.env` file

### 4. **Get Gmail App Password** (Optional)
1. Enable 2-Step Verification in Google Account
2. Visit [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Create password for "Mail" on "Other/Custom"
4. Copy 16-character password to `.env`

## 🌤️ **Weather Knowledge Base Setup**

### **Option 1: Use Built-in Knowledge (Recommended for testing)**
The chatbot comes with 5 built-in weather topics:
- Air Quality Index (AQI) Guidelines
- Weather Safety During Storms
- Seasonal Weather Patterns
- Humidity and Health
- Wind Chill and Heat Index

### **Option 2: Full Database Setup (Advanced)**
For the complete 50+ weather topics:

1. **Install additional dependencies:**
```bash
npm install @xenova/transformers
```

2. **Run knowledge population:**
```bash
node populateWeatherKnowledge.js
```

This creates `weather_knowledge.db` with comprehensive weather information.

## 🚀 **Starting the Server**

```bash
npm run start
```

Server runs on `http://localhost:3000`

## 🧪 **Testing Your Chatbot**

### **1. Test Basic Functionality**
Visit: `http://localhost:3000/chatbot`

### **2. Test Weather Questions**
Try these questions:
- "What should I do during a thunderstorm?"
- "How does air quality affect health?"
- "What is wind chill?"
- "क्या मौसम कैसा है?" (Hindi)
- "¿Cómo está el clima?" (Spanish)

### **3. Test API Endpoints**
```bash
# Check knowledge service status
curl http://localhost:3000/api/knowledge/stats

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What should I do during a thunderstorm?"}'
```

## 🔍 **API Endpoints**

### **Chat Endpoint**
- **POST** `/api/chat`
- **Body:** `{"message": "your question", "conversationHistory": [], "userLocation": {}}`
- **Response:** AI-generated weather advice

### **Knowledge Service**
- **GET** `/api/knowledge/stats` - Knowledge base statistics
- **GET** `/api/datasets/stats` - Dataset statistics
- **POST** `/api/datasets/reload` - Reload datasets

### **Contact Form**
- **POST** `/api/contact` - Submit contact form (sends to your Gmail)

## 🎯 **Weather-Only Focus**

Your AirAware chatbot is **specifically designed for weather and climate topics only**. It will:

- **✅ Answer** weather, climate, air quality, and environmental questions
- **❌ Politely redirect** non-weather questions (like technology, cooking, etc.)
- **🌤️ Always remind users** that it's a weather expert
- **💡 Suggest weather-related topics** when off-topic questions are asked

This ensures the chatbot stays focused on its core expertise and provides the most accurate weather information.

## 🌍 **Multi-Language Support**

The chatbot automatically detects and responds in:
- **English** - Default language
- **Hindi (हिंदी)** - Detected by Devanagari script
- **Marathi (मराठी)** - Detected by specific words
- **Gujarati (ગુજરાતી)** - Detected by script
- **Arabic (العربية)** - Detected by Arabic script
- **Spanish (Español)** - Detected by accented characters

## 📱 **Features**

### **Improved Readability**
- **Friendly, conversational language** - Not formal or academic
- **Well-spaced responses** - Easy to read with plenty of breathing room
- **Clear section headers** - Organized with emojis and bullet points
- **Natural flow** - Responses feel like talking to a knowledgeable friend

### **Location Awareness**
- Automatically detects user location (if permitted)
- Provides location-specific weather advice
- Integrates with weather context

### **Conversation Memory**
- Remembers last 4 conversation turns
- Provides context-aware responses
- Maintains conversation flow

### **Smart Fallbacks**
1. **GroqRAGService** - AI-powered responses (if API key available)
2. **Enhanced Knowledge Base** - SQLite database search
3. **Built-in Knowledge** - Fallback weather information
4. **Dataset Search** - File-based knowledge search

## 🛠️ **Troubleshooting**

### **Chatbot Not Responding**
1. Check if server is running
2. Verify GROQ_API_KEY in `.env`
3. Check browser console for errors
4. Restart server after .env changes

### **Knowledge Base Issues**
1. Check `/api/knowledge/stats` endpoint
2. Verify database file exists
3. Check file permissions
4. Run knowledge population script

### **Contact Form Issues**
1. Verify Gmail credentials in `.env`
2. Check SMTP settings
3. Ensure 2-Step Verification is enabled
4. Verify app password is correct

## 📊 **Monitoring & Stats**

### **Knowledge Service Status**
```bash
curl http://localhost:3000/api/knowledge/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalItems": 50,
    "categories": ["Air Quality", "Storm Safety", "Climate"],
    "source": "sqlite"
  }
}
```

### **Dataset Status**
```bash
curl http://localhost:3000/api/datasets/stats
```

## 🔮 **Future Enhancements**

- **Real-time Weather Integration** - Live weather data
- **Weather Alerts** - Push notifications for severe weather
- **Personalized Profiles** - User weather preferences
- **Weather History** - Track weather patterns over time
- **Advanced Analytics** - Weather impact analysis

## 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section
2. Use the contact form to report errors
3. Check server logs for detailed error messages
4. Verify all environment variables are set correctly

---

## 🎉 **You're All Set!**

Your AirAware chatbot is now a **comprehensive weather expert** that can:
- Answer weather questions in multiple languages
- Provide safety advice for various weather conditions
- Use AI-powered responses with Groq
- Maintain conversation context
- Route contact form submissions to your Gmail

**Happy Weather Chatting! 🌤️✨**

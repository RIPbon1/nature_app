import Groq from 'groq-sdk';
import knowledgeService from './knowledgeService.js';

class GroqRAGService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'your-groq-api-key-here'
    });
    this.weatherApiKey = process.env.OPENWEATHER_API_KEY || 'your-openweather-api-key-here';
    this.systemPrompt = `You are AirAware, a friendly and knowledgeable weather expert! You're here to help people understand weather, climate, and air quality in a clear, helpful way.
    CRITICAL LANGUAGE INSTRUCTIONS:
    1. ALWAYS detect the language of the user's question
    2. ALWAYS respond in the EXACT SAME LANGUAGE as the user's question
    3. If user asks in Hindi (हिंदी), respond ONLY in Hindi
    4. If user asks in English, respond ONLY in English
    5. If user asks in Marathi (मराठी), respond ONLY in Marathi
    6. If user asks in Gujarati (ગુજરાટી), respond ONLY in Gujarati
    7. If user asks in Spanish, respond ONLY in Spanish
    8. If user asks in Arabic (العربية), respond ONLY in Arabic
    CONTENT INSTRUCTIONS:
    1. Be short, clear, and conversational — like texting a friend.
    2. Never overload with info. Keep responses easy to skim.
    3. Always give a one-line "at a glance" summary first.
    4. Use at most 3 bullet points per section.
    5. Only include sections that are relevant:
      - Normal pleasant weather: Key Points + Pro Tip
      - Bad/extreme weather: Key Points + Important Notes (+ Pro Tip if needed)
    6. Always provide practical, actionable advice for weather-related decisions.
    7. Use emojis for warmth, but don't overdo them (max 1–2 per line).
    8. Break text into short chunks with lots of spacing, this is VERY important.
    RESPONSE FORMAT:
    Use this friendly, spaced-out structure:
    🌤️ **Today's Weather**
    Quick one-liner summary (temperature + condition + vibe).
    **🔍 Key Points:**
    • Simple fact about sky (sunny / cloudy / rainy)  
    • Temperature & humidity  
    • Wind or rain chance if relevant  
    **💡 Pro Tip:**
    • One short tip for outdoor plans OR health  
    **⚠️ Note (only if needed):**
    • Quick safety reminder (umbrella, sunscreen, hydration, storm prep, etc.)
    FORMATTING RULES:
    - Always leave 2–3 blank lines between major sections.
    - Always leave 1 blank line after colons before bullets.
    - Keep answers short — max 6–7 lines total.
    - Do NOT write long paragraphs.
    - Make each section visually distinct with spacing.
    Always be helpful, friendly, and supportive. Write like a caring local weather buddy.`;

  }

  async generateResponse(question, conversationHistory = [], userLocation = null, userProfile = null) {
    console.log('🌤️ Groq Weather RAG Service called with question:', question.substring(0, 50) + '...');
    console.log('🔑 Groq API Key available:', process.env.GROQ_API_KEY ? 'Yes' : 'No');
    
    // Check if question is weather-related
    if (!this.isWeatherRelated(question)) {
      const response = `🌤️
**Hey there! I'm AirAware!** 😊

I'm your friendly weather expert, here to chat about all things weather!

**What I can help with:**
• Weather safety and preparation  
• Air quality information  
• Climate patterns and changes  
• Storm and extreme weather advice  
• Seasonal weather guidance  

I only discuss weather-related topics, but I'm happy to help with any weather questions you have!`;
      return this.formatResponse(response);
    }
    
    let relevantKnowledge;
    try {
      console.log('🔍 Searching weather knowledge base...');
      relevantKnowledge = await knowledgeService.searchSimilar(question, 3);
      let contextPrompt = this.systemPrompt + '\n\n';
      
      if (relevantKnowledge && relevantKnowledge.length > 0) {
        contextPrompt += 'RELEVANT WEATHER KNOWLEDGE FROM DATABASE:\n';
        relevantKnowledge.forEach((knowledge, index) => {
          contextPrompt += `\n${index + 1}. ${knowledge.title}\n`;
          contextPrompt += `${knowledge.content}\n`;
          contextPrompt += `Category: ${knowledge.category}\n`;
          contextPrompt += `Similarity Score: ${knowledge.similarity.toFixed(3)}\n`;
        });
        contextPrompt += '\nUse this knowledge to provide accurate and specific weather advice.\n\n';
      }
      
      if (userProfile) {
        const profileContext = this.getUserProfileContext(userProfile);
        if (profileContext) {
          contextPrompt += `USER PROFILE AND LOCATION INFORMATION:\n${profileContext}\n\n`;
        }
      }
      
      if (userLocation) {
        // Get real weather data
        const realWeatherData = await this.getRealWeatherData(userLocation);
        if (realWeatherData) {
          contextPrompt += `CURRENT REAL-TIME WEATHER DATA:\n`;
          contextPrompt += `Location: ${realWeatherData.location}\n`;
          contextPrompt += `Temperature: ${realWeatherData.temperature}°C (${realWeatherData.temperatureF}°F)\n`;
          contextPrompt += `Condition: ${realWeatherData.condition}\n`;
          contextPrompt += `Humidity: ${realWeatherData.humidity}%\n`;
          contextPrompt += `Wind Speed: ${realWeatherData.windSpeed} m/s\n`;
          contextPrompt += `Wind Direction: ${realWeatherData.windDirection}\n`;
          contextPrompt += `Pressure: ${realWeatherData.pressure} hPa\n`;
          contextPrompt += `Visibility: ${realWeatherData.visibility} km\n`;
          contextPrompt += `UV Index: ${realWeatherData.uvIndex}\n`;
          contextPrompt += `Sunrise: ${realWeatherData.sunrise}\n`;
          contextPrompt += `Sunset: ${realWeatherData.sunset}\n`;
          contextPrompt += `Feels Like: ${realWeatherData.feelsLike}°C (${realWeatherData.feelsLikeF}°F)\n\n`;
          contextPrompt += `IMPORTANT: Use this real-time weather data to provide accurate, location-specific weather advice and forecasts.\n\n`;
        }
        
        // Also add the basic location context
        const weatherContext = await this.getWeatherContext(userLocation);
        if (weatherContext) {
          contextPrompt += `LOCATION CONTEXT:\n${weatherContext}\n\n`;
        }
      }
      
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-4); 
        contextPrompt += 'CONVERSATION HISTORY:\n';
        recentHistory.forEach(msg => {
          contextPrompt += `${msg.isUser ? 'Human' : 'Assistant'}: ${msg.content}\n`;
        });
        contextPrompt += '\n';
      }
      
      const detectedLanguage = this.detectLanguage(question);
      const languageInstruction = this.getLanguageInstruction(detectedLanguage);
      console.log('📡 Calling Groq API...');
      console.log('🌍 Detected language:', detectedLanguage);
      
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: contextPrompt + '\n\n' + languageInstruction
          },
          {
            role: 'user',
            content: question
          }
        ],
        model: 'llama3-8b-8192', 
        temperature: 0.7,
        max_tokens: 1200,
        top_p: 0.9,
        stream: false
      });
      
      console.log('✅ Groq API response received');
      const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a weather response.';
      return this.formatResponse(response);
    } catch (error) {
      console.error('❌ Groq Weather RAG Service Error:', error);
      if (error.status === 429 || error.message?.includes('rate limit')) {
        return this.formatResponse("🚦\n**Rate Limit Notice**\n\nGroq API rate limit reached. Please wait a moment and try again.\n\n**What you can do:**\n• Wait 1-2 minutes and retry\n• Try asking a simpler weather question\n• The service should return to normal shortly");
      } else if (error.status === 401 || error.message?.includes('API key')) {
        return this.formatResponse("🔑\n**API Key Issue**\n\nThere's an issue with the Groq API configuration. Please check your API key.");
      } else if (error.status === 503 || error.message?.includes('unavailable')) {
        return this.formatResponse("🔧\n**Service Temporarily Unavailable**\n\nGroq's weather service is temporarily unavailable. Please try again in a few minutes.");
      } else {
        const fallback = await this.getFallbackResponse(question, relevantKnowledge);
        return this.formatResponse(fallback);
      }
    }
  }

  // New method to fetch real weather data from OpenWeatherMap
  async getRealWeatherData(location) {
    try {
      if (!location.lat || !location.lon) {
        console.log('No coordinates available for weather data');
        return null;
      }
      
      console.log('🌡️ Fetching real weather data for:', location.lat, location.lon);
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${this.weatherApiKey}&units=metric`
      );
      
      if (!response.ok) {
        console.error('Weather API error:', response.status, response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      // Convert wind direction to compass direction
      const windDirection = this.getWindDirection(data.wind?.deg);
      
      // Format sunrise and sunset times
      const sunrise = new Date(data.sys?.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sunset = new Date(data.sys?.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return {
        location: `${data.name}, ${data.sys?.country}`,
        temperature: Math.round(data.main?.temp),
        temperatureF: Math.round(data.main?.temp * 9/5 + 32),
        condition: data.weather?.[0]?.description || 'Unknown',
        humidity: data.main?.humidity,
        windSpeed: data.wind?.speed,
        windDirection: windDirection,
        pressure: data.main?.pressure,
        visibility: (data.visibility / 1000).toFixed(1),
        uvIndex: 'N/A', // UV index requires a separate API call
        sunrise: sunrise,
        sunset: sunset,
        feelsLike: Math.round(data.main?.feels_like),
        feelsLikeF: Math.round(data.main?.feels_like * 9/5 + 32)
      };
    } catch (error) {
      console.error('Error fetching real weather data:', error);
      return null;
    }
  }
  
  // Helper method to convert wind degrees to compass direction
  getWindDirection(degrees) {
    if (!degrees) return 'Unknown';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round((degrees % 360) / 22.5);
    return directions[index % 16];
  }

  async getFallbackResponse(question, relevantKnowledge = null) {
    try {
      if (!relevantKnowledge) {
        relevantKnowledge = await knowledgeService.searchSimilar(question, 2);
      }
      
      if (relevantKnowledge && relevantKnowledge.length > 0) {
        let response = `🌤️\n**Based on our weather knowledge base:**\n\n`;
        relevantKnowledge.forEach((knowledge, index) => {
          response += `**${knowledge.title}**\n`;
          response += `${knowledge.content}\n\n`;
        });
        response += `💡\n**Note:** This response is from our local weather knowledge base. For more personalized weather advice, please try again when the AI service is available.`;
        return this.formatResponse(response);
      } else {
        return this.getBasicFallbackResponse(question);
      }
    } catch (error) {
      console.error('❌ Error in weather fallback response:', error);
      return this.getBasicFallbackResponse(question);
    }
  }

  getBasicFallbackResponse(question) {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('weather') || lowerQuestion.includes('forecast') || lowerQuestion.includes('temperature')) {
      const response = `🌤️\n**Weather Information**

For accurate weather information, consider these key factors:

**🔍 Current Conditions:**
• Check temperature, humidity, and wind speed  

**📅 Forecast:**
• Look at short-term and extended forecasts  

**⚠️ Severe Weather:**
• Be aware of any weather warnings or alerts  

**📍 Local Variations:**
• Weather can vary significantly within small areas  

**🌱 Seasonal Patterns:**
• Consider typical weather for the time of year  

**🎯 Preparation:**
• Plan activities based on expected conditions  

For specific weather advice, please let me know your location and what you're planning!`;
      return this.formatResponse(response);
    }
    
    if (lowerQuestion.includes('air quality') || lowerQuestion.includes('aqi') || lowerQuestion.includes('pollution')) {
      const response = `🌬️\n**Air Quality Guidance**

Air quality affects health and outdoor activities:

**📊 AQI Levels:**
• 0-50: Good  
• 51-100: Moderate  
• 101-150: Unhealthy for Sensitive Groups  

**🏥 Health Effects:**
• Poor air quality can affect breathing and overall health  

**🛡️ Precautions:**
• Limit outdoor activities during poor air quality days  

**📱 Monitoring:**
• Check local air quality reports regularly  

**🏠 Indoor Air:**
• Use air purifiers and maintain good ventilation  

The key is staying informed and taking appropriate precautions!`;
      return this.formatResponse(response);
    }
    
    if (lowerQuestion.includes('rain') || lowerQuestion.includes('storm') || lowerQuestion.includes('precipitation')) {
      const response = `🌧️\n**Precipitation and Storm Safety**

Stay safe during wet weather:

**☔ Rain Preparation:**
• Carry umbrellas and wear appropriate footwear  

**⚡ Storm Safety:**
• Seek shelter during thunderstorms and severe weather  

**🌊 Flooding:**
• Avoid driving through flooded areas  

**⚡ Lightning:**
• Stay indoors during electrical storms  

**📻 Monitoring:**
• Keep track of weather alerts and warnings  

**🆘 Emergency Kit:**
• Have essential supplies ready  

Always prioritize safety during severe weather conditions!`;
      return this.formatResponse(response);
    }
    
    const response = `🌤️\n**Weather & Climate Helper**

I'm here to help with all your weather questions! I can provide advice on:

**🌡️ Weather & Forecast:**
• Current conditions and predictions  
• Seasonal patterns and changes  

**🌬️ Air Quality:**
• Pollution levels and health impacts  
• Safety precautions  

**⚠️ Safety & Prep:**
• Severe weather guidance  
• Emergency planning tips  

**🏥 Health:**
• Weather-related health advice  
• Outdoor activity recommendations  

Ask me anything about weather, climate, or air quality!`;
    return this.formatResponse(response);
  }

  getUserProfileContext(userProfile) {
    try {
      let context = '';
      if (userProfile.profile) {
        const profile = userProfile.profile;
        context += `User Profile:\n`;
        if (profile.fullName) context += `- Name: ${profile.fullName}\n`;
        if (profile.location) context += `- Location: ${profile.location}\n`;
        context += '\n';
      }
      if (userProfile.weatherPreferences) {
        const weather = userProfile.weatherPreferences;
        context += `Weather Preferences:\n`;
        if (weather.unit) context += `- Temperature Unit: ${weather.unit}\n`;
        if (weather.activities) context += `- Outdoor Activities: ${weather.activities}\n`;
        if (weather.healthConcerns) context += `- Health Concerns: ${weather.healthConcerns}\n`;
        context += '\n';
      }
      if (context) {
        context += `IMPORTANT: Use this profile and location information to provide personalized weather advice.`;
      }
      return context;
    } catch (error) {
      console.error('Error getting user profile context:', error);
      return null;
    }
  }

  async getWeatherContext(location) {
    try {
      let context = `User Location: ${location.city || 'Unknown'}, ${location.country || 'Unknown'}\n`;
      
      if (location.lat && location.lon) {
        context += `Coordinates: ${location.lat}, ${location.lon}\n`;
      }
      context += `\nIMPORTANT: Use this location information to provide location-specific weather advice.`;
      return context;
    } catch (error) {
      console.error('Error getting weather context:', error);
      return null;
    }
  }

  detectLanguage(text) {
    const hindiPattern = /[\u0900-\u097F]/;
    const marathiPattern = /[\u0900-\u097F]/; 
    const gujaratiPattern = /[\u0A80-\u0AFF]/;
    const arabicPattern = /[\u0600-\u06FF]/;
    const spanishPattern = /[ñáéíóúü]/i;
    
    if (hindiPattern.test(text)) {
      if (text.includes('क्या') || text.includes('कैसे') || text.includes('मुझे') || text.includes('बताएं')) {
        return 'hindi';
      }
      if (text.includes('काय') || text.includes('कसे') || text.includes('मला') || text.includes('सांगा')) {
        return 'marathi';
      }
      return 'hindi'; 
    }
    
    if (gujaratiPattern.test(text)) return 'gujarati';
    if (arabicPattern.test(text)) return 'arabic';
    if (spanishPattern.test(text)) return 'spanish';
    return 'english'; // Default to English
  }

  getLanguageInstruction(language) {
    const instructions = {
      hindi: 'CRITICAL: The user asked in Hindi. You MUST respond ONLY in Hindi (हिंदी). Do not use any English words. Use Hindi weather terminology.',
      marathi: 'CRITICAL: The user asked in Marathi. You MUST respond ONLY in Marathi (मराठी). Do not use any English words. Use Marathi weather terminology.',
      gujarati: 'CRITICAL: The user asked in Gujarati. You MUST respond ONLY in Gujarati (ગુજરાટી). Do not use any English words. Use Gujarati weather terminology.',
      arabic: 'CRITICAL: The user asked in Arabic. You MUST respond ONLY in Arabic (العربية). Do not use any English words. Use Arabic weather terminology.',
      spanish: 'CRITICAL: The user asked in Spanish. You MUST respond ONLY in Spanish (Español). Do not use any English words. Use Spanish weather terminology.',
      english: 'CRITICAL: The user asked in English. You MUST respond ONLY in English. Use clear English weather terminology.'
    };
    return instructions[language] || instructions.english;
  }

  formatResponse(text) {
    let formatted = text;
    // Convert **bold** markdown to <strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Ensure bold sections always start on a new line
    formatted = formatted.replace(/(<strong>[^<]+<\/strong>)/g, '\n$1\n');
    // Clean up bullet points
    formatted = formatted.replace(/^[•·]\s*/gm, '• ');
    formatted = formatted.replace(/([•·])/g, '\n$1');
    // Add spacing after headers/emojis + bold
    formatted = formatted.replace(
      /(🌤️|🌧️|🌬️|🌡️|⛈️|🌪️|❄️|☀️|🌦️|🌩️|💨|🌈|🌊|🏔️|🌍|⚡|🔧|📋|🎯|💡|⚠️|✅|🚀)(\s*<strong>[^<]+<\/strong>)/g,
      '\n\n$1\n$2\n'
    );
    // Fix section headers like "Pro Tips:" or "Important Notes:"
    formatted = formatted.replace(/(Important Notes|Pro Tips|Forecast|Current Weather Conditions|Air Quality|Wind|Precipitation|Temperature):/gi, '\n\n$1:');
    // Avoid huge blank gaps
    formatted = formatted.replace(/\n{5,}/g, '\n\n\n\n');
    formatted = formatted.replace(/^\n+/, '');
    return formatted.trim();
  }

  isWeatherRelated(question) {
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
}

export default new GroqRAGService();
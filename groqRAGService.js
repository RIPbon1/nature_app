import Groq from 'groq-sdk';
import knowledgeService from './knowledgeService.js';

class GroqRAGService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'your-groq-api-key-here'
    });

    this.systemPrompt = `You are AirAware, a friendly and knowledgeable weather expert! You're here to help people understand weather, climate, and air quality in a clear, helpful way.

CRITICAL LANGUAGE INSTRUCTIONS:
1. ALWAYS detect the language of the user's question
2. ALWAYS respond in the EXACT SAME LANGUAGE as the user's question
3. If user asks in Hindi (हिंदी), respond ONLY in Hindi
4. If user asks in English, respond ONLY in English
5. If user asks in Marathi (मराठी), respond ONLY in Marathi
6. If user asks in Gujarati (ગુજરाटी), respond ONLY in Gujarati
7. If user asks in Spanish, respond ONLY in Spanish
8. If user asks in Arabic (العربية), respond ONLY in Arabic

CONTENT INSTRUCTIONS:
1. Use the provided knowledge base context to answer questions accurately
2. If the knowledge base doesn't contain relevant information, use your general weather and climate knowledge
3. Always provide practical, actionable advice for weather-related decisions
4. Consider the user's specific location and current conditions when giving recommendations
5. Use friendly, conversational language - not formal or academic
6. Break up information into easy-to-read sections with plenty of spacing

Key areas of expertise include:
- Weather forecasting and interpretation
- Air quality assessment and health implications
- Climate patterns and seasonal changes
- Severe weather safety and preparedness
- Weather impact on daily activities and planning
- Environmental monitoring and trends
- Weather-related health and safety advice
- Climate adaptation and mitigation strategies

RESPONSE FORMAT:
Use this friendly, spaced-out structure with weather emojis:

🌤️ **Main Weather Topic Header**

Brief, friendly introduction paragraph that sets the tone.

**🔍 Key Points:**

• Point 1 with practical weather advice

• Point 2 with specific examples

• Point 3 with actionable steps

**💡 Pro Tips:**

• Advanced weather tip 1

• Advanced weather tip 2

**⚠️ Important Notes:**

• Safety considerations

• Regional weather variations to consider

CRITICAL FORMATTING REQUIREMENTS:
- ALWAYS leave 2-3 blank lines between major sections
- ALWAYS leave 1-2 blank lines after colons before bullet points
- ALWAYS leave 1-2 blank lines after periods before new section headers
- Use plenty of white space to make responses easy to read
- Break up long paragraphs into shorter, digestible sections
- Make each section visually distinct with proper spacing

Always be helpful, friendly, and supportive in your weather-related responses. Use natural language and LOTS of spacing for easy reading.`;

  }

  async generateResponse(question, conversationHistory = [], userLocation = null, userProfile = null) {
    console.log('🌤️ Groq Weather RAG Service called with question:', question.substring(0, 50) + '...');
    console.log('🔑 Groq API Key available:', process.env.GROQ_API_KEY ? 'Yes' : 'No');

    // Check if question is weather-related
    if (!this.isWeatherRelated(question)) {
      return `🌤️ **I'm AirAware, your weather expert!**

I'm designed specifically to help with weather, climate, and air quality questions.

**What I can help with:**
• Weather safety and preparation
• Air quality information
• Climate patterns and changes
• Storm and extreme weather advice
• Seasonal weather guidance

Please ask me about weather-related topics!`;
    }

    try {
      // Step 1: Retrieve relevant knowledge from the knowledge base
      console.log('🔍 Searching weather knowledge base...');
      const relevantKnowledge = await knowledgeService.searchSimilar(question, 3);

      // Step 2: Prepare context with retrieved knowledge
      let contextPrompt = this.systemPrompt + '\n\n';

      // Add retrieved knowledge context
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

      // Add user profile context if available
      if (userProfile) {
        const profileContext = this.getUserProfileContext(userProfile);
        if (profileContext) {
          contextPrompt += `USER PROFILE AND LOCATION INFORMATION:\n${profileContext}\n\n`;
        }
      }

      // Add weather context if available
      if (userLocation) {
        const weatherContext = await this.getWeatherContext(userLocation);
        if (weatherContext) {
          contextPrompt += `CURRENT LOCATION AND WEATHER CONTEXT:\n${weatherContext}\n\n`;
        }
      }

      // Add conversation history
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-4); // Last 4 messages
        contextPrompt += 'CONVERSATION HISTORY:\n';
        recentHistory.forEach(msg => {
          contextPrompt += `${msg.isUser ? 'Human' : 'Assistant'}: ${msg.content}\n`;
        });
        contextPrompt += '\n';
      }

      // Step 3: Detect language and add explicit instruction
      const detectedLanguage = this.detectLanguage(question);
      const languageInstruction = this.getLanguageInstruction(detectedLanguage);

      // Step 4: Generate response using Groq
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
        model: 'llama3-8b-8192', // Fast and efficient model
        temperature: 0.7,
        max_tokens: 1200,
        top_p: 0.9,
        stream: false
      });

      console.log('✅ Groq API response received');
      const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a weather response.';

      // Format the response for better readability
      return this.formatResponse(response);

    } catch (error) {
      console.error('❌ Groq Weather RAG Service Error:', error);

      // Handle different types of errors
      if (error.status === 429 || error.message?.includes('rate limit')) {
        return "🚦 **Rate Limit Notice**\n\nGroq API rate limit reached. Please wait a moment and try again.\n\n**What you can do:**\n• Wait 1-2 minutes and retry\n• Try asking a simpler weather question\n• The service should return to normal shortly";
      } else if (error.status === 401 || error.message?.includes('API key')) {
        return "🔑 **API Key Issue**\n\nThere's an issue with the Groq API configuration. Please check your API key.";
      } else if (error.status === 503 || error.message?.includes('unavailable')) {
        return "🔧 **Service Temporarily Unavailable**\n\nGroq's weather service is temporarily unavailable. Please try again in a few minutes.";
      } else {
        // Fallback to knowledge base only
        return await this.getFallbackResponse(question, relevantKnowledge);
      }
    }
  }

  async getFallbackResponse(question, relevantKnowledge = null) {
    try {
      if (!relevantKnowledge) {
        relevantKnowledge = await knowledgeService.searchSimilar(question, 2);
      }

      if (relevantKnowledge && relevantKnowledge.length > 0) {
        let response = `🌤️ **Based on our weather knowledge base:**\n\n`;

        relevantKnowledge.forEach((knowledge, index) => {
          response += `**${knowledge.title}**\n`;
          response += `${knowledge.content}\n\n`;
        });

        response += `💡 **Note:** This response is from our local weather knowledge base. For more personalized weather advice, please try again when the AI service is available.`;

        return response;
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
      return `🌤️ **Weather Information**

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
    }

    if (lowerQuestion.includes('air quality') || lowerQuestion.includes('aqi') || lowerQuestion.includes('pollution')) {
      return `🌬️ **Air Quality Guidance**

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
    }

    if (lowerQuestion.includes('rain') || lowerQuestion.includes('storm') || lowerQuestion.includes('precipitation')) {
      return `🌧️ **Precipitation and Storm Safety**

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
    }

    return `🌤️ **Weather and Climate Guidance**

I'm here to help with all your weather and climate questions! I can provide advice on:

**🌡️ Current Conditions:**
• Weather conditions and forecasts

**🌬️ Air Quality:**
• Assessment and health implications

**⚠️ Safety:**
• Severe weather safety and preparedness

**🌍 Climate:**
• Patterns and seasonal changes

**🎯 Daily Life:**
• Weather impact on activities

**📊 Monitoring:**
• Environmental trends and data

**🏥 Health:**
• Weather-related health and safety advice

Please feel free to ask me specific questions about any aspect of weather, climate, or air quality!`;
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
      // This would integrate with your existing weather service
      // For now, return basic location context
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
    // Simple language detection based on character patterns
    const hindiPattern = /[\u0900-\u097F]/;
    const marathiPattern = /[\u0900-\u097F]/; // Marathi uses same script as Hindi
    const gujaratiPattern = /[\u0A80-\u0AFF]/;
    const arabicPattern = /[\u0600-\u06FF]/;
    const spanishPattern = /[ñáéíóúü]/i;

    if (hindiPattern.test(text)) {
      // Check for specific Hindi words
      if (text.includes('क्या') || text.includes('कैसे') || text.includes('मुझे') || text.includes('बताएं')) {
        return 'hindi';
      }
      // Check for specific Marathi words
      if (text.includes('काय') || text.includes('कसे') || text.includes('मला') || text.includes('सांगा')) {
        return 'marathi';
      }
      return 'hindi'; // Default to Hindi for Devanagari script
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
      gujarati: 'CRITICAL: The user asked in Gujarati. You MUST respond ONLY in Gujarati (ગુજરાતી). Do not use any English words. Use Gujarati weather terminology.',
      arabic: 'CRITICAL: The user asked in Arabic. You MUST respond ONLY in Arabic (العربية). Do not use any English words. Use Arabic weather terminology.',
      spanish: 'CRITICAL: The user asked in Spanish. You MUST respond ONLY in Spanish (Español). Do not use any English words. Use Spanish weather terminology.',
      english: 'CRITICAL: The user asked in English. You MUST respond ONLY in English. Use clear English weather terminology.'
    };

    return instructions[language] || instructions.english;
  }

  formatResponse(text) {
    let formatted = text;

    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert bullet points to proper format
    formatted = formatted.replace(/^[•·]\s*/gm, '• ');

    // Add proper spacing around headers with weather emojis
    formatted = formatted.replace(/(🌤️|🌧️|🌬️|🌡️|⛈️|🌪️|❄️|☀️|🌦️|🌩️|💨|🌈|🌊|🏔️|🌍|⚡|🔧|📋|🎯|💡|⚠️|✅|🚀)(\s*<strong>[^<]+<\/strong>)/g, '\n\n$1 $2\n');

    // Add spacing around standalone headers
    formatted = formatted.replace(/(<strong>[^<]+<\/strong>)/g, '\n$1\n');

    // Ensure proper spacing around bullet points
    formatted = formatted.replace(/([•·])/g, '\n$1');

    // Add spacing around numbered lists
    formatted = formatted.replace(/^(\d+\.)/gm, '\n$1');

    // Add extra spacing after colons and before bullet points
    formatted = formatted.replace(/([^>]):\s*([•·])/g, '$1:\n\n$2');
    formatted = formatted.replace(/([^>]):\s*(\*)/g, '$1:\n\n$2');

    // Add spacing after periods before new sections
    formatted = formatted.replace(/([.!?])\s*([A-Z][a-z]+:)/g, '$1\n\n$2');

    // Add spacing around "Important Notes" and "Pro Tips" sections
    formatted = formatted.replace(/(Important Notes|Pro Tips|Forecast|Current Weather Conditions|Air Quality|Wind|Precipitation|Temperature):/gi, '\n\n$1:');

    // Clean up excessive newlines but maintain good spacing
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

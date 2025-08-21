// Test script for the weather-only chatbot
const fetch = require('node-fetch');

async function testChatbot() {
  console.log('🧪 Testing AirAware Weather Chatbot...\n');

  const testQuestions = [
    {
      question: "What is a motherboard?",
      expected: "weather-only response"
    },
    {
      question: "Tell me about computers",
      expected: "weather-only response"
    },
    {
      question: "What should I do during a thunderstorm?",
      expected: "weather advice"
    },
    {
      question: "How does humidity affect health?",
      expected: "weather advice"
    },
    {
      question: "What's the weather like?",
      expected: "weather advice"
    }
  ];

  for (let i = 0; i < testQuestions.length; i++) {
    const test = testQuestions[i];
    console.log(`📝 Test ${i + 1}: "${test.question}"`);
    console.log(`Expected: ${test.expected}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: test.question })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const isWeatherOnly = data.answer.includes("I'm AirAware, your weather expert") && 
                             data.answer.includes("designed specifically to help with weather");
        
        console.log(`✅ Result: ${isWeatherOnly ? 'Weather-only response' : 'Weather advice'}`);
        console.log(`📄 Response preview: ${data.answer.substring(0, 100)}...`);
      } else {
        console.log(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
    
    console.log('─'.repeat(50));
  }
  
  console.log('🎉 Testing complete!');
}

// Run the tests
testChatbot().catch(console.error);

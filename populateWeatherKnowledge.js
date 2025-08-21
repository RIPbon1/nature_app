// populateWeatherKnowledge.js
import { pipeline } from '@xenova/transformers';
import sqlite3pkg from 'sqlite3';

const sqlite3 = sqlite3pkg.verbose();

async function populateWeatherKnowledge() {
  console.log('🌤️ Starting weather knowledge population...');
  
  // Open existing database
  const db = new sqlite3.Database("weather_knowledge.db", (err) => {
    if (err) {
      console.error("❌ Error opening database:", err);
      return;
    }
    console.log("✅ Opened weather_knowledge.db");
    db.run(`CREATE TABLE IF NOT EXISTS weather_knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      embedding BLOB NOT NULL
    )`, (err) => {
        if (err) {
            console.error("❌ Error creating table:", err);
            db.close();
            process.exit(1);
        } else {
            console.log("✅ Table 'weather_knowledge' is ready.");
        }
    });
  });

  // Load embedding model
  console.log("🧠 Loading embedding model...");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("✅ Embedding model loaded");

  // Prepare 50 weather and climate entries (comprehensive knowledge base)
  const entries = [
    { title: "Air Quality Index (AQI) Guidelines", content: "AQI is a standardized system for measuring air quality. Values 0-50 are considered good, 51-100 moderate, 101-150 unhealthy for sensitive groups, 151-200 unhealthy, 201-300 very unhealthy, and 301+ hazardous. During poor air quality days, limit outdoor activities and use air purifiers indoors.", category: "Air Quality", tags: "aqi, air quality, health, pollution" },
    { title: "Thunderstorm Safety Guidelines", content: "During thunderstorms, seek shelter indoors immediately. Avoid open areas, tall objects, and water. If caught outside, crouch low with feet together and minimize contact with the ground. Stay away from windows and electrical equipment during lightning storms. Wait 30 minutes after last thunder before resuming outdoor activities.", category: "Storm Safety", tags: "thunderstorm, lightning, safety, shelter" },
    { title: "Heat Wave Safety Measures", content: "During extreme heat, stay hydrated, wear lightweight clothing, and avoid strenuous outdoor activities during peak hours (10 AM - 4 PM). Check on elderly neighbors and never leave children or pets in parked vehicles. Use air conditioning or visit cooling centers if available.", category: "Heat Safety", tags: "heat wave, hydration, safety, temperature" },
    { title: "Cold Weather Protection", content: "Dress in layers during cold weather. Cover extremities (hands, feet, head) to prevent frostbite. Be aware of wind chill factors and limit time outdoors during extreme cold. Use proper insulation and heating systems to maintain safe indoor temperatures.", category: "Cold Safety", tags: "cold weather, frostbite, wind chill, protection" },
    { title: "Flood Safety Precautions", content: "Never drive through flooded areas. Turn around, don't drown. Move to higher ground if flooding occurs. Avoid walking or swimming in floodwaters as they may contain dangerous debris or contaminants. Follow evacuation orders immediately.", category: "Flood Safety", tags: "flood, safety, evacuation, water" },
    { title: "Hurricane Preparedness", content: "Prepare emergency kits with food, water, medications, and important documents. Secure outdoor objects and reinforce windows. Monitor official weather updates and follow evacuation orders. Have a family communication plan in place.", category: "Hurricane Safety", tags: "hurricane, preparedness, emergency kit, evacuation" },
    { title: "Tornado Safety Protocol", content: "Seek shelter in a basement or interior room without windows. Use mattresses or heavy furniture for additional protection. If outdoors, lie flat in a ditch and cover your head. Monitor weather radios for tornado warnings.", category: "Tornado Safety", tags: "tornado, shelter, basement, warning" },
    { title: "Blizzard Survival Tips", content: "Stay indoors during blizzards and keep emergency supplies ready. Maintain heating systems and have backup power sources. If stranded in vehicle, stay inside and run engine periodically for heat. Keep exhaust clear to prevent carbon monoxide poisoning.", category: "Blizzard Safety", tags: "blizzard, survival, emergency, heating" },
    { title: "Drought Management Strategies", content: "Implement water conservation measures during drought conditions. Use drought-resistant plants in landscaping. Collect rainwater and reuse household water when possible. Monitor water usage and repair leaks promptly.", category: "Drought Management", tags: "drought, water conservation, landscaping, rainwater" },
    { title: "UV Index Protection", content: "Check UV index before outdoor activities. Use sunscreen with SPF 30+ and reapply every 2 hours. Wear protective clothing, hats, and sunglasses. Seek shade during peak UV hours (10 AM - 4 PM).", category: "UV Protection", tags: "uv index, sunscreen, protection, skin health" },
    { title: "Humidity and Health Effects", content: "High humidity levels above 60% can make temperatures feel warmer and increase heat stress risk. Low humidity below 30% can cause dry skin and respiratory irritation. Ideal indoor humidity is between 30-50% for comfort and health.", category: "Health", tags: "humidity, health, comfort, temperature" },
    { title: "Wind Chill Understanding", content: "Wind chill describes how cold it feels when wind combines with low temperatures. It can cause frostbite faster than actual temperature alone. Dress appropriately for wind chill conditions and limit outdoor exposure during extreme wind chill.", category: "Weather Science", tags: "wind chill, frostbite, temperature, wind" },
    { title: "Heat Index Calculation", content: "Heat index indicates how hot it feels when humidity combines with high temperatures. It can make conditions feel 10-15°F hotter than actual temperature. Use heat index to plan outdoor activities and take appropriate precautions.", category: "Weather Science", tags: "heat index, humidity, temperature, safety" },
    { title: "Seasonal Weather Patterns", content: "Weather patterns vary significantly by season. Spring brings variable conditions with rain and temperature fluctuations. Summer typically features high temperatures and afternoon thunderstorms. Fall shows cooling trends and increased precipitation. Winter brings cold temperatures, snow, and ice in many regions.", category: "Climate", tags: "seasons, weather patterns, temperature, precipitation" },
    { title: "El Niño and La Niña Effects", content: "El Niño brings warmer ocean temperatures and can cause increased rainfall in some regions while causing drought in others. La Niña brings cooler ocean temperatures and often results in opposite weather patterns. Both phenomena affect global weather for 9-12 months.", category: "Climate", tags: "el nino, la nina, ocean temperature, global weather" },
    { title: "Climate Change Indicators", content: "Rising global temperatures, melting glaciers, sea level rise, and extreme weather events are key indicators of climate change. Greenhouse gas emissions from human activities are the primary driver. Adaptation and mitigation strategies are essential for future planning.", category: "Climate Change", tags: "climate change, global warming, adaptation, mitigation" },
    { title: "Weather Forecasting Methods", content: "Modern weather forecasting uses computer models, satellite data, radar, and ground observations. Models predict atmospheric conditions based on current weather patterns. Forecast accuracy decreases with time, with 3-5 day forecasts being most reliable.", category: "Weather Science", tags: "forecasting, computer models, satellite, radar" },
    { title: "Atmospheric Pressure Systems", content: "High pressure systems bring clear, dry weather with light winds. Low pressure systems bring cloudy, wet weather with stronger winds. Understanding pressure patterns helps predict weather changes and plan activities accordingly.", category: "Weather Science", tags: "pressure systems, high pressure, low pressure, weather prediction" },
    { title: "Frontal Weather Systems", content: "Cold fronts bring cooler temperatures, strong winds, and precipitation. Warm fronts bring warmer temperatures and steady precipitation. Stationary fronts can cause prolonged periods of wet weather. Occluded fronts combine characteristics of both.", category: "Weather Science", tags: "fronts, cold front, warm front, precipitation" },
    { title: "Meteorological Seasons", content: "Meteorological seasons are based on temperature cycles rather than astronomical events. Spring: March-May, Summer: June-August, Fall: September-November, Winter: December-February. This system provides more consistent weather patterns for planning.", category: "Climate", tags: "meteorological seasons, temperature cycles, planning, consistency" },
    { title: "Microclimate Understanding", content: "Microclimates are small areas with different weather conditions than surrounding areas. Urban areas are often warmer due to heat island effect. Valleys may be cooler than hilltops. Understanding microclimates helps with local weather planning.", category: "Weather Science", tags: "microclimate, urban heat island, local weather, planning" },
    { title: "Weather and Agriculture", content: "Weather significantly impacts crop growth, irrigation needs, and pest management. Farmers use weather forecasts to plan planting, harvesting, and field operations. Extreme weather events can cause crop damage and economic losses.", category: "Agriculture", tags: "weather, agriculture, farming, crop management" },
    { title: "Marine Weather Safety", content: "Marine weather includes wind, waves, visibility, and storm conditions. Check marine forecasts before boating activities. Be aware of small craft advisories and storm warnings. Have emergency equipment and communication devices on board.", category: "Marine Safety", tags: "marine weather, boating, safety, forecasts" },
    { title: "Aviation Weather Hazards", content: "Aviation weather includes turbulence, icing, visibility, and wind shear. Pilots must check weather conditions before flights. Thunderstorms, fog, and strong winds can create dangerous flying conditions. Weather briefings are essential for flight safety.", category: "Aviation", tags: "aviation weather, turbulence, icing, flight safety" },
    { title: "Weather and Transportation", content: "Weather affects all transportation modes. Rain and snow reduce road traction and visibility. High winds can affect aircraft and large vehicles. Plan travel around weather conditions and allow extra time during adverse weather.", category: "Transportation", tags: "weather, transportation, safety, planning" },
    { title: "Weather and Energy", content: "Weather affects energy demand and production. Hot weather increases air conditioning use. Cold weather increases heating demand. Renewable energy sources like solar and wind depend on weather conditions. Energy planning must consider weather patterns.", category: "Energy", tags: "weather, energy, demand, renewable energy" },
    { title: "Weather and Health", content: "Weather affects human health in multiple ways. Extreme temperatures can cause heat stroke or hypothermia. Poor air quality affects respiratory health. Weather changes can trigger migraines and joint pain. Understanding these effects helps maintain health.", category: "Health", tags: "weather, health, temperature, air quality" },
    { title: "Weather and Recreation", content: "Weather conditions determine outdoor recreation opportunities. Sunny days are ideal for hiking and sports. Rainy days may require indoor alternatives. Check weather forecasts to plan outdoor activities and have backup plans ready.", category: "Recreation", tags: "weather, recreation, outdoor activities, planning" },
    { title: "Weather and Construction", content: "Weather affects construction schedules and safety. Rain can delay outdoor work and affect material handling. High winds can create dangerous conditions for workers and equipment. Plan construction activities around weather forecasts.", category: "Construction", tags: "weather, construction, safety, scheduling" },
    { title: "Weather and Emergency Response", content: "Emergency responders must consider weather conditions during operations. Severe weather can affect response times and equipment effectiveness. Weather forecasts help emergency managers prepare for and respond to weather-related incidents.", category: "Emergency Response", tags: "weather, emergency response, preparedness, safety" },
    { title: "Weather and Business", content: "Weather affects many business operations and consumer behavior. Retail sales vary with weather conditions. Agriculture and tourism are heavily weather-dependent. Businesses use weather forecasts for planning and risk management.", category: "Business", tags: "weather, business, planning, risk management" },
    { title: "Weather and Insurance", content: "Weather-related damage is a major factor in insurance claims. Understanding weather risks helps with insurance planning and risk mitigation. Some areas require specific insurance coverage for weather-related hazards like floods or hurricanes.", category: "Insurance", tags: "weather, insurance, risk, damage" },
    { title: "Weather and Real Estate", content: "Weather patterns affect property values and insurance costs. Areas prone to severe weather may have higher insurance premiums. Climate change considerations are increasingly important in real estate decisions and property development.", category: "Real Estate", tags: "weather, real estate, property values, climate change" },
    { title: "Weather and Tourism", content: "Weather significantly impacts tourism destinations and activities. Seasonal weather patterns determine peak tourism periods. Extreme weather events can disrupt travel plans and affect local economies. Weather forecasts help tourists plan their trips.", category: "Tourism", tags: "weather, tourism, travel planning, seasonal patterns" },
    { title: "Weather and Wildlife", content: "Weather affects wildlife behavior, migration patterns, and habitat availability. Extreme weather events can impact animal populations and ecosystems. Understanding weather-wildlife relationships helps with conservation efforts and wildlife management.", category: "Wildlife", tags: "weather, wildlife, migration, conservation" },
    { title: "Weather and Water Resources", content: "Weather patterns determine water availability and quality. Droughts reduce water supplies while heavy rainfall can cause flooding and contamination. Weather forecasts help water managers plan for various scenarios and maintain water security.", category: "Water Resources", tags: "weather, water, drought, flooding" },
    { title: "Weather and Air Quality", content: "Weather conditions affect air quality and pollution dispersion. High pressure systems can trap pollutants near the ground. Wind and rain help disperse and remove air pollutants. Understanding these relationships helps with air quality management.", category: "Air Quality", tags: "weather, air quality, pollution, dispersion" },
    { title: "Weather and Soil", content: "Weather affects soil moisture, temperature, and erosion. Rainfall patterns determine soil moisture levels and irrigation needs. Temperature affects soil biological activity and nutrient availability. Weather events can cause soil erosion and degradation.", category: "Soil", tags: "weather, soil, moisture, erosion" },
    { title: "Weather and Forests", content: "Weather affects forest growth, health, and fire risk. Drought conditions increase wildfire risk while wet conditions promote growth. Extreme weather events can damage forests and affect ecosystem services. Weather monitoring helps with forest management.", category: "Forests", tags: "weather, forests, fire risk, ecosystem health" },
    { title: "Weather and Oceans", content: "Weather affects ocean temperatures, currents, and marine life. Storms can create dangerous sea conditions and affect shipping. Ocean temperatures influence weather patterns on land. Understanding ocean-weather relationships is crucial for marine activities.", category: "Oceans", tags: "weather, oceans, currents, marine life" },
    { title: "Weather and Mountains", content: "Mountain weather is more extreme and variable than lowland weather. Higher elevations experience stronger winds and more precipitation. Temperature decreases with altitude. Mountain weather can change rapidly and create dangerous conditions for hikers and climbers.", category: "Mountains", tags: "weather, mountains, elevation, hiking safety" },
    { title: "Weather and Deserts", content: "Desert weather features extreme temperature variations between day and night. Low humidity and high temperatures create challenging conditions. Sandstorms and dust storms can reduce visibility and create hazardous conditions. Understanding desert weather is essential for desert travel and activities.", category: "Deserts", tags: "weather, deserts, temperature variation, sandstorms" },
    { title: "Weather and Polar Regions", content: "Polar regions experience extreme cold and long periods of darkness or daylight. Weather conditions can change rapidly and create dangerous situations. Understanding polar weather is crucial for research, exploration, and survival in these harsh environments.", category: "Polar Regions", tags: "weather, polar regions, extreme cold, survival" },
    { title: "Weather and Tropical Regions", content: "Tropical regions experience high temperatures, humidity, and frequent rainfall. Tropical storms and hurricanes are common threats. Understanding tropical weather patterns helps with planning and preparation for extreme weather events.", category: "Tropical Regions", tags: "weather, tropical regions, humidity, tropical storms" },
    { title: "Weather and Coastal Areas", content: "Coastal areas experience unique weather patterns influenced by ocean temperatures and sea breezes. Hurricanes and tropical storms pose significant threats. Understanding coastal weather helps with safety planning and emergency preparedness.", category: "Coastal Areas", tags: "weather, coastal areas, sea breezes, hurricanes" },
    { title: "Weather and Urban Areas", content: "Urban areas create their own weather patterns through the heat island effect. Buildings and pavement absorb and radiate heat, creating higher temperatures than surrounding rural areas. Understanding urban weather helps with city planning and public health.", category: "Urban Areas", tags: "weather, urban areas, heat island effect, city planning" },
    { title: "Weather and Rural Areas", tags: "weather, rural areas, agriculture, planning" },
    { title: "Weather and Suburban Areas", content: "Suburban areas experience weather patterns between urban and rural conditions. They may have some heat island effect but also benefit from vegetation and open spaces. Understanding suburban weather helps with planning outdoor activities and landscaping.", category: "Suburban Areas", tags: "weather, suburban areas, planning, landscaping" },
    { title: "Weather and Industrial Areas", content: "Industrial areas may experience modified weather patterns due to heat emissions and air pollution. Understanding these effects helps with environmental monitoring and public health protection. Weather conditions affect industrial operations and safety procedures.", category: "Industrial Areas", tags: "weather, industrial areas, pollution, safety" },
    { title: "Weather and Agricultural Areas", content: "Agricultural areas are particularly sensitive to weather conditions. Understanding local weather patterns helps with crop planning, irrigation scheduling, and pest management. Weather forecasts are essential tools for agricultural decision-making.", category: "Agricultural Areas", tags: "weather, agriculture, crop planning, irrigation" },
    { title: "Weather and Recreational Areas", content: "Recreational areas depend on favorable weather conditions for visitor enjoyment and safety. Understanding seasonal weather patterns helps with planning and preparation. Weather forecasts help visitors make informed decisions about outdoor activities.", category: "Recreational Areas", tags: "weather, recreation, planning, safety" },
    { title: "Weather and Protected Areas", content: "Protected areas like national parks and wildlife reserves are affected by weather patterns. Understanding these relationships helps with conservation efforts and visitor safety. Weather monitoring helps protect sensitive ecosystems and species.", category: "Protected Areas", tags: "weather, protected areas, conservation, ecosystems" }
  ];

  console.log(`📚 Processing ${entries.length} weather knowledge entries...`);

  // Function to insert entry with promise
  function insertEntry(entry, embedding) {
    return new Promise((resolve, reject) => {
      const vector = Buffer.from(new Float32Array(embedding.data).buffer);
      
      db.run(
        `INSERT INTO weather_knowledge (title, content, category, tags, embedding) VALUES (?, ?, ?, ?, ?)`,
        [entry.title, entry.content, entry.category, entry.tags, vector],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // Generate embeddings and insert
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    try {
      console.log(`🔄 Processing: ${entry.title} (${i + 1}/${entries.length})`);
      
      // Generate embedding
      const embedding = await embedder(entry.content, { pooling: "mean", normalize: true });
      
      // Insert into database
      await insertEntry(entry, embedding);
      
      console.log(`✅ Inserted: ${entry.title}`);
    } catch (err) {
      console.error(`❌ Error processing ${entry.title}:`, err);
    }
  }

  console.log("🌤️ All weather knowledge entries processed successfully!");
  
  // Close database
  db.close((err) => {
    if (err) {
      console.error("❌ Error closing database:", err);
    } else {
      console.log("✅ Database closed successfully");
    }
  });
}

// Run the population
populateWeatherKnowledge().catch(console.error);

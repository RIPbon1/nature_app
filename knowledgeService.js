
import sqlite3pkg from 'sqlite3';

const sqlite3 = sqlite3pkg.verbose();

class KnowledgeService {
  constructor() {
    this.db = null;
    this.embedder = null;
    this.useDatabase = false;
    this.initializeDatabase();
    

    this.fallbackKnowledgeBase = [
      {
        title: "Air Quality Index (AQI) Guidelines",
        content: "AQI is a standardized system for measuring air quality.\n\n\n**📊 AQI Levels:**\n\n• 0-50: Good\n\n• 51-100: Moderate\n\n• 101-150: Unhealthy for Sensitive Groups\n\n• 151-200: Unhealthy\n\n• 201-300: Very Unhealthy\n\n• 301+: Hazardous\n\n\n**🛡️ During Poor Air Quality:**\n\n• Limit outdoor activities\n\n• Use air purifiers indoors\n\n• Check local air quality reports",
        category: "air-quality",
        similarity: 0.9
      },
      {
        title: "Weather Safety During Storms",
        content: "During thunderstorms, safety is your top priority!\n\n\n**🏠 Seek Shelter:**\n\n• Go indoors immediately\n\n• Avoid open areas and tall objects\n\n• Stay away from water\n\n\n**⚡ If Caught Outside:**\n\n• Crouch low with feet together\n\n• Minimize contact with the ground\n\n• Stay away from windows and electrical equipment\n\n\n**⏰ Wait Time:**\n\n• Wait 30 minutes after last thunder before resuming outdoor activities",
        category: "safety",
        similarity: 0.85
      },
      {
        title: "Seasonal Weather Patterns",
        content: "Weather patterns change dramatically with the seasons!\n\n**🌸 Spring:**\n• Variable conditions with rain\n• Temperature fluctuations\n• Perfect for planning outdoor activities\n\n**☀️ Summer:**\n• High temperatures\n• Afternoon thunderstorms\n• Great for beach and pool days\n\n**🍂 Fall:**\n• Cooling trends\n• Increased precipitation\n• Beautiful foliage viewing\n\n**❄️ Winter:**\n• Cold temperatures\n• Snow and ice\n• Cozy indoor activities",
        category: "climate",
        similarity: 0.8
      },
      {
        title: "Humidity and Health",
        content: "Humidity levels significantly impact your comfort and health!\n\n**💧 High Humidity (Above 60%):**\n• Makes temperatures feel warmer\n• Increases heat stress risk\n• Can cause discomfort\n\n**🌵 Low Humidity (Below 30%):**\n• Can cause dry skin\n• May cause respiratory irritation\n• Static electricity issues\n\n**✅ Ideal Indoor Humidity:**\n• Between 30-50%\n• Perfect for comfort and health\n• Use humidifiers or dehumidifiers as needed",
        category: "health",
        similarity: 0.75
      },
      {
        title: "Wind Chill and Heat Index",
        content: "Understanding these weather factors helps you plan better!\n\n**❄️ Wind Chill:**\n• Describes how cold it feels when wind combines with low temperatures\n• Can cause frostbite faster than actual temperature alone\n• Important for winter safety planning\n\n**🌡️ Heat Index:**\n• Indicates how hot it feels when humidity combines with high temperatures\n• Can make conditions feel 10-15°F hotter than actual temperature\n• Crucial for summer activity planning\n\n**🎯 Both are essential for:**\n• Planning outdoor activities\n• Understanding health risks\n• Choosing appropriate clothing",
        category: "weather-science",
        similarity: 0.7
      }
    ];
  }

  async initializeDatabase() {
    try {
      this.db = new sqlite3.Database("weather_knowledge.db", (err) => {
        if (err) {
          console.log("📝 Using fallback knowledge base (SQLite not available)");
          this.useDatabase = false;
        } else {
          console.log("✅ SQLite database connected");
          this.useDatabase = true;
        }
      });
    } catch (error) {
      console.log("📝 Using fallback knowledge base (SQLite error)");
      this.useDatabase = false;
    }
  }

  async searchSimilar(query, topK = 3) {
    try {
      if (this.useDatabase && this.db) {
        return await this.searchDatabase(query, topK);
      } else {
        return this.searchFallback(query, topK);
      }
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return this.searchFallback(query, topK);
    }
  }

  async searchDatabase(query, topK) {
    return new Promise((resolve, reject) => {
 
      const searchQuery = `%${query}%`;
      
      this.db.all(
        `SELECT title, content, category, tags FROM weather_knowledge 
         WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
         ORDER BY 
           CASE 
             WHEN title LIKE ? THEN 1
             WHEN content LIKE ? THEN 2
             WHEN tags LIKE ? THEN 3
             ELSE 4
           END
         LIMIT ?`,
        [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, topK],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const results = rows.map((row, index) => ({
              ...row,
              similarity: 1.0 - (index * 0.1) 
            }));
            resolve(results);
          }
        }
      );
    });
  }

  searchFallback(query, topK) {
    const queryLower = query.toLowerCase();
    const scored = this.fallbackKnowledgeBase.map(item => {
      const score = this.calculateSimilarity(queryLower, item.title.toLowerCase(), item.content.toLowerCase());
      return { ...item, similarity: score };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  calculateSimilarity(query, title, content) {
    let score = 0;
    

    const titleWords = title.split(' ');
    const queryWords = query.split(' ');
    
    titleWords.forEach(word => {
      if (queryWords.includes(word)) {
        score += 0.4;
      }
    });


    const contentWords = content.split(' ');
    contentWords.forEach(word => {
      if (queryWords.includes(word)) {
        score += 0.1; 
      }
    });


    return Math.min(score, 1.0);
  }

  async addKnowledge(item) {
    if (this.useDatabase && this.db) {
      return this.addToDatabase(item);
    } else {
      this.fallbackKnowledgeBase.push(item);
      return true;
    }
  }

  async addToDatabase(item) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO weather_knowledge (title, content, category, tags) VALUES (?, ?, ?, ?)`,
        [item.title, item.content, item.category, item.tags || ''],
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

  async getStats() {
    if (this.useDatabase && this.db) {
      return this.getDatabaseStats();
    } else {
      return {
        totalItems: this.fallbackKnowledgeBase.length,
        categories: [...new Set(this.fallbackKnowledgeBase.map(item => item.category))],
        source: 'fallback'
      };
    }
  }

  async getDatabaseStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as total, COUNT(DISTINCT category) as categories FROM weather_knowledge`,
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              totalItems: row.total,
              categories: row.categories,
              source: 'sqlite'
            });
          }
        }
      );
    });
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          }
          resolve();
        });
      });
    }
  }
}

export default new KnowledgeService();

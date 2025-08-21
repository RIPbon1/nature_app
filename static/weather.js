const apiKey = '8fee7ce27770b9c50d38fb80d6b1f357';
let tipsSet = new Set();

function addTip(tip) {
  if (tip && !tipsSet.has(tip)) {
    tipsSet.add(tip);
    renderTips();
  }
}

function renderTips() {
  const list = document.querySelector('.tips-list');
  if (!list) return;
  list.innerHTML = '';
  Array.from(tipsSet).slice(0, 5).forEach(t => {
    const li = document.createElement('li');
    li.textContent = t;
    list.appendChild(li);
  });
}

window.onload = function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async function (position) {
        let lat = position.coords.latitude;
        let lon = position.coords.longitude;
        await checkWeather(lat, lon);
        await checkAirQuality(lat, lon);
      },
      function () {
        // Non-blocking fallback: use a default city (e.g., London)
        const fallbackLat = 51.5074;
        const fallbackLon = -0.1278;
        checkWeather(fallbackLat, fallbackLon);
        checkAirQuality(fallbackLat, fallbackLon);
      }
    );
  }
};

async function checkWeather(lat, lon) {
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const response = await fetch(apiUrl);
  const data = await response.json();

  const imageChanger = document.querySelector('.weather-icon');

  document.querySelector('.city').innerHTML = data.name;
  document.querySelector('.temp').innerHTML = Math.round(data.main.temp) + "°C";
  document.querySelector('.humidity').innerHTML = Math.round(data.main.humidity) + "%";
  document.querySelector('.wind').innerHTML = data.wind.speed + " km/h";

  const weatherMain = data.weather[0].main;
  const isNight = data.weather[0].icon.endsWith("n");
  const tempC = Math.round(data.main.temp);
  const humidity = Math.round(data.main.humidity);
  const windSpeed = Math.round(data.wind.speed);

  if (weatherMain === 'Clouds') {
    imageChanger.src = isNight ? "/static/cloudy-night.png" : "/static/cloudy.png";
  } else if (weatherMain === 'Clear') {
    imageChanger.src = isNight ? "/static/clear-night.png" : "/static/sun.png";
  } else if (weatherMain === 'Rain') {
    imageChanger.src = isNight ? "/static/rain-night.png" : "/static/heavy-rain.png";
  } else if (weatherMain === 'Snow') {
    imageChanger.src = isNight ? "/static/snow-night.png" : "/static/snowflake.png";
  } else {
    imageChanger.src = isNight ? "/static/clear-night.png" : "/static/sun.png";
  }

  if (weatherMain === 'Clear' && !isNight) {
    addTip("It's sunny today — make sure to wear glasses.");
  }
  if (weatherMain === 'Clear' && isNight) {
    addTip("Clear night skies — great for stargazing.");
  }
  if (weatherMain === 'Clouds') {
    addTip("Cloudy conditions — light layers recommended.");
  }
  if (weatherMain === 'Rain') {
    addTip("Rain expected — carry an umbrella or raincoat.");
  }
  if (weatherMain === 'Snow') {
    addTip("Snowy conditions — wear warm layers and non-slip shoes.");
  }
  if (tempC >= 30) {
    addTip("Hot weather — drink water frequently and avoid the midday sun.");
  }
  if (tempC <= 5) {
    addTip("Cold temperatures — bundle up and watch for ice.");
  }
  if (humidity >= 70) {
    addTip("High humidity — pace outdoor activity and take breaks.");
  }
  if (windSpeed >= 25) {
    addTip("Windy today — secure loose items and watch for debris.");
  }
}

async function checkAirQuality(lat, lon) {
  const pollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const response = await fetch(pollutionUrl);
  const data = await response.json();

  const pollutionBox = document.querySelector('.app-pollution-index-container');
  const aqi = data.list[0].main.aqi;
  const aqiLevels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
  const level = aqiLevels[aqi - 1] || '--';

  const valueEl = document.querySelector('.aqi-value');
  const badgeEl = document.querySelector('.aqi-badge');
  const detailEl = document.querySelector('.aqi-detail');
  const markerEl = document.querySelector('.aqi-marker');
  const pollutantsEl = document.querySelector('.pollutants');

  if (valueEl) valueEl.textContent = String(aqi);
  if (badgeEl) badgeEl.textContent = level;

  const markerLeft = ((aqi - 1) / 4) * 100;
  if (markerEl) markerEl.style.left = `${markerLeft}%`;

  switch(aqi) {
    case 1:
      pollutionBox.style.background = 'linear-gradient(135deg, #4CAF50, #81C784)';
      if (detailEl) detailEl.textContent = 'Low pollution — fresh air. Enjoy outdoor activities!';
      addTip("Air quality is good — open your windows and enjoy some fresh air.");
      break;
    case 2:
      pollutionBox.style.background = 'linear-gradient(135deg, #FFEB3B, #FBC02D)';
      if (detailEl) detailEl.textContent = 'Fair air quality — sensitive groups should monitor symptoms.';
      addTip("Air quality is fair — if sensitive, limit prolonged outdoor exertion.");
      break;
    case 3:
      pollutionBox.style.background = 'linear-gradient(135deg, #FFC107, #FF9800)';
      if (detailEl) detailEl.textContent = 'Moderate pollution — consider reducing outdoor time.';
      addTip("Moderate AQI — consider a mask if you have respiratory issues.");
      break;
    case 4:
      pollutionBox.style.background = 'linear-gradient(135deg, #757575, #BDBDBD)';
      if (detailEl) detailEl.textContent = 'Poor air quality — limit time outdoors.';
      addTip("Poor air quality — limit outdoor activity, especially for children and seniors.");
      break;
    case 5:
      pollutionBox.style.background = 'linear-gradient(135deg, #B71C1C, #F44336)';
      if (detailEl) detailEl.textContent = 'Very poor air quality — avoid outdoor activities.';
      addTip("Very poor AQI — wear a high-quality mask if you must go outside.");
      break;
    default:
      pollutionBox.style.background = 'linear-gradient(135deg, #ffffff, #e0e0e0)';
      if (detailEl) detailEl.textContent = 'Air quality data unavailable.';
  }

  if (pollutantsEl) {
    pollutantsEl.innerHTML = '';
    const c = data.list[0].components || {};
    const entries = [ ['PM2.5', c.pm2_5], ['PM10', c.pm10], ['O3', c.o3], ['NO2', c.no2] ];
    entries.forEach(([label, value]) => {
      if (value != null) {
        const chip = document.createElement('span');
        chip.className = 'pollutant';
        chip.textContent = `${label}: ${Math.round(value)} µg/m³`;
        pollutantsEl.appendChild(chip);
      }
    });
  }
}





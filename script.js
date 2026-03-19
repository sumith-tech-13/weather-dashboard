// Replace this with your own free API key from OpenWeatherMap
const API_KEY = '7bad8f21259a8c8a75c8bb38b186beb1';
const apiUrl = 'https://api.openweathermap.org/data/2.5/weather?units=metric&q=';

const searchInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherInfo = document.getElementById('weather-info');
const errorMessage = document.getElementById('error-message');
const loader = document.getElementById('loader');
const forecastContainer = document.getElementById('forecast-container');
const unitToggleBtn = document.getElementById('unit-toggle');
const themeToggleBtn = document.getElementById('theme-toggle');
const voiceBtn = document.getElementById('voice-btn');
const suggestionsDropdown = document.getElementById('suggestions');

let currentWeatherData = null;
let currentForecastData = null;
let isCelsius = true;
let lastSearchedCity = null;
let lastSearchedLat = null;
let lastSearchedLon = null;
let autoRefreshInterval = null;
let currentTheme = localStorage.getItem('theme') || 'auto';
let suggestionTimeout = null;

async function checkWeather(city, lat = null, lon = null, isAutoRefresh = false) {
    // Show loader and hide previous results before fetching (if not auto-refreshing)
    if (!isAutoRefresh) {
        loader.style.display = 'block';
        weatherInfo.style.display = 'none';
        errorMessage.style.display = 'none';
        if (forecastContainer) forecastContainer.style.display = 'none';
    }

    try {
        let url = apiUrl + city + `&appid=${API_KEY}`;
        let forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?units=metric&q=${city}&appid=${API_KEY}`;
        if (lat !== null && lon !== null) {
            url = `https://api.openweathermap.org/data/2.5/weather?units=metric&lat=${lat}&lon=${lon}&appid=${API_KEY}`;
            forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?units=metric&lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 401) {
                errorMessage.innerHTML = "Invalid API Key. (If newly created, it takes ~1-2 hours to activate)";
            } else {
                errorMessage.innerHTML = "City not found.";
            }
            loader.style.display = 'none';
            errorMessage.style.display = 'block';
        } else {
            const data = await response.json();
            currentWeatherData = data;

            lastSearchedCity = city || data.name;
            lastSearchedLat = lat;
            lastSearchedLon = lon;

            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            autoRefreshInterval = setInterval(() => {
                checkWeather(lastSearchedCity, lastSearchedLat, lastSearchedLon, true);
            }, 300000); // 5 minutes (300,000 milliseconds)

            document.getElementById('city-name').innerHTML = data.name;
            document.getElementById('description').innerHTML = data.weather[0].description;
            document.getElementById('humidity').innerHTML = data.main.humidity + '%';
            document.getElementById('wind-speed').innerHTML = data.wind.speed + ' km/h';
            document.getElementById('pressure').innerHTML = data.main.pressure + ' hPa';
            
            const now = new Date();
            document.getElementById('last-updated').innerText = `Last updated: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            
            updateTemperatureDisplay();
            
            // Update background and vector icons based on the API response
            const iconCode = data.weather[0].icon;

            updateBackground(data.weather[0].main, iconCode);

            const forecastResponse = await fetch(forecastUrl);
            if (forecastResponse.ok) {
                currentForecastData = await forecastResponse.json();
                displayForecast();
            }

            loader.style.display = 'none';
            weatherInfo.style.display = 'block';
            if (forecastContainer) forecastContainer.style.display = 'block';
            
            // Save to search history (max 5)
            let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
            history = history.filter(item => item.toLowerCase() !== data.name.toLowerCase());
            history.unshift(data.name);
            if (history.length > 5) history.pop();
            localStorage.setItem('searchHistory', JSON.stringify(history));
            displayHistory();
        }
    } catch (error) {
        console.error("Error fetching weather data:", error);
        loader.style.display = 'none';
        errorMessage.innerHTML = "An error occurred. Please check your internet connection.";
        errorMessage.style.display = 'block';
    }
}

unitToggleBtn.addEventListener('click', () => {
    isCelsius = !isCelsius;
    unitToggleBtn.innerText = isCelsius ? '°C' : '°F';
    updateTemperatureDisplay();
    if (currentForecastData) {
        displayForecast();
    }
});

function updateTemperatureDisplay() {
    if (!currentWeatherData) return;
    let temp = currentWeatherData.main.temp;
    let feelsLike = currentWeatherData.main.feels_like;
    if (!isCelsius) {
        temp = (temp * 9/5) + 32;
        feelsLike = (feelsLike * 9/5) + 32;
    }
    document.getElementById('temperature').innerHTML = Math.round(temp) + (isCelsius ? '°C' : '°F');
    document.getElementById('feels-like').innerHTML = Math.round(feelsLike) + (isCelsius ? '°C' : '°F');
}

function applyTheme() {
    const themeIcon = themeToggleBtn.querySelector('i');
    document.body.classList.remove('theme-light', 'theme-dark');
    
    if (currentTheme === 'light') {
        document.body.classList.add('theme-light');
        themeIcon.className = 'fas fa-sun';
    } else if (currentTheme === 'dark') {
        document.body.classList.add('theme-dark');
        themeIcon.className = 'fas fa-moon';
    } else {
        themeIcon.className = 'fas fa-cloud-sun';
    }
    
    localStorage.setItem('theme', currentTheme);
}

themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'auto' ? 'dark' : (currentTheme === 'dark' ? 'light' : 'auto');
    applyTheme();
});

searchBtn.addEventListener('click', () => {
    const city = searchInput.value.trim();
    if (city) {
        suggestionsDropdown.style.display = 'none';
        checkWeather(city);
    }
});

searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const city = searchInput.value.trim();
        if (city) {
            suggestionsDropdown.style.display = 'none';
            checkWeather(city);
        }
    }
});

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (!query) {
        suggestionsDropdown.style.display = 'none';
        return;
    }

    clearTimeout(suggestionTimeout);
    suggestionTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                suggestionsDropdown.innerHTML = '';
                data.forEach(city => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    const state = city.state ? `${city.state}, ` : '';
                    div.innerText = `${city.name}, ${state}${city.country}`;
                    div.onclick = () => {
                        searchInput.value = city.name;
                        suggestionsDropdown.style.display = 'none';
                        checkWeather(city.name, city.lat, city.lon);
                    };
                    suggestionsDropdown.appendChild(div);
                });
                suggestionsDropdown.style.display = 'flex';
            } else {
                suggestionsDropdown.style.display = 'none';
            }
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    }, 300); // 300ms debounce
});

// Hide suggestions dropdown when user clicks outside of it
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
        suggestionsDropdown.style.display = 'none';
    }
});

// Voice Search implementation using Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = function() {
        voiceBtn.classList.add('listening');
        searchInput.placeholder = "Listening...";
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.trim();
        // Remove a trailing period if speech recognition adds it
        const city = transcript.replace(/\.$/, '');
        searchInput.value = city;
        checkWeather(city);
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error:", event.error);
        voiceBtn.classList.remove('listening');
        searchInput.placeholder = "Enter city name...";
    };

    recognition.onend = function() {
        voiceBtn.classList.remove('listening');
        searchInput.placeholder = "Enter city name...";
    };

    voiceBtn.addEventListener('click', () => {
        recognition.start();
    });
} else {
    voiceBtn.style.display = 'none'; // Hide if browser doesn't support Web Speech API
}

function updateBackground(weatherMain, iconCode) {
    const condition = weatherMain.toLowerCase();
    const isNight = iconCode.endsWith('n'); // OpenWeatherMap icons end with 'n' for night
    
    updateWeatherIcon(condition, isNight);

    let bgClass = 'bg-default';
    
    if (isNight) {
        bgClass = 'bg-night';
    } else if (condition === 'clear') {
        bgClass = 'bg-sunny';
    } else if (condition === 'clouds') {
        bgClass = 'bg-cloudy';
    } else if (['rain', 'drizzle', 'thunderstorm'].includes(condition)) {
        bgClass = 'bg-rainy';
    } else if (condition === 'snow') {
        bgClass = 'bg-snowy';
    }
    
    document.body.classList.remove('bg-default', 'bg-sunny', 'bg-cloudy', 'bg-rainy', 'bg-snowy', 'bg-night');
    document.body.classList.add(bgClass);
}

function updateWeatherIcon(condition, isNight) {
    const iconElement = document.getElementById('weather-icon');
    let iconClass = 'fas fa-cloud'; // Default
    
    if (condition === 'clear') {
        iconClass = isNight ? 'fas fa-moon' : 'fas fa-sun';
    } else if (condition === 'clouds') {
        iconClass = isNight ? 'fas fa-cloud-moon' : 'fas fa-cloud-sun';
    } else if (['rain', 'drizzle'].includes(condition)) {
        iconClass = 'fas fa-cloud-rain';
    } else if (condition === 'thunderstorm') {
        iconClass = 'fas fa-bolt';
    } else if (condition === 'snow') {
        iconClass = 'fas fa-snowflake';
    } else {
        iconClass = 'fas fa-smog';
    }
    
    iconElement.className = iconClass;
}

function displayForecast() {
    const forecastCards = document.getElementById('forecast-cards');
    if (!forecastCards || !currentForecastData) return;
    forecastCards.innerHTML = '';

    // Filter to get one forecast per day (around noon)
    const dailyData = currentForecastData.list.filter(item => item.dt_txt.includes('12:00:00'));

    dailyData.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const tempValue = isCelsius ? day.main.temp : (day.main.temp * 9/5) + 32;
        const temp = Math.round(tempValue) + (isCelsius ? '°C' : '°F');
        const condition = day.weather[0].main.toLowerCase();
        
        let iconClass = 'fas fa-cloud'; // Default
        if (condition === 'clear') iconClass = 'fas fa-sun';
        else if (condition === 'clouds') iconClass = 'fas fa-cloud';
        else if (['rain', 'drizzle'].includes(condition)) iconClass = 'fas fa-cloud-rain';
        else if (condition === 'thunderstorm') iconClass = 'fas fa-bolt';
        else if (condition === 'snow') iconClass = 'fas fa-snowflake';
        else iconClass = 'fas fa-smog';

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <p>${dayName}</p>
            <i class="${iconClass}"></i>
            <h4>${temp}</h4>
        `;
        forecastCards.appendChild(card);
    });
}

function displayHistory() {
    const historyContainer = document.getElementById('history');
    if (!historyContainer) return;
    let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    historyContainer.innerHTML = '';
    history.forEach(city => {
        const span = document.createElement('span');
        span.className = 'history-item';
        span.innerText = city;
        span.onclick = () => {
            searchInput.value = city;
            checkWeather(city);
        };
        historyContainer.appendChild(span);
    });
}

// Automatically load history or detect location when the page opens
window.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    displayHistory();
    let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    if (history.length > 0) {
        checkWeather(history[0]);
    } else if (navigator.geolocation) {
        // Show loader while waiting for the user's permission
        loader.style.display = 'block';
        // Detect location if no history exists
        navigator.geolocation.getCurrentPosition(
            position => checkWeather(null, position.coords.latitude, position.coords.longitude),
            error => {
                loader.style.display = 'none';
                errorMessage.innerHTML = "Location access denied.";
                errorMessage.style.display = 'block';
            }
        );
    }
});

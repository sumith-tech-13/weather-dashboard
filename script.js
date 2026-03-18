// Replace this with your own free API key from OpenWeatherMap
const API_KEY = '7bad8f21259a8c8a75c8bb38b186beb1';
const apiUrl = 'https://api.openweathermap.org/data/2.5/weather?units=metric&q=';

const searchInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherInfo = document.getElementById('weather-info');
const errorMessage = document.getElementById('error-message');
const loader = document.getElementById('loader');

async function checkWeather(city, lat = null, lon = null) {
    // Show loader and hide previous results before fetching
    loader.style.display = 'block';
    weatherInfo.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
        let url = apiUrl + city + `&appid=${API_KEY}`;
        if (lat !== null && lon !== null) {
            url = `https://api.openweathermap.org/data/2.5/weather?units=metric&lat=${lat}&lon=${lon}&appid=${API_KEY}`;
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

            document.getElementById('city-name').innerHTML = data.name;
            document.getElementById('temperature').innerHTML = Math.round(data.main.temp) + '°C';
            document.getElementById('description').innerHTML = data.weather[0].description;
            document.getElementById('humidity').innerHTML = data.main.humidity + '%';
            document.getElementById('wind-speed').innerHTML = data.wind.speed + ' km/h';
            
            // Set the weather icon dynamically based on the API response
            const iconCode = data.weather[0].icon;
            document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

            loader.style.display = 'none';
            weatherInfo.style.display = 'block';
            
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

searchBtn.addEventListener('click', () => {
    const city = searchInput.value.trim();
    if (city) {
        checkWeather(city);
    }
});

searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const city = searchInput.value.trim();
        if (city) {
            checkWeather(city);
        }
    }
});

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
    displayHistory();
    let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    if (history.length > 0) {
        checkWeather(history[0]);
    } else if (navigator.geolocation) {
        // Detect location if no history exists
        navigator.geolocation.getCurrentPosition(
            position => checkWeather(null, position.coords.latitude, position.coords.longitude),
            error => console.log("Location access denied or unavailable.")
        );
    }
});

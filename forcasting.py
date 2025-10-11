import requests
import os

# --- Configuration ---
# It's best practice to store API keys in environment variables
# For testing, you can uncomment the line below and replace with your actual key
# OPENWEATHER_API_KEY = "YOUR_OPENWEATHER_API_KEY_HERE"
OPENWEATHER_API_KEY = "161e88e066875e63108a70dd67b644f9"

# Check if the API key is set
if not OPENWEATHER_API_KEY:
    print("Error: OPENWEATHER_API_KEY environment variable not set.")
    print("Please set it or replace the placeholder in the code for testing.")
    exit()

BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

def get_current_weather(city_name, units="metric", lang="en"):
    """
    Fetches current weather data for a given city.

    Args:
        city_name (str): The name of the city (e.g., "London", "New York").
        units (str): Unit of measurement ('metric' for Celsius, 'imperial' for Fahrenheit).
        lang (str): Language of the output (e.g., 'en', 'es').

    Returns:
        dict: A dictionary containing weather data, or None if an error occurs.
    """
    params = {
        "q": city_name,
        "appid": OPENWEATHER_API_KEY,
        "units": units,
        "lang": lang
    }

    try:
        response = requests.get(BASE_URL, params=params)
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
        weather_data = response.json()
        return weather_data
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        print(f"Response: {response.text}") # Print response for debugging
    except requests.exceptions.ConnectionError as conn_err:
        print(f"Connection error occurred: {conn_err}")
    except requests.exceptions.Timeout as timeout_err:
        print(f"Timeout error occurred: {timeout_err}")
    except requests.exceptions.RequestException as req_err:
        print(f"An unexpected error occurred: {req_err}")
    return None

def display_weather(weather_data, city_name, units):
    """
    Prints formatted weather information.
    """
    if weather_data:
        main_weather = weather_data['weather'][0]['main']
        description = weather_data['weather'][0]['description']
        temp = weather_data['main']['temp']
        feels_like = weather_data['main']['feels_like']
        humidity = weather_data['main']['humidity']
        wind_speed = weather_data['wind']['speed']
        
        unit_temp = "°C" if units == "metric" else "°F"
        unit_wind = "m/s" if units == "metric" else "mph"

        print(f"\n--- Current Weather in {city_name.title()} ---")
        print(f"Condition: {main_weather} ({description})")
        print(f"Temperature: {temp}{unit_temp} (Feels like: {feels_like}{unit_temp})")
        print(f"Humidity: {humidity}%")
        print(f"Wind Speed: {wind_speed}{unit_wind}")
        print("--------------------------------------")
    else:
        print(f"Could not retrieve weather for {city_name}.")
        

city="Imphal"
weather_celsius = get_current_weather(city, units="metric")
display_weather(weather_celsius, city, "metric")
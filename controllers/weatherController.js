import axios from "axios";
import pool from "../db.js";

const WEATHERCODE_MAP = {
  0: "cielo claro",
  1: "principalmente despejado",
  2: "parcialmente nublado",
  3: "nublado",
  45: "niebla",
  48: "depósitos de niebla",
  51: "llovizna ligera",
  53: "llovizna moderada",
  55: "llovizna intensa",
  61: "lluvia débil",
  63: "lluvia moderada",
  65: "lluvia fuerte",
  71: "nieve ligera",
  73: "nieve moderada",
  75: "nieve fuerte",
  80: "chubascos",
  81: "chubascos intensos",
  95: "tormenta",
  96: "tormenta con granizo",
};


const popToPercent = (pop) => {
  if (pop === undefined || pop === null) return null;
  return `${Math.round(pop * 100)}%`;
};

const isoToUnix = (iso) => {
  // Aseguramos que tratamos la fecha como UTC agregando 'Z' si no la tiene
  const dateStr = iso.endsWith('Z') ? iso : `${iso}Z`;
  return Math.floor(new Date(dateStr).getTime() / 1000);
};

export const getWeather = async (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: "Ciudad requerida" });

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=es`;

    console.log("[getWeather] geoUrl:", geoUrl);
    const geoRes = await axios.get(geoUrl).catch((err) => {

      console.error("[getWeather] error en geocoding request:", {
        message: err.message,
        status: err.response?.status,
        responseData: err.response?.data,
        config: err.config?.url || err.config,
      });
      throw err;
    });

    const place = geoRes.data.results?.[0];
    if (!place) {
      console.warn("[getWeather] Geocoding no devolvió resultados para:", city);
      return res.status(404).json({ error: "Ciudad no encontrada" });
    }

    const lat = place.latitude;
    const lon = place.longitude;

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure,visibility&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`;

    console.log("[getWeather] forecastUrl:", forecastUrl);
    const fRes = await axios.get(forecastUrl).catch((err) => {
      console.error("[getWeather] error en forecast request:", {
        message: err.message,
        status: err.response?.status,
        responseData: err.response?.data,
        config: err.config?.url || err.config,
      });
      throw err;
    });

    const data = fRes.data;
    const current = data.current || {};

    const weather = {
      city: place.name || city,
      coord: { lat, lon },
      temperature: current.temperature_2m ?? null,
      feels_like: current.apparent_temperature ?? null,
      temp_min: data.daily?.temperature_2m_min?.[0] ?? null,
      temp_max: data.daily?.temperature_2m_max?.[0] ?? null,
      humidity: current.relative_humidity_2m ?? null,
      pressure: current.surface_pressure ?? null,
      visibility: current.visibility ? current.visibility / 1000 : null, // Convertir a km
      wind_speed: current.wind_speed_10m ?? null,
      wind_deg: null,
      description: WEATHERCODE_MAP[current.weather_code] || `code:${current.weather_code}`,
      icon: null,
      sunrise: null,
      sunset: null,
    };

    pool.query(
      `INSERT INTO weather_history (city, temperature, description, humidity, wind_speed) VALUES (?, ?, ?, ?, ?)`,
      [weather.city, weather.temperature, weather.description, weather.humidity, weather.wind_speed],
      (err) => {
        if (err) console.error("[getWeather] Error insert weather_history:", err);
      }
    );

    pool.query(`INSERT INTO searches (city) VALUES (?)`, [weather.city], (err) => {
      if (err) console.error("[getWeather] Error insert searches:", err);
    });

    return res.json(weather);
  } catch (error) {
    console.error("[getWeather] Excepción capturada:", {
      message: error?.message,
      stack: error?.stack,
      responseData: error?.response?.data,
    });
    return res.status(500).json({ error: "Error obteniendo clima", details: error?.message });
  }
};

export const getOneCall = async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat y lon son requeridos" });

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,precipitation,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto`;
    console.log("[getOneCall] url:", url);
    const resp = await axios.get(url);
    const data = resp.data;

    const hourly = (data.hourly?.time || []).map((t, i) => ({
      dt: isoToUnix(data.hourly.time[i]),
      temp: data.hourly.temperature_2m?.[i] ?? null,
      feels_like: null,
      humidity: data.hourly.relativehumidity_2m?.[i] ?? null,
      pop: data.hourly.precipitation?.[i] ? popToPercent(data.hourly.precipitation[i]) : null,
      weather: WEATHERCODE_MAP[data.hourly.weathercode?.[i]] || `code:${data.hourly.weathercode?.[i]}`,
      icon: null,
      wind_speed: data.hourly.windspeed_10m?.[i] ?? null,
    }));

    const daily = (data.daily?.time || []).map((t, i) => ({
      dt: isoToUnix(data.daily.time[i]),
      temp_min: data.daily.temperature_2m_min?.[i] ?? null,
      temp_max: data.daily.temperature_2m_max?.[i] ?? null,
      humidity: null,
      pop: data.daily.precipitation_sum?.[i] ? popToPercent(data.daily.precipitation_sum[i]) : null,
      wind_speed: null,
      description: WEATHERCODE_MAP[data.daily.weathercode?.[i]] || `code:${data.daily.weathercode?.[i]}`,
      icon: null,
      sunrise: null,
      sunset: null,
    }));

    hourly.forEach((h) => {
      pool.query(
        `INSERT INTO forecast_hourly (city, dt, temp, feels_like, humidity, pop, wind_speed, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.query.city || null, h.dt, h.temp, h.feels_like, h.humidity, h.pop, h.wind_speed, h.weather],
        (err) => {
          if (err) console.error("[getOneCall] Error insert forecast_hourly:", err);
        }
      );
    });

    daily.forEach((d) => {
      pool.query(
        `INSERT INTO forecast_daily (city, dt, temp_min, temp_max, humidity, pop, wind_speed, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.query.city || null, d.dt, d.temp_min, d.temp_max, d.humidity, d.pop, d.wind_speed, d.description],
        (err) => {
          if (err) console.error("[getOneCall] Error insert forecast_daily:", err);
        }
      );
    });

    return res.json({
      lat: data.latitude || lat,
      lon: data.longitude || lon,
      timezone: data.timezone,
      current: data.current_weather ?? null,
      hourly,
      daily,
    });
  } catch (error) {
    console.error("[getOneCall] error:", {
      message: error?.message,
      responseData: error?.response?.data,
      stack: error?.stack,
    });
    return res.status(500).json({ error: "Error obteniendo pronóstico" });
  }
};

export const getAirQuality = async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat y lon son requeridos" });

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi&timezone=auto`;
    console.log("[getAirQuality] url:", url);
    const resp = await axios.get(url);
    const data = resp.data;

    if (!data.hourly || !data.hourly.time || data.hourly.time.length === 0) {
      return res.status(404).json({ error: "No hay datos de calidad del aire" });
    }

    const lastIdx = data.hourly.time.length - 1;
    const components = {
      pm2_5: data.hourly.pm2_5?.[lastIdx] ?? null,
      pm10: data.hourly.pm10?.[lastIdx] ?? null,
      co: data.hourly.carbon_monoxide?.[lastIdx] ?? null,
      no2: data.hourly.nitrogen_dioxide?.[lastIdx] ?? null,
      o3: data.hourly.ozone?.[lastIdx] ?? null,
    };

    const aqi = data.hourly?.us_aqi?.[lastIdx] ?? null;

    pool.query(
      `INSERT INTO air_quality_history (city, aqi, pm2_5, pm10, co, no2, o3) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.query.city || null, aqi, components.pm2_5, components.pm10, components.co, components.no2, components.o3],
      (err) => {
        if (err) console.error("[getAirQuality] Error insert air_quality_history:", err);
      }
    );

    return res.json({ aqi, components });
  } catch (error) {
    console.error("[getAirQuality] error:", {
      message: error?.message,
      responseData: error?.response?.data,
      stack: error?.stack,
    });
    return res.status(500).json({ error: "Error obteniendo calidad del aire" });
  }
};
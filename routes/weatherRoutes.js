// server/routes/weatherRoutes.js
import express from "express";
import { 
  getWeather, 
  getOneCall, 
  getAirQuality 
} from "../controllers/weatherController.js";

const router = express.Router();

/**
 * @route GET /weather
 * @desc Obtiene el clima actual por nombre de ciudad
 * @query city = "Lima"
 */
router.get("/weather", getWeather);

/**
 * @route GET /onecall
 * @desc Obtiene pronósticos:
 *        - por horas (hourly)
 *        - por 7 días (daily)
 *        - sensación térmica
 *        - índices UV
 * @query lat= -12.04
 * @query lon= -77.03
 */
router.get("/onecall", getOneCall);

/**
 * @route GET /air-quality
 * @desc Obtiene la calidad del aire (AQI)
 * @query lat
 * @query lon
 */
router.get("/air-quality", getAirQuality);

export default router;

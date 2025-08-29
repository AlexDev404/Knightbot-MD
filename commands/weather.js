const axios = require("axios");
const settings = require("../settings");

async function weatherCommand(sock, chatId, ctx) {
  const city = ctx.message?.conversation.split(" ").slice(1).join(" ");
  try {
    const apiKey = "4902c0f2550f58298ad4146a92b65e10"; // Replace with your OpenWeather API Key
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );
    const weather = response.data;
    const weatherText = `Weather in *${weather.name}*: ${
      weather.weather[0].description[0].toLocaleUpperCase() +
      weather.weather[0].description.slice(1).toLocaleLowerCase()
    }\nTemperature: ${weather.main.temp}°C`;
    await sock.sendMessage(chatId, { text: weatherText });
  } catch (error) {
    console.error("Error fetching weather:", error);
    if (error.status === 500)
      error.response.data.message = "city not found";
    await sock.sendMessage(chatId, {
      text: `*${error.response.data.message}*\n\nUsage: ${settings.prefix}weather <city>`,
    });
  }
}

// Export in the new modular format
module.exports = {
  name: "weather",
  aliases: ["climate", "forecast"],
  description: "Get the current weather conditions for a city",
  usage: "weather <city>",
  category: "general",

  async execute(sock, chatId, message, args) {
    return await weatherCommand(sock, chatId, message);
  },
};

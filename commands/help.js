const settings = require("../settings");
const fs = require("fs");
const path = require("path");

// Export in the new modular format
module.exports = {
  name: "help",
  aliases: ["menu", "bot", "list"],
  description: "Show all available commands",
  usage: ".help",
  category: "general",

  async execute(sock, chatId, message, args) {
    return await helpCommand(sock, chatId, message);
  },
};

async function helpCommand(sock, chatId, message) {
  const helpMessage = `
*${settings.botName || "Untitled Bot"}*  
Version: *${settings.version || "2.0.5"}*

*Available Commands:*
${global.commandHandler
  .getAllCommands()
  .map(
    (cmd) => {
    const description = cmd.description ? ` - ${cmd.description}` : "";
    const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : "";
    return `- *${cmd.name}*${aliases}${description}`;
    }
  )
  .join("\n")}
`;

  try {

      await sock.sendMessage(
        chatId,
        {
          text: helpMessage,
          contextInfo: {
            isForwarded: false
          },
        },
        { quoted: message }
      );

  } catch (error) {
    console.error("Error in help command:", error);
    await sock.sendMessage(chatId, { text: helpMessage });
  }
}

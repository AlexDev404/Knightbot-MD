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
╔═══════════════════╗
   *🤖 ${settings.botName || "KnightBot-MD"}*  
   Version: *${settings.version || "2.0.5"}*
   by ${settings.botOwner || "Mr Unique Hacker"}
   YT : ${global.ytch}
╚═══════════════════╝

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
    const imagePath = path.join(__dirname, "../assets/bot_image.jpg");

    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);

      await sock.sendMessage(
        chatId,
        {
          image: imageBuffer,
          caption: helpMessage,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363161513685998@newsletter",
              newsletterName: "KnightBot MD",
              serverMessageId: -1,
            },
          },
        },
        { quoted: message }
      );
    } else {
      console.error("Bot image not found at:", imagePath);
      await sock.sendMessage(chatId, {
        text: helpMessage,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363161513685998@newsletter",
            newsletterName: "KnightBot MD by Mr Unique Hacker",
            serverMessageId: -1,
          },
        },
      });
    }
  } catch (error) {
    console.error("Error in help command:", error);
    await sock.sendMessage(chatId, { text: helpMessage });
  }
}

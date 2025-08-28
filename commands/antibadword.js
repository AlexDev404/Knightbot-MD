const { handleAntiBadwordCommand } = require("../lib/automod");
const isAdmin = require("../lib/isAdmin");

async function antibadwordCommand(sock, chatId, message) {
  const senderId = message.key.participant || message.key.remoteJid;
  const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
  try {
    if (!isSenderAdmin) {
      await sock.sendMessage(chatId, { text: "For Group Admins Only!" });
      return;
    }

    // Extract match from message
    const text =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "";
    const match = text.split(" ").slice(1).join(" ");

    await handleAntiBadwordCommand(sock, chatId, message, match);
  } catch (error) {
    console.error("Error in antibadword command:", error);
    await sock.sendMessage(chatId, {
      text: "*Error processing antibadword command*",
    });
  }
}

module.exports = antibadwordCommand;

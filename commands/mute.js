const isAdmin = require("../lib/isAdmin");

async function muteCommand(sock, chatId, ctx) {
  const durationInMinutes = ctx.message.conversation?.split(" ")[1];
  if (isNaN(parseInt(durationInMinutes))) {
    await sock.sendMessage(chatId, {
      text: "Please provide a valid number of minutes.",
    });
    return;
  }
  console.log(`Attempting to mute the group for ${durationInMinutes} minutes.`); // Log for debugging
  const senderId = ctx.key.participant || ctx.key.remoteJid;
  const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
  if (!isBotAdmin) {
    await sock.sendMessage(chatId, {
      text: "Please make the bot an admin first.",
    });
    return;
  }

  if (!isSenderAdmin) {
    await sock.sendMessage(chatId, {
      text: "Only group admins can use the mute command.",
    });
    return;
  }

  const durationInMilliseconds = durationInMinutes * 60 * 1000;
  try {
    await sock.groupSettingUpdate(chatId, "announcement"); // Mute the group
    await sock.sendMessage(chatId, {
      text: `The group has been muted for ${durationInMinutes} minutes.`,
    });

    setTimeout(async () => {
      await sock.groupSettingUpdate(chatId, "not_announcement"); // Unmute after the duration
      await sock.sendMessage(chatId, { text: "The group has been unmuted." });
    }, durationInMilliseconds);
  } catch (error) {
    console.error("Error muting/unmuting the group:", error);
    await sock.sendMessage(chatId, {
      text: "An error occurred while muting/unmuting the group. Please try again.",
    });
  }
}

module.exports = muteCommand;

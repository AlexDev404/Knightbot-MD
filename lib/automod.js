const {
  setAntiBadword,
  getAntiBadword,
  removeAntiBadword,
  incrementWarningCount,
  resetWarningCount,
} = require("./index");
const fs = require("fs");
const path = require("path");
const settings = require("../settings");

// Load antibadword config
function loadAntibadwordConfig(groupId) {
  try {
    const configPath = path.join(__dirname, "../data/userGroupData.json");
    if (!fs.existsSync(configPath)) {
      return {};
    }
    const data = JSON.parse(fs.readFileSync(configPath));
    return data.antibadword?.[groupId] || {};
  } catch (error) {
    console.error("❌ Error loading automod config:", error.message);
    return {};
  }
}

async function handleAntiBadwordCommand(sock, chatId, message, match) {
  if (!match) {
    return sock.sendMessage(chatId, {
      text: `*AUTOMOD SETUP*\n\n*.automod on*\nTurn on automod\n\n*.automod set <action>*\nSet action: delete/kick/warn\n\n*.automod off*\nDisables automod in this group`,
    });
  }

  if (match === "on") {
    const existingConfig = await getAntiBadword(chatId, "on");
    if (existingConfig?.enabled) {
      return sock.sendMessage(chatId, {
        text: "*Automod is already enabled for this group*",
      });
    }
    await setAntiBadword(chatId, "on", "delete");
    return sock.sendMessage(chatId, {
      text: `*Automod has been enabled. Use ${settings.prefix}automod set <action> to customize the penalty*`,
    });
  }

  if (match === "off") {
    const config = await getAntiBadword(chatId, "on");
    if (!config?.enabled) {
      return sock.sendMessage(chatId, {
        text: "*Automod is already disabled for this group*",
      });
    }
    await removeAntiBadword(chatId);
    return sock.sendMessage(chatId, {
      text: "*Automod has been disabled for this group*",
    });
  }

  if (match.startsWith("set")) {
    const action = match.split(" ")[1];
    if (!action || !["delete", "kick", "warn"].includes(action)) {
      return sock.sendMessage(chatId, {
        text: "*Invalid action. Choose: delete, kick, or warn*",
      });
    }
    await setAntiBadword(chatId, "on", action);
    return sock.sendMessage(chatId, {
      text: `*Automod action set to: ${action}*`,
    });
  }

  return sock.sendMessage(chatId, {
    text: `*Invalid command. Use ${settings.prefix}automod to see usage*`,
  });
}

async function handleBadwordDetection(
  sock,
  chatId,
  message,
  userMessage,
  senderId
) {
  const config = loadAntibadwordConfig(chatId);
  if (!config.enabled) return;

  const filter = global.badWordFilter;

  // Skip if not group
  if (!chatId.endsWith("@g.us")) return;

  // Skip if message is from bot
  if (message.key.fromMe) return;

  // Get antibadword config first
  const antiBadwordConfig = await getAntiBadword(chatId, "on");
  if (!antiBadwordConfig?.enabled) {
    console.log("Antibadword not enabled for this group");
    return;
  }

  // Convert message to lowercase and clean it
  const cleanMessage = userMessage
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace special chars with space
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();

  // Split message into words
  const messageWords = cleanMessage.split(" ");
  let containsBadWord = false;

  // Check for exact word matches only
  for (const word of messageWords) {
    // Skip empty words or very short words
    if (word.length < 2) continue;

    // Use bad-words filter to check if word is profane
    if (filter.isProfane(word)) {
      containsBadWord = true;
      break;
    }
    if (containsBadWord) break;
  }

  if (!containsBadWord) return;

  // console.log('Bad word detected in:', userMessage);

  // Check if bot is admin before taking action
  const groupMetadata = await sock.groupMetadata(chatId);
  const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
  const botLId = sock.user.lid.split(":")[0] + "@lid";
  const bot = groupMetadata.participants.find(
    (p) => p.id === botId || p.id === botLId
  );
  if (!bot?.admin) {
    console.log("Bot is not admin, cannot take action");
    return;
  }

  // Check if sender is admin
  const participant = groupMetadata.participants.find((p) => p.id === senderId);
  if (participant?.admin) {
    console.log("Sender is admin, skipping action");
    return;
  }

  // Delete message immediately
  try {
    await sock.sendMessage(chatId, {
      delete: message.key,
    });
    //console.log('Message deleted successfully');
  } catch (err) {
    console.error("Error deleting message:", err);
    return;
  }

  // Take action based on config
  switch (antiBadwordConfig.action) {
    case "delete":
      await sock.sendMessage(chatId, {
        text: `*@${senderId.split("@")[0]} bad words are not allowed here*`,
        mentions: [senderId],
      });
      break;

    case "kick":
      try {
        await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
        await sock.sendMessage(chatId, {
          text: `*@${
            senderId.split("@")[0]
          } has been kicked for using bad words*`,
          mentions: [senderId],
        });
      } catch (error) {
        console.error("Error kicking user:", error);
      }
      break;

    case "warn":
      const warningCount = await incrementWarningCount(chatId, senderId);
      if (warningCount >= 3) {
        try {
          await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
          await resetWarningCount(chatId, senderId);
          await sock.sendMessage(chatId, {
            text: `*@${
              senderId.split("@")[0]
            } has been kicked after 3 warnings*`,
            mentions: [senderId],
          });
        } catch (error) {
          console.error("Error kicking user after warnings:", error);
        }
      } else {
        await sock.sendMessage(chatId, {
          text: `*@${
            senderId.split("@")[0]
          } warning ${warningCount}/3 for using bad words*`,
          mentions: [senderId],
        });
      }
      break;
  }
}

module.exports = {
  handleAntiBadwordCommand,
  handleBadwordDetection,
};

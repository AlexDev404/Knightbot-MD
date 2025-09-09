const isAdmin = require("../lib/isAdmin");

async function kickCommand(sock, chatId, ctx) {
  const message =
    ctx.message.conversation ?? ctx.message.extendedTextMessage.text;
  const mentionedJids =
    ctx.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const senderId = ctx.key.participant || ctx.key.remoteJid;
  const quotedParticipant =
    ctx.message?.extendedTextMessage?.contextInfo?.participant;
  const quotedMessage = ctx.message?.extendedTextMessage?.contextInfo?.stanzaId;

  const kickReason = message.split(' ').slice(1).join(' ');
  // Check if user is owner
  const isOwner = ctx.key.fromMe;
  if (!isOwner) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
      await sock.sendMessage(
        chatId,
        { text: "Please make the bot an admin first." },
        { quoted: ctx }
      );
      return;
    }

    if (!isSenderAdmin) {
      await sock.sendMessage(
        chatId,
        { text: "Only group admins can use the kick command." },
        { quoted: ctx }
      );
      return;
    }
  }

  let usersToKick = [];

  // Get bot's ID
  const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
  const botLId = sock.user.lid.split(":")[0] + "@lid";

  // Check for mentioned users
  if (mentionedJids && mentionedJids.length > 0) {
    usersToKick = mentionedJids;
  }
  // Check for replied message
  else if (quotedParticipant) {
    // Check if we're the person being kicked
    usersToKick = [quotedParticipant];
  }

  // If no user found through either method
  if (usersToKick.length === 0) {
    await sock.sendMessage(
      chatId,
      {
        text: "Please mention the user or reply to their message to kick!",
      },
      { quoted: ctx }
    );
    return;
  }

  // Check if any of the users to kick is the bot itself
  if (usersToKick.includes(botId) || usersToKick.includes(botLId)) {
    await sock.sendMessage(
      chatId,
      {
        text: "I won't kick myself 😕",
      },
      { quoted: ctx }
    );
    return;
  }

  // Check if the user is trying to kick themselves
  if (usersToKick.includes(senderId)) {
    await sock.sendMessage(
      chatId,
      {
        text: "You can't kick yourself 😐",
      },
      { quoted: ctx }
    );
    return;
  }

  try {
    await sock.groupParticipantsUpdate(chatId, usersToKick, "remove");

    // Get usernames for each kicked user
    const usernames = await Promise.all(
      usersToKick.map(async (jid) => {
        return `@${jid.split("@")[0]}`;
      })
    );

    await sock.sendMessage(chatId, {
      text: `${usernames.join(", ")} has been kicked successfully!`,
      mentions: usersToKick,
    });

    // Afterwards, delete the offending message if it exists
    // Delete the message that was replied to (if any)
    if (quotedMessage) {
      await sock.sendMessage(chatId, {
        delete: {
          remoteJid: chatId,
          fromMe: false,
          id: quotedMessage,
          participant: quotedParticipant,
        },
      });
    }

    // DM the kicked user with the kick reason (if any)
    if (kickReason && kickReason.length > 0) {
      for (const jid of usersToKick) {
        await sock.sendMessage(jid, {
          text: `You have been kicked from the group ${
            chatId.split("@")[0]
          } for the following reason:\n\n${kickReason}`,
        });
      }
    }
  } catch (error) {
    console.error("Error in kick command:", error);
    await sock.sendMessage(chatId, {
      text: "Failed to kick user(s)!",
    });
  }
}

module.exports = {
  name: "kick",
  aliases: ["naenae"],
  description:
    'Kick a user from the group. Usage: "kick @user" or reply to a user\'s message with "kick"',
  usage: "kick",
  category: "admin",

  async execute(sock, chatId, message, args) {
    return kickCommand(sock, chatId, message);
  },
};

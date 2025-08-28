const { loadMessageCounts } = require("../lib/messageCount");

function topMembers(sock, chatId, isGroup) {
  if (!isGroup) {
    sock.sendMessage(chatId, {
      text: "This command is only available in group chats.",
    });
    return;
  }

  const messageCounts = loadMessageCounts();
  const groupCounts = messageCounts[chatId] || {};

  const sortedMembers = Object.entries(groupCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Get top 5 members

  if (sortedMembers.length === 0) {
    sock.sendMessage(chatId, { text: "No message activity recorded yet." });
    return;
  }

  let message = "🏆 Top Members Based on Message Count:\n\n";
  sortedMembers.forEach(([userId, count], index) => {
    message += `${index + 1}. @${userId.split("@")[0]} - ${count} messages\n`;
  });

  sock.sendMessage(chatId, {
    text: message,
    mentions: sortedMembers.map(([userId]) => userId),
  });
}

module.exports = topMembers;

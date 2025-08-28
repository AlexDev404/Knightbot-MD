const fs = require("fs");
const path = require("path");

const dataFilePath = path.join(__dirname, "..", "data", "messageCount.json");

function loadMessageCounts() {
  if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath);
    return JSON.parse(data);
  }
  return {};
}

function saveMessageCounts(messageCounts) {
  fs.writeFileSync(dataFilePath, JSON.stringify(messageCounts, null, 2));
}

function incrementMessageCount(groupId, userId) {
  const messageCounts = loadMessageCounts();

  if (!messageCounts[groupId]) {
    messageCounts[groupId] = {};
  }

  if (!messageCounts[groupId][userId]) {
    messageCounts[groupId][userId] = 0;
  }

  messageCounts[groupId][userId] += 1;

  saveMessageCounts(messageCounts);
}

module.exports = {
  loadMessageCounts,
  incrementMessageCount,
  saveMessageCounts,
};

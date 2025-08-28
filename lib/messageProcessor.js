// Feature handlers - these handle non-command message processing
const { handleAutoread } = require("../commands/autoread");
const {
  handleAutotypingForMessage,
  showTypingAfterCommand,
} = require("../commands/autotyping");
const { handleChatbotResponse } = require("../commands/chatbot");
const { handleBadwordDetection } = require("../lib/antibadword");
const { Antilink } = require("../lib/antilink");
const {
  storeMessage,
  handleMessageRevocation,
} = require("../commands/antidelete");
// const { handleTicTacToeMove } = require('../commands/tictactoe');
const { incrementMessageCount } = require("../lib/messageCount");
const { addCommandReaction } = require("../lib/reactions");

class MessageProcessor {
  constructor() {
    this.channelInfo = {
      contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363161513685998@newsletter",
          newsletterName: "KnightBot MD",
          serverMessageId: -1,
        },
      },
    };
  }

  async processMessage(sock, message, messageData, context) {
    try {
      // Handle autoread functionality
      await handleAutoread(sock, message);

      // Store message for antidelete feature
      if (message.message) {
        storeMessage(message);
      }

      // Handle message revocation (deleted messages)
      if (messageData.isProtocolMessage) {
        await handleMessageRevocation(sock, message);
        return true; // Message processed, stop further processing
      }

      // Handle game moves (tic-tac-toe)
      // if (messageData.isGameMove) {
      //     await handleTicTacToeMove(sock, context.chatId, context.senderId, messageData.text);
      //     return true;
      // }

      // Increment message count for group analytics
      if (!context.isFromMe && context.isGroup) {
        incrementMessageCount(context.chatId, context.senderId);
      }

      return false; // Continue processing
    } catch (error) {
      console.error("Error in message preprocessing:", error);
      return false;
    }
  }

  async processNonCommandMessage(sock, message, messageData, context) {
    try {
      // Show typing indicator if autotyping is enabled
      await handleAutotypingForMessage(sock, context.chatId, messageData.text);
      if (context.isGroup && messageData.text) {
        // Process group-specific features
        await handleChatbotResponse(
          sock,
          context.chatId,
          message,
          messageData.text,
          context.senderId
        );
        await Antilink(message, sock);
        await handleBadwordDetection(
          sock,
          context.chatId,
          message,
          messageData.text,
          context.senderId
        );
      }
    } catch (error) {
      console.error("Error processing non-command message:", error);
    }
  }

  async postCommandProcessing(sock, message, context, commandExecuted) {
    try {
      // Add reaction to command messages
      if (commandExecuted && message.key) {
        await addCommandReaction(sock, message);
      }

      // Show typing indicator after command execution if needed
      if (commandExecuted) {
        await showTypingAfterCommand(sock, context.chatId);
      }
    } catch (error) {
      console.error("Error in post-command processing:", error);
    }
  }

  async handleError(sock, chatId, error) {
    console.error("❌ Error in message handler:", error.message);

    // Only try to send error message if we have a valid chatId
    if (chatId) {
      try {
        await sock.sendMessage(chatId, {
          text: "❌ Failed to process command!",
          ...this.channelInfo,
        });
      } catch (sendError) {
        console.error("Failed to send error message:", sendError);
      }
    }
  }
}

module.exports = MessageProcessor;

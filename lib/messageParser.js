const settings = require("../settings");

class MessageParser {
    constructor() {
        this.prefix = settings.prefix;
    }

    parseMessage(message) {
        const userMessage = this.extractText(message).toLowerCase().replace(/\.\s+/g, '.').trim();
        const rawText = this.extractText(message, false);

        return {
            text: userMessage,
            rawText: rawText,
            isCommand: userMessage.startsWith(this.prefix),
            command: this.extractCommand(userMessage),
            args: this.extractArgs(rawText)
        };
    }

    extractText(message, toLowerCase = true) {
        const text = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            ''
        );

        return toLowerCase ? text.toLowerCase() : text;
    }

    extractCommand(userMessage) {
        if (!userMessage.startsWith(this.prefix)) {
            return null;
        }

        return userMessage.slice(1).split(' ')[0];
    }

    extractArgs(rawText) {
        if (!rawText.startsWith(this.prefix)) {
            return [];
        }

        const parts = rawText.slice(1).split(' ');
        return parts.slice(1); // Remove command, keep args
    }

    getMessageContext(message) {
        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        return {
            chatId,
            senderId,
            isGroup,
            quotedMessage,
            mentionedJids,
            isFromMe: message.key.fromMe
        };
    }

    // Special handlers for different message types
    isGameMove(text) {
        return /^[1-9]$/.test(text) || text.toLowerCase() === 'surrender';
    }

    isProtocolMessage(message) {
        return message.message?.protocolMessage?.type === 0;
    }

    getChannelInfo() {
        return {
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'KnightBot MD',
                    serverMessageId: -1
                }
            }
        };
    }
}

module.exports = MessageParser;

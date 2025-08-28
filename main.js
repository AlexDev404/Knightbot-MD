const settings = require('./settings');
require('./config.js');

// Import the new modular components
const CommandHandler = require('./lib/commandHandler');
const PermissionManager = require('./lib/permissionManager');
const MessageParser = require('./lib/messageParser');
const MessageProcessor = require('./lib/messageProcessor');

// Import specific handlers that are still needed
const { handlePromotionEvent } = require('./commands/promote');
const { handleDemotionEvent } = require('./commands/demote');
const { handleStatusUpdate } = require('./commands/autostatus');
const { isWelcomeOn, isGoodByeOn } = require('./lib/index');
const fs = require('fs');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A";
global.ytch = "Mr Unique Hacker";

// Initialize modular components
const commandHandler = new CommandHandler();
global.commandHandler = commandHandler; // Make commandHandler globally accessible if needed
const permissionManager = new PermissionManager();
const messageParser = new MessageParser();
const messageProcessor = new MessageProcessor();

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Parse message and extract context
        const messageData = messageParser.parseMessage(message);
        const context = messageParser.getMessageContext(message);

        // Add special message type checks
        messageData.isProtocolMessage = messageParser.isProtocolMessage(message);
        messageData.isGameMove = messageParser.isGameMove(messageData.text);

        // Pre-process message (autoread, antidelete, etc.)
        const shouldStop = await messageProcessor.processMessage(sock, message, messageData, context);
        if (shouldStop) return;

        // Log command usage only
        if (messageData.isCommand) {
            console.log(`📝 Command used in ${context.isGroup ? 'group' : 'private'}: ${messageData.text}`);
        }

        // Handle non-command messages
        if (!messageData.isCommand) {
            await messageProcessor.processNonCommandMessage(sock, message, messageData, context);
            return;
        }

        // Check permissions for command
        const permissionResult = await permissionManager.checkPermissions(
            messageData.command, sock, context.chatId, context.senderId, message
        );

        if (!permissionResult.allowed) {
            await permissionManager.sendPermissionError(
                sock, context.chatId, permissionResult.reason, message
            );
            return;
        }

        // Execute command
        let commandExecuted = false;
        try {
            commandExecuted = await commandHandler.executeCommand(
                messageData.command, sock, context.chatId, message, messageData.args
            );
        } catch (error) {
            console.error(`Command execution failed for ${messageData.command}:`, error);
            commandExecuted = false;
        }

        // If command wasn't found in the handler, try legacy command processing
        if (!commandExecuted) {
            commandExecuted = await handleLegacyCommands(sock, message, messageData, context);
        }

        // Post-command processing
        await messageProcessor.postCommandProcessing(sock, message, context, commandExecuted);

    } catch (error) {
        const context = messageParser.getMessageContext(messages[0] || {});
        await messageProcessor.handleError(sock, context.chatId, error);
    }
}

// Legacy command handler for commands that haven't been fully modularized yet
async function handleLegacyCommands(sock, message, messageData, context) {
    const { isSudo } = require('./lib/index');
    const channelInfo = messageParser.getChannelInfo();
    const userMessage = messageData.text;
    const chatId = context.chatId;
    
    // Special handling for .mode command
    if (userMessage.startsWith('.mode')) {
        const senderIsSudo = await isSudo(context.senderId);
        
        if (!message.key.fromMe && !senderIsSudo) {
            await sock.sendMessage(chatId, { text: 'Only bot owner can use this command!', ...channelInfo });
            return true;
        }
        
        let data;
        try {
            data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
        } catch (error) {
            console.error('Error reading access mode:', error);
            await sock.sendMessage(chatId, { text: 'Failed to read bot mode status', ...channelInfo });
            return true;
        }

        const action = userMessage.split(' ')[1]?.toLowerCase();
        if (!action) {
            const currentMode = data.isPublic ? 'public' : 'private';
            await sock.sendMessage(chatId, {
                text: `Current bot mode: *${currentMode}*\n\nUsage: .mode public/private\n\nExample:\n.mode public - Allow everyone to use bot\n.mode private - Restrict to owner only`,
                ...channelInfo
            });
            return true;
        }

        if (action !== 'public' && action !== 'private') {
            await sock.sendMessage(chatId, {
                text: 'Usage: .mode public/private\n\nExample:\n.mode public - Allow everyone to use bot\n.mode private - Restrict to owner only',
                ...channelInfo
            });
            return true;
        }

        try {
            data.isPublic = action === 'public';
            fs.writeFileSync('./data/messageCount.json', JSON.stringify(data, null, 2));
            await sock.sendMessage(chatId, { text: `Bot is now in *${action}* mode`, ...channelInfo });
        } catch (error) {
            console.error('Error updating access mode:', error);
            await sock.sendMessage(chatId, { text: 'Failed to update bot access mode', ...channelInfo });
        }
        return true;
    }

    // Special handling for .jid command
    if (userMessage === '.jid') {
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: "❌ This command can only be used in a group.",
                ...channelInfo
            });
        } else {
            await sock.sendMessage(chatId, {
                text: `✅ Group JID: ${chatId}`,
                ...channelInfo
            }, { quoted: message });
        }
        return true;
    }

    return false; // Command not handled
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;

        // Check if it's a group
        if (!id.endsWith('@g.us')) return;

        // Handle promotion events
        if (action === 'promote') {
            await handlePromotionEvent(sock, id, participants, author);
            return;
        }

        // Handle demotion events
        if (action === 'demote') {
            await handleDemotionEvent(sock, id, participants, author);
            return;
        }

        // Handle join events
        if (action === 'add') {
            // Check if welcome is enabled for this group
            const isWelcomeEnabled = await isWelcomeOn(id);
            if (!isWelcomeEnabled) return;

            // Get group metadata
            const groupMetadata = await sock.groupMetadata(id);
            const groupName = groupMetadata.subject;
            const groupDesc = groupMetadata.desc || 'No description available';

            // Get welcome message from data
            const data = JSON.parse(fs.readFileSync('./data/userGroupData.json'));
            const welcomeData = data.welcome[id];
            const welcomeMessage = welcomeData?.message || 'Welcome {user} to the group! 🎉';
            const channelId = welcomeData?.channelId || '120363161513685998@newsletter';

            // Send welcome message for each new participant
            for (const participant of participants) {
                const user = participant.split('@')[0];
                const formattedMessage = welcomeMessage
                    .replace('{user}', `@${user}`)
                    .replace('{group}', groupName)
                    .replace('{description}', groupDesc);

                await sock.sendMessage(id, {
                    text: formattedMessage,
                    mentions: [participant],
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: channelId,
                            newsletterName: 'KnightBot MD',
                            serverMessageId: -1
                        }
                    }
                });
            }
        }

        // Handle leave events
        if (action === 'remove') {
            // Check if goodbye is enabled for this group
            const isGoodbyeEnabled = await isGoodByeOn(id);
            if (!isGoodbyeEnabled) return;

            // Get group metadata
            const groupMetadata = await sock.groupMetadata(id);
            const groupName = groupMetadata.subject;

            // Get goodbye message from data
            const data = JSON.parse(fs.readFileSync('./data/userGroupData.json'));
            const goodbyeData = data.goodbye[id];
            const goodbyeMessage = goodbyeData?.message || 'Goodbye {user} 👋';
            const channelId = goodbyeData?.channelId || '120363161513685998@newsletter';

            // Send goodbye message for each leaving participant
            for (const participant of participants) {
                const user = participant.split('@')[0];
                const formattedMessage = goodbyeMessage
                    .replace('{user}', `@${user}`)
                    .replace('{group}', groupName);

                await sock.sendMessage(id, {
                    text: formattedMessage,
                    mentions: [participant],
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: channelId,
                            newsletterName: 'KnightBot MD',
                            serverMessageId: -1
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error in handleGroupParticipantUpdate:', error);
    }
}

// Export the handlers
module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus: async (sock, status) => {
        await handleStatusUpdate(sock, status);
    }
};

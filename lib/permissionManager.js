const fs = require('fs');

class PermissionManager {
    constructor() {
        this.adminCommands = new Set([
            'mute', 'unmute', 'ban', 'unban', 'promote', 'demote', 
            'kick', 'tagall', 'antilink', 'welcome', 'goodbye', 
            'antibadword', 'chatbot', 'resetlink', 'clear'
        ]);

        this.ownerCommands = new Set([
            'mode', 'autostatus', 'antidelete', 'cleartmp', 'setpp', 
            'clearsession', 'areact', 'autoreact', 'autotyping', 
            'autoread', 'sudo'
        ]);
    }

    isAdminCommand(command) {
        return this.adminCommands.has(command);
    }

    isOwnerCommand(command) {
        return this.ownerCommands.has(command);
    }

    async checkPermissions(command, sock, chatId, senderId, message) {
        const isGroup = chatId.endsWith('@g.us');
        const isOwnerCommand = this.isOwnerCommand(command);
        const isAdminCommand = this.isAdminCommand(command);

        // Check if user is banned
        const { isBanned } = require('./isBanned');
        if (isBanned(senderId) && command !== 'unban') {
            return { allowed: false, reason: 'banned' };
        }

        // Check bot access mode
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            const { isSudo } = require('./index');
            const senderIsSudo = await isSudo(senderId);
            
            if (!data.isPublic && !message.key.fromMe && !senderIsSudo) {
                return { allowed: false, reason: 'private_mode' };
            }
        } catch (error) {
            console.error('Error checking access mode:', error);
        }

        // Check owner permissions
        if (isOwnerCommand) {
            const { isSudo } = require('./index');
            const senderIsSudo = await isSudo(senderId);
            
            if (!message.key.fromMe && !senderIsSudo) {
                return { allowed: false, reason: 'owner_only' };
            }
        }

        // Check admin permissions for group commands
        if (isGroup && isAdminCommand) {
            const isAdmin = require('./isAdmin');
            const adminStatus = await isAdmin(sock, chatId, senderId, message);
            
            if (!adminStatus.isBotAdmin) {
                return { allowed: false, reason: 'bot_not_admin' };
            }

            if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
                return { allowed: false, reason: 'admin_only' };
            }
        }

        return { allowed: true };
    }

    async sendPermissionError(sock, chatId, reason, message) {
        const channelInfo = {
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

        let errorMessage;
        switch (reason) {
            case 'banned':
                errorMessage = '❌ You are banned from using the bot. Contact an admin to get unbanned.';
                break;
            case 'private_mode':
                return; // Silent ignore in private mode
            case 'owner_only':
                errorMessage = '❌ This command is only available for the owner or sudo!';
                break;
            case 'bot_not_admin':
                errorMessage = 'Please make the bot an admin to use admin commands.';
                break;
            case 'admin_only':
                errorMessage = 'Sorry, only group admins can use this command.';
                break;
            default:
                errorMessage = '❌ You do not have permission to use this command.';
        }

        await sock.sendMessage(chatId, { 
            text: errorMessage, 
            ...channelInfo 
        }, { quoted: message });
    }
}

module.exports = PermissionManager;

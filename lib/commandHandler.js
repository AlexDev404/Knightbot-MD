const fs = require('fs');
const path = require('path');

class CommandHandler {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
        this.loadCommands();
    }

    loadCommands() {
        const commandsDir = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const commandPath = path.join(commandsDir, file);
                const command = require(commandPath);
                
                // Support different export patterns
                if (command.name && command.execute) {
                    // console.log(`Loaded command: ${command.name}`);
                    this.registerCommand(command);
                } else if (typeof command === 'function') {
                    // console.log(`Loaded command from function: ${file}`);
                    // For simple function exports, derive name from filename
                    const commandName = file.replace('.js', '');
                    this.registerCommand({
                        name: commandName,
                        execute: command,
                        aliases: []
                    });
                }
            } catch (error) {
                console.error(`Error loading command ${file}:`, error.message);
            }
        }
    }

    registerCommand(command) {
        this.commands.set(command.name, command);
        
        // Register aliases
        if (command.aliases && Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
                this.aliases.set(alias, command.name);
            }
        }
    }

    getCommand(name) {
        // Check direct command name first
        if (this.commands.has(name)) {
            return this.commands.get(name);
        }
        
        // Check aliases
        if (this.aliases.has(name)) {
            const commandName = this.aliases.get(name);
            return this.commands.get(commandName);
        }
        
        return null;
    }

    async executeCommand(commandName, sock, chatId, message, args = []) {
        const command = this.getCommand(commandName);
        
        if (!command) {
            return false;
        }

        try {
            await command.execute(sock, chatId, message, args);
            return true;
        } catch (error) {
            console.error(`Error executing command ${commandName}:`, error.message);
            throw error;
        }
    }

    getAllCommands() {
        return Array.from(this.commands.values());
    }

    getCommandNames() {
        return Array.from(this.commands.keys());
    }
}

module.exports = CommandHandler;

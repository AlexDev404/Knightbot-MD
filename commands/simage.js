const sharp = require('sharp');
const fs = require('fs');
const fsPromises = require('fs/promises');
const fse = require('fs-extra');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const tempDir = './temp';
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const scheduleFileDeletion = (filePath) => {
    setTimeout(async () => {
        try {
            await fse.remove(filePath);
            console.log(`File deleted: ${filePath}`);
        } catch (error) {
            console.error(`Failed to delete file:`, error);
        }
    }, 60000); // 60 seconds
};

const convertStickerToImage = async (sock, chatId, ctx, args) => {
    try {
        const quotedMessage = ctx.message.extendedTextMessage.contextInfo.quotedMessage;
        const stickerMessage = quotedMessage.stickerMessage;
        if (!stickerMessage) {
            await sock.sendMessage(chatId, { text: 'Reply to a sticker with .simage to convert it.' });
            return;
        }

        const stickerFilePath = path.join(tempDir, `sticker_${Date.now()}.webp`);
        const outputImagePath = path.join(tempDir, `converted_image_${Date.now()}.png`);

        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await fsPromises.writeFile(stickerFilePath, buffer);
        await sharp(stickerFilePath).toFormat('png').toFile(outputImagePath);

        const imageBuffer = await fsPromises.readFile(outputImagePath);
        await sock.sendMessage(chatId, { image: imageBuffer, caption: '✨ Here\'s your image!' });

        scheduleFileDeletion(stickerFilePath);
        scheduleFileDeletion(outputImagePath);
    } catch (error) {
        console.error('Error converting sticker to image:', error);
        await sock.sendMessage(chatId, { text: 'An error occurred while converting the sticker.' });
    }
};

module.exports = convertStickerToImage;

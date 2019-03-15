import TelegramBot from "node-telegram-bot-api";

const token = "709158490:AAHi2YwiHwUkom5cLQ3AabhYopDsFBlf4Bk";

const bot = new TelegramBot(token, { polling: true });

bot.onText("/help", x => {
    console.log(x);
});

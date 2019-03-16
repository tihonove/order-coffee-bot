import TelegramBot from "node-telegram-bot-api";

import { OrderingBot } from "./OrderingBot";
import { readSettingsSync } from "./ReadSettings";

const settings = readSettingsSync();
const bot = new TelegramBot(settings.telegramBotApiKey, { polling: true });
const orderingBot = new OrderingBot(bot);
orderingBot.start();

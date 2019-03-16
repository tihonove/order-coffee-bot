import TelegramBot from "node-telegram-bot-api";

import { OrderingBot } from "./OrderingBot";

const token = "";

const bot = new TelegramBot(token, { polling: true });

const orderingBot = new OrderingBot(bot);
orderingBot.start();

import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";

import { Order } from "./Domain/Order";
import { OrderingChat } from "./Domain/OrderingChat";
import { OrderDraft, OrderRequest, ToggleOrderResult } from "./Domain/OrderDraft";
import { Person } from "./Domain/Person";
import { sendEmail } from "./SendEmail";

interface OrderingChatContext {
    chatId: number;
    orderingChat: OrderingChat;
    currentOrderDraft?: OrderDraft;
    currentOrderDraftMessageId?: number;
    currentOrder?: Order;
    currentOrderMessageId?: number;
}

const orderInlineKeyboard = [
    [
        { text: "200+", callback_data: "[200, 250]" },
        { text: "250+", callback_data: "[250, 300]" },
        { text: "300+", callback_data: "[300, 350]" },
    ],
    [
        { text: "350+", callback_data: "[350, 400]" },
        { text: "400+", callback_data: "[400, 450]" },
        { text: "450+", callback_data: "[450, 500]" },
    ],
    [
        { text: "500+", callback_data: "[500, 550]" },
        { text: "550+", callback_data: "[550, 600]" },
        { text: "600+", callback_data: "[600, 650]" },
    ],
    [{ text: "Завешить заказ", callback_data: "/end" }, { text: "Отменить", callback_data: "/cancel" }],
];

// /order

export class OrderingBot {
    private readonly chats: { [chatId: string]: undefined | OrderingChatContext } = {};
    private readonly bot: TelegramBot;

    public constructor(bot: TelegramBot) {
        this.bot = bot;
    }

    public start(): void {
        this.bot.onText(/^\/help/, this.handleHelp);
        this.bot.onText(/^\/cancel/, this.handleCancel);
        this.bot.onText(/^\/begin/, this.handleBegin);
        this.bot.onText(/^\/end/, this.handleEnd);
        this.bot.onText(/^\/edit/, this.handleEdit);
        this.bot.onText(/^\/order/, this.handleOrder);
        this.bot.addListener("callback_query", this.handleCallbackQuery);
    }

    private getOrCreateOrderingChatContext(chatId: number): OrderingChatContext {
        const result = this.chats[chatId];
        if (result == undefined) {
            const newChat = {
                orderingChat: new OrderingChat(144),
                chatId: chatId,
            };
            this.chats[chatId] = newChat;
            return newChat;
        }
        return result;
    }

    private async cancelCurrentOrderOrDraft(chatId: number): Promise<void> {
        const context = this.getOrCreateOrderingChatContext(chatId);
        if (context.currentOrder != undefined && context.currentOrderMessageId != undefined) {
            await this.bot.editMessageText("Отправка заказа отменена", {
                chat_id: context.chatId,
                message_id: context.currentOrderMessageId,
                reply_markup: {
                    inline_keyboard: [],
                },
            });
            context.currentOrderDraft = undefined;
            context.currentOrderDraftMessageId = undefined;
        }
        if (context.currentOrderDraft != undefined && context.currentOrderDraftMessageId != undefined) {
            await this.bot.editMessageText("Заказ отменён", {
                chat_id: context.chatId,
                message_id: context.currentOrderDraftMessageId,
                reply_markup: {
                    inline_keyboard: [],
                },
            });
            context.currentOrderDraft = undefined;
            context.currentOrderDraftMessageId = undefined;
        }
    }

    private readonly handleCallbackQuery = async (x: CallbackQuery): Promise<void> => {
        if (x.data == undefined || x.message == undefined) {
            return;
        }
        if (x.data === "/cancel") {
            await this.cancelCurrentOrderOrDraft(x.message.chat.id);
            return;
        }
        if (x.data === "/end") {
            await this.endOrderDraftAndCreateOrder(x.message.chat.id);
            return;
        }
        if (x.data === "/edit") {
            await this.cancelOrderingAndReturnToEdit(x.message.chat.id);
            return;
        }
        if (x.data === "/order") {
            await this.sendOrder(x.message.chat.id);
            return;
        }
        const chatInfo = this.getOrCreateOrderingChatContext(x.message.chat.id);
        if (chatInfo.currentOrderDraft == undefined) {
            await this.bot.answerCallbackQuery(x.id, {
                text: "Нет активных заказов",
            });
            return;
        }
        if (chatInfo.currentOrder != undefined) {
            await this.bot.answerCallbackQuery(x.id, {
                text: "Невозможно добавить заказа. Формирование заказа завершено",
            });
            return;
        }

        let jsonRequest: [number, number];
        try {
            // tslint:disable-next-line no-unsafe-any
            jsonRequest = JSON.parse(x.data);
        } catch (e) {
            return;
        }
        const [amount, optionalAmount]: [number, number] = jsonRequest;
        await this.togglePersonOrder(x, chatInfo, amount, optionalAmount);
    };

    private readonly handleEnd = async (message: Message): Promise<void> => {
        await this.endOrderDraftAndCreateOrder(message.chat.id);
    };

    private readonly handleEdit = async (message: Message): Promise<void> => {
        await this.cancelOrderingAndReturnToEdit(message.chat.id);
    };

    private readonly handleBegin = async (message: Message): Promise<void> => {
        const context = this.getOrCreateOrderingChatContext(message.chat.id);
        if (context.currentOrder != undefined) {
            await this.bot.sendMessage(
                context.chatId,
                "Сейчас в процессе завершения находится заказ. Оформите его командой /order или отмените командой /cancel"
            );
            return;
        }
        if (context.currentOrderDraft != undefined) {
            await this.bot.sendMessage(
                context.chatId,
                "Сейчас в процессе формирования находится заказ. Начните его оформление его командой /end или отмените командой /cancel"
            );
            return;
        }
        const orderDraft = context.orderingChat.beginOrder();
        const orderDraftMessage = await this.bot.sendMessage(
            message.chat.id,
            "Новый заказ." + "\n\n" + orderDraft.formatOrderDraftInfo(),
            {
                reply_markup: {
                    inline_keyboard: orderInlineKeyboard,
                },
            }
        );
        context.currentOrderDraft = orderDraft;
        context.currentOrderDraftMessageId = orderDraftMessage.message_id;
    };

    private readonly handleCancel = async (message: Message): Promise<void> => {
        await this.cancelCurrentOrderOrDraft(message.chat.id);
    };

    private readonly handleOrder = async (message: Message): Promise<void> => {
        await this.sendOrder(message.chat.id);
    };

    private readonly handleHelp = async (message: Message): Promise<void> => {
        await this.bot.sendMessage(message.chat.id, "Справка ещё не написана");
    };

    private async endOrderDraftAndCreateOrder(chatId: number): Promise<void> {
        const chatInfo = this.getOrCreateOrderingChatContext(chatId);
        if (chatInfo.currentOrderDraft == undefined || chatInfo.currentOrderDraftMessageId == undefined) {
            await this.bot.sendMessage(
                chatInfo.chatId,
                "Нет активного заказа. Начните формировать заказ командой /begin"
            );
            return;
        }
        if (chatInfo.currentOrder != undefined) {
            await this.bot.sendMessage(
                chatInfo.chatId,
                "Заказ уже готов к отправке. Отправте его командой /order или отменить командой /cancel"
            );
            return;
        }
        const order = chatInfo.currentOrderDraft.createOrder();
        await this.bot.editMessageReplyMarkup(
            {
                inline_keyboard: [],
            },
            {
                message_id: chatInfo.currentOrderDraftMessageId,
                chat_id: chatInfo.chatId,
            }
        );
        const orderMessage = await this.bot.sendMessage(
            chatInfo.chatId,
            "Заказ готов." + "\n\n" + order.formatOrderInfo(),
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Отправить заказ",
                                callback_data: "/order",
                            },
                            {
                                text: "Вернуться к редактированию",
                                callback_data: "/edit",
                            },
                        ],
                    ],
                },
            }
        );
        chatInfo.currentOrder = order;
        chatInfo.currentOrderMessageId = orderMessage.message_id;
    }

    private async togglePersonOrder(
        x: TelegramBot.CallbackQuery,
        chatInfo: OrderingChatContext,
        amount: number,
        optionalAmount: number
    ): Promise<void> {
        if (
            chatInfo.currentOrderDraft == undefined ||
            chatInfo.currentOrderDraftMessageId == undefined ||
            x.message == undefined
        ) {
            return;
        }
        const result = chatInfo.currentOrderDraft.toggleOrder(
            new Person(x.from.username),
            new OrderRequest(amount, optionalAmount)
        );

        await this.bot.editMessageText("Новый заказ!" + "\n\n" + chatInfo.currentOrderDraft.formatOrderDraftInfo(), {
            chat_id: x.message.chat.id,
            message_id: chatInfo.currentOrderDraftMessageId,
            reply_markup: {
                inline_keyboard: orderInlineKeyboard,
            },
        });
        let text: string | undefined;
        if (result === ToggleOrderResult.Added) {
            text = "Заказ добавлен";
        } else if (result === ToggleOrderResult.Removed) {
            text = "Заказ удалён";
        } else if (result === ToggleOrderResult.Updated) {
            text = "Заказ изменён";
        }
        if (text != undefined) {
            await this.bot.answerCallbackQuery(x.id, {
                text: text,
            });
        }
    }

    private async sendOrder(chatId: number): Promise<void> {
        const context = this.getOrCreateOrderingChatContext(chatId);
        if (context.currentOrder == undefined || context.currentOrderMessageId == undefined) {
            await this.bot.sendMessage(
                context.chatId,
                "Нет завершенного заказа. Завершите текущий заказ командой /end или начтите новый командой /begin"
            );
            return;
        }
        const messageBody = this.createEmailMessage(context.currentOrder);
        try {
            await sendEmail("tihonove@skbkontur.ru", "Заказ кофе на Малопрудная 5", messageBody);
        } catch (e) {
            console.log(e);
            await this.bot.sendMessage(
                context.chatId,
                `Не удалось отправить письмо с заказом. Тело письма\n\n\`\`\`\n${messageBody}\`\`\``
            );
        }
        await this.bot.editMessageText("Заказ отправлен." + "\n\n" + context.currentOrder.formatOrderInfo(), {
            chat_id: context.chatId,
            message_id: context.currentOrderMessageId,
            reply_markup: {
                inline_keyboard: [],
            },
        });
        context.currentOrder = undefined;
        context.currentOrderMessageId = undefined;
        context.currentOrderDraft = undefined;
        context.currentOrderDraftMessageId = undefined;
    }

    private async cancelOrderingAndReturnToEdit(chatId: number): Promise<void> {
        const context = this.getOrCreateOrderingChatContext(chatId);
        if (context.currentOrder == undefined || context.currentOrderMessageId == undefined) {
            await this.bot.sendMessage(context.chatId, "Нет завершенного заказа.");
            return;
        }
        if (context.currentOrderDraft == undefined || context.currentOrderDraftMessageId == undefined) {
            await this.bot.sendMessage(context.chatId, "Нет активного заказа.");
            return;
        }
        await this.bot.deleteMessage(context.chatId, context.currentOrderMessageId.toString());
        context.currentOrder = undefined;
        context.currentOrderMessageId = undefined;
        await this.bot.editMessageText("Новый заказ!" + "\n\n" + context.currentOrderDraft.formatOrderDraftInfo(), {
            chat_id: context.chatId,
            message_id: context.currentOrderDraftMessageId,
            reply_markup: {
                inline_keyboard: orderInlineKeyboard,
            },
        });
    }

    private createEmailMessage(currentOrder: Order): string {
        return currentOrder.createOrderEmailMessage();
    }
}

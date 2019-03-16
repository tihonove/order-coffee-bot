import { suite, test } from "mocha-typescript";

import { OrderDraft, OrderRequest, ToggleOrderResult } from "../src/Domain/OrderDraft";
import { Person } from "../src/Domain/Person";

import { expect } from "./Expect";

@suite
export class OrderDraftTest {
    @test
    public "Прямой сценарий заказа для двух человек"(): void {
        const orderDraft = new OrderDraft({ pricePer100Gram: 144 });
        const person1 = new Person("person1");
        const person2 = new Person("person2");
        orderDraft.addOrder(person1, new OrderRequest(350, 400));
        orderDraft.addOrder(person2, new OrderRequest(400, 450));
        const order = orderDraft.createOrder();

        expect(order.lineAt(0).person.id).to.eql("person1");
        expect(order.lineAt(0).amount).to.eql(350);
        expect(order.lineAt(0).cost).to.eql((350 * 144) / 100);

        expect(order.lineAt(1).person.id).to.eql("person2");
        expect(order.lineAt(1).amount).to.eql(450);
        expect(order.lineAt(1).cost).to.eql((450 * 144) / 100);

        expect(order.total).to.eql(8 * 144);
        expect(order.deliveryCost).to.eql(0);
        expect(order.totalWithDelivery).to.eql(8 * 144);
    }

    @test
    public "Приорите выбору основного желаемого количества"(): void {
        const orderDraft = new OrderDraft({ pricePer100Gram: 144 });
        const person1 = new Person("person1");
        const person2 = new Person("person2");
        const person3 = new Person("person3");
        orderDraft.addOrder(person1, new OrderRequest(350, 400));
        orderDraft.addOrder(person2, new OrderRequest(400, 450));
        orderDraft.addOrder(person3, new OrderRequest(200, 250));
        const order = orderDraft.createOrder();

        expect(order.lineAt(0).amount).to.eql(350);
        expect(order.lineAt(1).amount).to.eql(400);
        expect(order.lineAt(2).amount).to.eql(250);
    }

    @test
    public "Исключение если невозомжность посторить заказ"(): void {
        const orderDraft = new OrderDraft({ pricePer100Gram: 144 });
        const person1 = new Person("person1");
        orderDraft.addOrder(person1, new OrderRequest(350, 450));

        expect(() => orderDraft.createOrder()).to.throw(/Невозможность создать заказ/);
    }

    @test
    public "Заказ с платной доставкой"(): void {
        const orderDraft = new OrderDraft({ pricePer100Gram: 144 });
        const person1 = new Person("person1");
        const person2 = new Person("person2");
        orderDraft.addOrder(person1, new OrderRequest(250, 300));
        orderDraft.addOrder(person2, new OrderRequest(250, 300));

        const order = orderDraft.createOrder();

        expect(order.lineAt(0).amount).to.eql(250);
        expect(order.lineAt(0).cost).to.eql((250 * 144) / 100 + 150);
        expect(order.lineAt(1).amount).to.eql(250);
        expect(order.lineAt(1).cost).to.eql((250 * 144) / 100 + 150);
        expect(order.deliveryCost).to.eql(300);
        expect(order.totalWithDelivery).to.eql((500 * 144) / 100 + 300);
    }

    @test
    public "Переключение заказа"(): void {
        const orderDraft = new OrderDraft({ pricePer100Gram: 144 });
        const person1 = new Person("person1");
        expect(orderDraft.toggleOrder(person1, new OrderRequest(250, 300))).to.eql(ToggleOrderResult.Added);
        expect(orderDraft.getOrderRequests().length).to.eql(1);
        expect(orderDraft.toggleOrder(person1, new OrderRequest(300, 350))).to.eql(ToggleOrderResult.Updated);
        expect(orderDraft.getOrderRequests().length).to.eql(1);
        expect(orderDraft.toggleOrder(person1, new OrderRequest(300, 350))).to.eql(ToggleOrderResult.Removed);
        expect(orderDraft.getOrderRequests().length).to.eql(0);
    }

    @test
    public "Форматирование пустого заказа"(): void {
        const orderDraft = new OrderDraft({ pricePer100Gram: 144 });
        expect(orderDraft.formatOrderDraftInfo()).to.eql("Нет заказов");
    }

    @test
    public "Форматирование черновика заказа"(): void {
        const orderDraft = new OrderDraft({ pricePer100Gram: 144 });
        const person1 = new Person("person1");
        const person2 = new Person("person2");
        orderDraft.addOrder(person1, new OrderRequest(250, 300));
        orderDraft.addOrder(person2, new OrderRequest(250, 300));
        expect(orderDraft.formatOrderDraftInfo()).to.eql(
            "@person1 - 250гр. или 300гр.\n" + "@person2 - 250гр. или 300гр.\n"
        );
    }

    @test
    public "Форматирование заказа"(): void {
        const orderDraft = new OrderDraft({ pricePer100Gram: 144 });
        const person1 = new Person("person1");
        const person2 = new Person("person2");
        orderDraft.addOrder(person1, new OrderRequest(250, 300));
        orderDraft.addOrder(person2, new OrderRequest(250, 300));
        expect(orderDraft.createOrder().formatOrderInfo()).to.eql(
            `@person1 - 250 гр., 510 руб.\n` +
                `@person2 - 250 гр., 510 руб.\n\n` +
                `Всего к оплате: 1020, в том числе доставка (300 руб.)`
        );
    }

    @test
    public "Форматирование заказа, с платной доставкой"(): void {
        const orderDraft = new OrderDraft({ pricePer100Gram: 144 });
        const person1 = new Person("person1");
        const person2 = new Person("person2");
        orderDraft.addOrder(person1, new OrderRequest(200, 250));
        orderDraft.addOrder(person2, new OrderRequest(200, 250));
        expect(orderDraft.createOrder().formatOrderInfo()).to.eql(
            `@person1 - 200 гр., 438 руб.\n` +
                `@person2 - 200 гр., 438 руб.\n\n` +
                `Всего к оплате: 876, в том числе доставка (300 руб.)`
        );
    }

    @test
    public "Форматирование тела пиьма"(): void {
        const orderDraft = new OrderDraft({ pricePer100Gram: 144 });
        const person1 = new Person("person1");
        const person2 = new Person("person2");
        orderDraft.addOrder(person1, new OrderRequest(200, 250));
        orderDraft.addOrder(person2, new OrderRequest(200, 250));
        expect(orderDraft.createOrder().createOrderEmailMessage()).to.eql(
            `Всего 400 гр. Упаковать отдельно в пакеты по: 200 гр, 200 гр.`
        );
    }
}

import { IPricing } from "./IPricing";
import { Person } from "./Person";

export interface OrderLine {
    amount: number;
    person: Person;
}

export interface OrderLineWithCost extends OrderLine {
    cost: number;
}

export class Order {
    private readonly pricing: IPricing;
    private readonly orderLines: OrderLine[] = [];

    public constructor(pricing: IPricing) {
        this.pricing = pricing;
    }

    public getOrderInfoWithCost(): OrderLineWithCost[] {
        const totalAmount = this.orderLines.reduce((result, x) => result + x.amount, 0);
        return this.orderLines.map(orderLine => ({
            ...orderLine,
            cost: (orderLine.amount / totalAmount) * this.totalWithDelivery,
        }));
    }

    public lineAt(index: number): OrderLineWithCost {
        const orderLine = this.orderLines[index];
        const totalAmount = this.orderLines.reduce((result, x) => result + x.amount, 0);
        return {
            ...orderLine,
            cost: (orderLine.amount / totalAmount) * this.totalWithDelivery,
        };
    }

    public addOrderLine(person: Person, amount: number): void {
        this.orderLines.push({
            person: person,
            amount: amount,
        });
    }

    public get total(): number {
        const totalAmount = this.orderLines.reduce((result, x) => result + x.amount, 0);
        return (totalAmount * this.pricing.pricePer100Gram) / 100;
    }

    public get deliveryCost(): number {
        if (this.total < 1000) {
            return 300;
        }
        return 0;
    }

    public get totalWithDelivery(): number {
        return this.total + this.deliveryCost;
    }

    public createOrderEmailMessage(): string {
        const totalAmount = this.orderLines.reduce((result, x) => result + x.amount, 0);

        return `Всего ${totalAmount} гр. Упаковать отдельно в пакеты по: ${this.orderLines
            .map(x => `${x.amount} гр`)
            .join(", ")}.`;
    }

    public formatOrderInfo(): string {
        let result = "";
        for (const o of this.getOrderInfoWithCost()) {
            result += `@${o.person.id} - ${o.amount}, ${o.cost} руб.\n`;
        }
        result += `\nВсего к оплате: ${this.totalWithDelivery}`;
        if (this.deliveryCost === 0) {
            result += ", доставка бесплатная";
        } else {
            result += `, в том числе доставка (${this.deliveryCost} руб.)`;
        }
        return result;
    }
}

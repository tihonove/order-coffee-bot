import { IPricing } from "./IPricing";
import { OrderDraft } from "./OrderDraft";

export class OrderingChat implements IPricing {
    public readonly pricePer100Gram: number;

    public constructor(pricePer100Gram: number) {
        this.pricePer100Gram = pricePer100Gram;
    }

    public beginOrder(): OrderDraft {
        const orderDraft = new OrderDraft(this);
        return orderDraft;
    }
}

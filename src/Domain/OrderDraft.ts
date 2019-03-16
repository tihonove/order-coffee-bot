import { IPricing } from "./IPricing";
import { Order } from "./Order";
import { Person } from "./Person";

export class OrderRequest {
    public readonly amountInGrams: number;
    public readonly optionalAmountInGrams: number;

    public constructor(amountInGrams: number, optionalAmountInGrams: number) {
        this.amountInGrams = amountInGrams;
        this.optionalAmountInGrams = optionalAmountInGrams;
    }
}

type PersonOrderRequest = [Person, OrderRequest];

export enum ToggleOrderResult {
    Added = "Added",
    Updated = "Updated",
    Removed = "Removed",
}

export interface OrderLineVariant {
    person: Person;
    amount: number;
    isOptionalAmount: boolean;
}

export class OrderDraft {
    private readonly orderRequests: PersonOrderRequest[] = [];
    private readonly pricing: IPricing;

    public constructor(pricing: IPricing) {
        this.pricing = pricing;
    }

    public formatOrderDraftInfo(): string {
        if (this.orderRequests.length === 0) {
            return "Нет заказов";
        }
        let result = "";
        for (const orderRequest of this.orderRequests) {
            result += `@${orderRequest[0].id} - ${orderRequest[1].amountInGrams}гр. или ${
                orderRequest[1].optionalAmountInGrams
            }гр.\n`;
        }
        return result;
    }

    public getOrderRequests(): PersonOrderRequest[] {
        return this.orderRequests;
    }

    public addOrder(person: Person, personOrderRequest: OrderRequest): void {
        this.orderRequests.push([person, personOrderRequest]);
    }

    public toggleOrder(person: Person, personOrderRequest: OrderRequest): ToggleOrderResult {
        const existingIndex = this.orderRequests.findIndex(x => x[0].id === person.id);
        if (existingIndex === -1) {
            this.orderRequests.push([person, personOrderRequest]);
            return ToggleOrderResult.Added;
        } else {
            if (
                this.orderRequests[existingIndex][1].amountInGrams === personOrderRequest.amountInGrams &&
                this.orderRequests[existingIndex][1].optionalAmountInGrams === personOrderRequest.optionalAmountInGrams
            ) {
                this.orderRequests.splice(existingIndex, 1);
                return ToggleOrderResult.Removed;
            } else {
                this.orderRequests[existingIndex][1] = personOrderRequest;
                return ToggleOrderResult.Updated;
            }
        }
    }

    public createOrder(): Order {
        const orderLinesVariant = this.findOptimalVariant();
        const result = new Order(this.pricing);
        for (const orderLineVariant of orderLinesVariant) {
            result.addOrderLine(orderLineVariant.person, orderLineVariant.amount);
        }
        return result;
    }

    private findOptimalVariant(): OrderLineVariant[] {
        let currentOrderVariant: undefined | OrderLineVariant[];
        let currentOptionalAmountsCount = Infinity;
        for (const orderVariant of this.produceOrderLinesVariants([], this.orderRequests)) {
            const amount = orderVariant.reduce((total, x) => total + x.amount, 0);
            const optionalAmountsCount = orderVariant.filter(x => x.isOptionalAmount).length;
            if (amount % 100 === 0) {
                if (optionalAmountsCount < currentOptionalAmountsCount) {
                    currentOptionalAmountsCount = optionalAmountsCount;
                    currentOrderVariant = orderVariant;
                }
            }
        }
        if (currentOrderVariant == undefined) {
            throw new Error("Невозможность создать заказ");
        }
        return currentOrderVariant;
    }

    private *produceOrderLinesVariants(
        prefix: OrderLineVariant[],
        suffix: PersonOrderRequest[]
    ): Iterable<OrderLineVariant[]> {
        const [current, ...rest] = suffix;
        const baseVariant = { person: current[0], amount: current[1].amountInGrams, isOptionalAmount: false };
        const optionalVariant = {
            person: current[0],
            amount: current[1].optionalAmountInGrams,
            isOptionalAmount: true,
        };
        if (rest.length === 0) {
            yield [...prefix, baseVariant];
            yield [...prefix, optionalVariant];
        } else {
            yield* this.produceOrderLinesVariants([...prefix, baseVariant], rest);
            yield* this.produceOrderLinesVariants([...prefix, optionalVariant], rest);
        }
    }
}

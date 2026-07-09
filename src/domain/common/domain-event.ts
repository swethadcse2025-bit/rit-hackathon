export interface DomainEvent {
  dateTimeOccurred: Date;
  getAggregateId(): string;
}

type EventHandler<T extends DomainEvent = any> = (event: T) => Promise<void> | void;

export class EventBus {
  private static handlers: { [eventName: string]: EventHandler[] } = {};

  public static subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = [];
    }
    this.handlers[eventName].push(handler);
  }

  public static async publish(event: DomainEvent): Promise<void> {
    const eventName = event.constructor.name;
    if (this.handlers[eventName]) {
      const promises = this.handlers[eventName].map(handler => {
        try {
          return Promise.resolve(handler(event));
        } catch (err) {
          console.error(`Error in event handler for ${eventName}:`, err);
        }
      });
      await Promise.all(promises);
    }
  }
}

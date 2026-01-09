/**
 * Event Emitter for VocabLoop SDK
 */

import type { VocabLoopEvent, VocabLoopEventData, EventHandler } from '../types';

type Listeners = {
  [K in VocabLoopEvent]?: Set<EventHandler<K>>;
};

class EventEmitter {
  private listeners: Listeners = {};

  on<T extends VocabLoopEvent>(event: T, handler: EventHandler<T>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    (this.listeners[event] as Set<EventHandler<T>>).add(handler);
  }

  off<T extends VocabLoopEvent>(event: T, handler: EventHandler<T>): void {
    const handlers = this.listeners[event] as Set<EventHandler<T>> | undefined;
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit<T extends VocabLoopEvent>(event: T, data: VocabLoopEventData[T]): void {
    const handlers = this.listeners[event] as Set<EventHandler<T>> | undefined;
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`VocabLoop SDK: Error in ${event} handler:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: VocabLoopEvent): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

export const eventEmitter = new EventEmitter();

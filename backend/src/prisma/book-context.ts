import { AsyncLocalStorage } from 'node:async_hooks';

export type BookType = 'book1' | 'book2';

export const bookStorage = new AsyncLocalStorage<BookType>();

export function getActiveBook(): BookType {
  return bookStorage.getStore() ?? 'book1';
}

export function runWithBook<T>(book: BookType, fn: () => T): T {
  return bookStorage.run(book, fn);
}

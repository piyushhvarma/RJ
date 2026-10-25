import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { runWithBook, BookType } from './book-context.js';

@Injectable()
export class BookMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const rawHeader = req.headers['x-book'] as string | undefined;
    const rawQuery = req.query?.book as string | undefined;

    let book: BookType = 'book1';
    if (rawHeader === 'book2' || rawQuery === 'book2') {
      book = 'book2';
    }

    runWithBook(book, () => {
      next();
    });
  }
}

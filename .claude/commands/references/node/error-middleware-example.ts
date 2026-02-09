// Example: Express error middleware with pt-BR public messages.

import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly publicMessagePtBr: string,
    public readonly details?: unknown
  ) {
    super(publicMessagePtBr);
  }
}

/** Handles known and unknown errors and returns a pt-BR response payload. */
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ mensagem: err.publicMessagePtBr, detalhes: err.details ?? null });
    return;
  }

  res.status(500).json({ mensagem: 'Ocorreu um erro inesperado. Tente novamente.', detalhes: null });
}

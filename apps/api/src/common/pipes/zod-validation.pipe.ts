import { PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/** Validates & parses a payload against a shared Zod schema. Errors are turned
 *  into the typed validation envelope by AllExceptionsFilter. */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}
  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}

import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';

/** Throw a clean HTTP error when a Supabase query fails. */
export function unwrap<T>(result: {
  data: T | null;
  error: PostgrestError | null;
}): T {
  if (result.error) {
    // PGRST116 = no rows returned for a `.single()` query.
    if (result.error.code === 'PGRST116') {
      throw new NotFoundException('Resource not found');
    }
    throw new InternalServerErrorException(result.error.message);
  }
  if (result.data === null) {
    throw new NotFoundException('Resource not found');
  }
  return result.data;
}

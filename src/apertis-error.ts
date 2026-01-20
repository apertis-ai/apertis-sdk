import { createJsonErrorResponseHandler } from '@ai-sdk/provider-utils';
import { z } from 'zod';

const apertisErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
    code: z.string().nullable().optional(),
    param: z.string().nullable().optional(),
  }),
});

export type ApertisErrorData = z.infer<typeof apertisErrorSchema>;

export const apertisFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: apertisErrorSchema,
  errorToMessage: (error) => error.error.message,
});

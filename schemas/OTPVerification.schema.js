import { z } from "zod";

const OTPVerificationSchema = z.object({
    code: z.string().length(6),
    user: z.email(),
}).strict();

export { OTPVerificationSchema };
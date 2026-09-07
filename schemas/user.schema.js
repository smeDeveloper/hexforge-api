import { validate } from "username-validator";
import { z } from "zod";

const userSchema = z.object({
    id: z.string(),
    username: z.string()
        .max(20, "The maximum length of username is 20.")
        .min(6 , "The minimun length of username is 6.")
        .refine((val) => validate(val, {
            lowercase: true,
            trim: true,
            blacklist: [],
            minLength: 6,
            allowedCharacters: ["letters" , "dashes" , "numbers"]
        }).isValid , {
            error: "Invalid username format (mustn't contain special characters except single hyphens)."
        }),
    first_name: z.string()
        .max(20, "The maximum length of First Name is 20.")
        .min(4 , "The minimun length of First Name is 4."),
    last_name: z.string()
        .max(20, "The maximum length of Last Name is 20.")
        .min(4 , "The minimun length of Last Name is 4."),
    email: z.email(),
    password: z.string().min(8 , "The password length must be >= 8"),
    verified: z.boolean().default(false),
    createdAt: z.date().default(Date.now())
}).strict();

const userLoginSchema = userSchema.omit({
        username: true,
        id: true,
        first_name: true,
        last_name: true,
        verified: true,
        createdAt: true
}).strict();

export { userSchema , userLoginSchema };
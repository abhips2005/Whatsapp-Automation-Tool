import JWT, { type JwtPayload, type VerifyErrors } from "jsonwebtoken";
import { z } from "zod";
import { sjcetMailSchema } from "./email";
const { sign, verify } = JWT;

const JWT_SECRET = process.env.JWT_TOKEN ?? "0000000000";

export const createToken = ({
    email,
    id,
    type,
    options,
}: TokenData & { options?: object }) =>
    sign(
        {
            id,
            email,
            type,
            ...options,
        },
        JWT_SECRET,
    );

type info<T> =
    | { error: null; data: JwtPayload & T }
    | { error: VerifyErrors; data: undefined };

export const verifyToken = <T = TokenData>(token: string) =>
    verify(token, JWT_SECRET, (error, data) => ({
        error,
        data,
    })) as unknown as info<T>;

export const tokenDataZod = z.object({
    id: z.string(),
    email: sjcetMailSchema,
    type: z.enum(["certificate", "registration", "event"]),
});

export type TokenData = z.infer<typeof tokenDataZod>;

// const token = createToken({
//     id: "insendium-24",
//     email: "asdfg2025@ai.sjcetpalai.ac.in",
//     type: "certificate",
//     options: {
//         event: {
//             "title": "INSENDIUM 2024",
//             "organisedBy": "IEDC",
//             "activityPoints": 5,
//             "description": "an ideation workshop for young entrepreneurs & innovators",
//             "link": "instagram link"
//         }
//     }
// })

// console.log(token)

// const data = verifyToken(token)
// console.log(data)

// console.log(await getResponse(JSON.stringify(data), ``))

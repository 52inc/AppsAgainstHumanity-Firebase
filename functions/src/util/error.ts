import {FunctionsErrorCode} from "firebase-functions/lib/providers/https";
import * as functions from "firebase-functions";

export function error(code: FunctionsErrorCode, message: string): never {
    throw new functions.https.HttpsError(code, message);
}
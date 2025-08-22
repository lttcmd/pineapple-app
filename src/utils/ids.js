import { nanoid } from "nanoid";

// Generate random digits only
function generateDigits(length) {
  const digits = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return result;
}

export const id = (len = 8) => generateDigits(len);

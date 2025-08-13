import { nanoid } from "nanoid";

// Generate random letters only
function generateLetters(length) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

export const id = (len = 8) => generateLetters(len);

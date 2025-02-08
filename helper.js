const crypto = require('crypto');

// Ensure 32-byte (256-bit) secret key
const secretKey = crypto.createHash('sha256').update("fb411c21b2c22136f2c0bbc52930b7b4").digest(); // 32 bytes

// Ensure 16-byte (128-bit) IV
const iv = Buffer.from("9bdf57c58487abea9bdf57c58487abea", 'hex').slice(0, 16); // 16 bytes

// console.log("Secret Key (Hex):", secretKey.toString('hex')); // Debugging
// console.log("IV (Hex):", iv.toString('hex')); // Debugging

const encrypt = (text) => {
    const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

const decrypt = (encryptedText) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

// Test it
// const testText = "Hello, World!";
// const encryptedText = encrypt(testText);
// console.log("Encrypted:", encryptedText);

// const decryptedText = decrypt(encryptedText);
// console.log("Decrypted:", decryptedText);

module.exports = {
    encrypt,
    decrypt
}
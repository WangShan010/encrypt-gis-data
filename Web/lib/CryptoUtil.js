class CryptoUtil {
    static Encrypt(dataStr, key) {
        return CryptoJS.AES.encrypt(dataStr, key).toString();
    }

    static Decrypt(ciphertext, key) {
        let bytes = CryptoJS.AES.decrypt(ciphertext, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    }
}

export default CryptoUtil;

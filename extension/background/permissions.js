import { DateTime } from "../libs/luxon/es6_luxon.min.js";
import CryptoJS from "../libs/CryptoJS_v3.1.2/rollups/aes.js";
import { getSettings, saveSettings } from "./storage.js";
//
const emailAuthorized = ["a06d0900bcb9da6856f5aad5dec6cea6"]

// Kiểm tra quyền sử dụng của người dùng
export const checkUserPermission = async () => {
    // ========= TEST
    // let userEmail = (await getSettings("local", "userEmail")).userEmail
    // console.log("Email: " + userEmail)
    // console.log("Once key: ", (await getSettings("local", "onceTimeKey")).onceTimeKey)
    // ========= TEST

    // Check email authorized
    let userEmail = (await chrome.identity.getProfileUserInfo()).email
    let hashedEmail = CryptoJS.MD5(userEmail).toString();
    if (emailAuthorized.find(x => x === hashedEmail)) {
        // console.log("=> Use Email Authorized")
        return true
    }
    // Check once time key
    let onceTimeKey = (await getSettings("local", "onceTimeKey")).onceTimeKey;
    if (onceTimeKey && onceTimeKey.key != "" && onceTimeKey.permission == true) {
        // console.log("=> Use Once Time Key")
        return true
    }
    // Default false
    return false

};


// Kiểm tra trạng thái, kiểm tra mỗi 1p
export const checkUserStatus = async () => {
    // console.log("           ======== CHECK ========      ")
    // Check in session
    let userStatus = (await getSettings("session", "userStatus")).userStatus
    let currentTime = DateTime.utc();
    // Nếu trước đó có quyền
    if (userStatus && userStatus.permission == true && userStatus.lastCheck != null) {
        // Kiểm tra lần check cuối, nếu > 15p thì check lại
        let lastCheckTime = DateTime.fromISO(userStatus.lastCheck).setZone("UTC");
        let timeSinceLastCheck = (currentTime.diff(lastCheckTime, "minutes")).toObject();
        // Nếu lastCheck > thì check lại
        if (timeSinceLastCheck.minutes >= 0) {
            // Update last check
            userStatus.lastCheck = currentTime.toISO();
            // Nếu OK
            if (await checkUserPermission()) { userStatus.permission = true; }
            // Check thất bại, set lại về false
            else { userStatus.permission = false; }
            // console.log("check khi quá thời gian: " + userStatus.permission)
        }
        // Ko cần check lại, lastCheck giữ nguyên
        else {
            // console.log("Ko cần check lại: " + timeSinceLastCheck.minutes + "p " + userStatus.permission)
            return userStatus.permission;
        }
    }
    else {
        // if (!userStatus) { console.log("check lần đầu") }
        userStatus = { permission: false, lastCheck: currentTime.toISO() }
        // OK
        if (await checkUserPermission()) { userStatus.permission = true; }
        else { userStatus.permission = false } // Nếu ko có quyền set false
        // console.log("check lần N: " + userStatus.permission)
    }
    // Save
    // console.log(userStatus)
    await saveSettings("session", "userStatus", userStatus)
    return userStatus.permission;

}


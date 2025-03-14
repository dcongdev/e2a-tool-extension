import { DateTime } from "../libs/luxon/es6_luxon.min.js";

// Init local, sync
export const initSettings = async () => {
    // Set default settings
    let defaultSettings = await (await fetch(chrome.runtime.getURL("data/default_settings.json"))).json()
    // let defaultSettings = await (await fetch(chrome.runtime.getURL("data/default_on_settings.json"))).json()
    // console.log(defaultSettings)

    // Set local settings
    let localSettings = defaultSettings.local;
    let sounds = await (await fetch(chrome.runtime.getURL("data/sound.json"))).json();
    localSettings.soundFiles = sounds
    //
    localSettings.onceTimeKey = { key: "", permission: false, description: "" }
    await chrome.storage.local.set(localSettings)
    // console.log(localSettings);

    // Set sync settings
    let syncSettings = defaultSettings.sync;
    let autoSubmitTime = await (await fetch(chrome.runtime.getURL("data/auto_submit_time.json"))).json();
    syncSettings.automation.autoSubmit.custom = autoSubmitTime
    await chrome.storage.sync.set(syncSettings)
    // console.log(syncSettings);

};
// Init sesseion
export const initSessionSettings = async () => {
    let syncSettings = await chrome.storage.sync.get(null);
    let sessionSettings = await chrome.storage.session.get(null);

    // Set user status
    if (!sessionSettings.userStatus) {
        sessionSettings.userStatus = { permission: false, lastCheck: null }
    }
    // Set timezone
    if (syncSettings.dateTime) {
        sessionSettings.timezone = syncSettings.dateTime.timezone;
    }
    else { sessionSettings.timezone = "default" }

    await chrome.storage.session.set(sessionSettings);

};

// Save setting
export const saveSettings = async (storage, key, value) => {
    let obj = {};
    obj[key] = value;
    await chrome.storage[storage].set(obj);
};

// Get all settings
export const getAllSettings = async () => {
    let localSettings = (await chrome.storage.local.get(null))
    let syncSettings = (await chrome.storage.sync.get(null))
    let sessionSettings = (await chrome.storage.session.get(null))
    //
    return { ...localSettings, ...syncSettings, ...sessionSettings }
};
// Get settings
export const getSettings = async (storage, key = null) => {
    return (await chrome.storage[storage].get(key));
};


// Get submit history from local storage and set to session storage
export const setSessionSubmitHistory = async () => {
    let submitHistory = (await chrome.storage.local.get(["submitHistory"])).submitHistory;
    let timeRange = DateTime.utc().minus({ days: 1 }).toISODate(); // 2 ngày gần nhất utc
    // Chỉ lấy ngày hiện tại theo múi giờ của extension, giảm bộ nhớ của session
    let syncSettings = await getSettings("sync", "dateTime")
    let timezone = syncSettings.dateTime.timezone // Timezone
    // Ngày hiện tại
    let currentDate = DateTime.utc().setZone(timezone).toISODate();
    // console.log("currentDate")
    // console.log(currentDate)
    let tempHistory = [];
    for (let i = 0; i < submitHistory.length; i++) {
        // Kiểm tra taskDate nếu = ngày hiện tại theo múi giờ
        let taskDate = DateTime.fromISO(submitHistory[i].datetime).setZone(timezone);
        if (taskDate.toISODate() >= currentDate) { // Nếu trong khoảng
            tempHistory.push(submitHistory[i])
        }
    }
    chrome.storage.session.set({ tempHistory });
    return true
}



export const getSubmitHistory = async () => {
    let submitHistory = (await chrome.storage.local.get(["submitHistory"])).submitHistory;
    return submitHistory;

}


export const getSubmitHistoryByDay = async (date, timezone) => {


    let tempHistory = (await getSettings("session", "tempHistory")).tempHistory;
    let submitHistory = []
    // Nếu temp undefine hoặc trống
    if (!tempHistory || tempHistory == []) {
        await setSessionSubmitHistory()
        tempHistory = (await getSettings("session", "tempHistory")).tempHistory;
    }
    for (let i = 0; i < tempHistory.length; i++) {
        // Covert to format: "2025-03-05"
        let taskDate = DateTime.fromISO(tempHistory[i].datetime).setZone(timezone).toISODate();
        // console.log(taskDate)
        if (taskDate == date) {
            submitHistory.push(tempHistory[i])
        }
    }
    return submitHistory;

}

// Add new task
export const addNewTask = async (taskName, time) => {
    // Get current
    let submitHistory = (await getSettings("local", "submitHistory")).submitHistory;
    let tempHistory = (await getSettings("session", "tempHistory")).tempHistory;
    // Get current time
    let currentTime = DateTime.utc().toISO();
    //
    let taskData = { datetime: currentTime, name: taskName, time: time }
    submitHistory.push(taskData)
    tempHistory.push(taskData)
    // console.log(taskData)
    // Save
    await saveSettings("local", "submitHistory", submitHistory)
    await saveSettings("session", "tempHistory", tempHistory)
}


// ================== TEST ============================
export const setSubmitHistory = async () => {
    let fileName = "backup-data_2025-03-14_00-29-59.json"
    let submitHistory = await (await fetch(chrome.runtime.getURL("backup-data/" + fileName))).json()
    // console.log(submitHistory)
    chrome.storage.local.set({ submitHistory });
}

// setSubmitHistory()
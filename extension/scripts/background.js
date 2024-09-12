/* Copyright (C) 2023 Duong Cong - All Rights Reserved
* Email: duongcong0412hc@gmail.com
*/

import { DateTime } from "../libs/luxon/es6_luxon.min.js";
import CryptoJS from "../libs/CryptoJS_v3.1.2/rollups/aes.js";
const extensionUrl = chrome.runtime.getURL("");

// ***************** FUNCTION *****************
// Set settings to session storage
const setSessionSettings = async () => {
    let syncSettings = await chrome.storage.sync.get(null);
    let sessionSettings = await chrome.storage.session.get(null);

    let userStatus = { status: "", lastChecked: null }
    // Set user status
    if (sessionSettings.userStatus != undefined) {
        userStatus = sessionSettings.userStatus;
    }

    // Set timezone
    let timezone = "";
    if (syncSettings.DateTime == undefined) {
        timezone = "default";
    }
    //
    else { timezone = syncSettings.DateTime.Timezone; }
    //
    if (timezone == "default") {
        timezone = DateTime.now().setZone(timezone).zoneName;
    }
    let initSessionSetts = {
        currTimezone: { Timezone: timezone, lastChecked: DateTime.utc().toISO() },
        userStatus: userStatus
    }

    await chrome.storage.session.set(initSessionSetts);

    // let sessionSettings = await chrome.storage.session.get(null);
    // console.log(sessionSettings)
}

// Check task submitted
const checkTask = async (syncSettings, sessionSettings) => {
    let timezone = syncSettings.DateTime.Timezone;
    //
    let userStatus = sessionSettings.userStatus;
    let currTimezone = sessionSettings.currTimezone;
    //
    if (userStatus.status != "ok") { return }
    //
    if (timezone == "default") {
        let tzName = DateTime.now().setZone(timezone).zoneName;
        let tzSession = currTimezone.Timezone;
        //
        if (tzSession != tzName) {
            // Set new time zone if difference
            sessionSettings.currTimezone.Timezone = tzName;
            sessionSettings.currTimezone.lastChecked = DateTime.utc().toISO();
            //
            setTasksSubmittedOnIcon();
        }
    }
    else if (currTimezone.Timezone != timezone) {
        // Set new time zone if difference
        sessionSettings.currTimezone.Timezone = timezone;
        sessionSettings.currTimezone.lastChecked = DateTime.utc().toISO();
        setTasksSubmittedOnIcon();
    }
    else {
        let lastChecked = sessionSettings.currTimezone.lastChecked;
        let currDate = DateTime.utc().setZone(timezone).toISODate();
        let lastCheckedDate = DateTime.fromISO(lastChecked).setZone(timezone).toISODate();
        if (lastCheckedDate != currDate) {
            sessionSettings.currTimezone.lastChecked = DateTime.utc().toISO();
            setTasksSubmittedOnIcon();
        }
    }
    await chrome.storage.session.set(sessionSettings);
};

// Check user permission
const checkUserPermission = async (next) => {
    // await chrome.storage.local.set({"key": {"key": "", "permission": ""}})
    let userKey = await chrome.storage.local.get(["key"]);
    if (userKey.key) {
        userKey = userKey.key
        if (userKey.permission == "true") {
            let dt = { status: "ok", email: "use one-time key", message: "You have permission to use extension." }
            return next(dt);
        }
    }

    await chrome.identity.getProfileUserInfo(async (userinfo) => {
        let userEmail = userinfo.email;
        // console.log(userEmail)
        let dt = { status: "", email: userEmail, message: "" }

        try {
            if (userEmail != "") {
                let hash = CryptoJS.MD5(userEmail).toString();
                // console.log(hash)

                if (true) {
                    dt.status = "ok";
                    dt.message = "You have permission to use extension.";
                    return next(dt);
                }
                else {
                    dt.status = "error";
                    dt.message = "error";
                    return next(dt);
                }
            }
            else {


                dt.status = "error";
                dt.message = "error";
                return next(dt);
            }
        }
        catch (error) {
            dt.status = "net error";
            dt.message = "net error";
            return next(dt);
        }
    });

}

// Check status
const checkUserSatus = async () => {
    await checkUserPermission(async (res) => {

        if (res.status == "net error") {
            let sessionSettings = await chrome.storage.session.get(null);
            res = sessionSettings.userStatus;
        }

        let errorPageUrl = chrome.runtime.getURL("/pages/error.html");
        //
        if (res.status == "error") {
            chrome.storage.session.set({
                userStatus: {
                    status: "error",
                    lastChecked: DateTime.utc().toISO()
                }
            });
            // Open error page
            let isOpenErrorPage = false
            let tabs = await chrome.tabs.query({});
            tabs.forEach((tab) => {
                if (tab.url.includes(errorPageUrl)) {
                    isOpenErrorPage = true;
                }
            });
            if (isOpenErrorPage == false) {
                // chrome.tabs.create({ url: errorPageUrl });
            }
            // Set badge
            chrome.action.setBadgeBackgroundColor({ color: "red" });
            chrome.action.setBadgeText({ text: "!" });
            return
        }
        else if (res.status == "ok" && res.message == "You have permission to use extension.") {
            // If status "ok"
            chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
            chrome.action.setBadgeText({ text: "" });
            chrome.storage.session.set({
                userStatus: {
                    status: "ok",
                    lastChecked: DateTime.utc().toISO()
                }
            });
            // Set badge
            await getSubHisToSessionStorage();
            setTasksSubmittedOnIcon();
            // Close error page
            let tabs = await chrome.tabs.query({});
            tabs.forEach((tab) => {
                if (tab.url.includes(errorPageUrl)) {
                    chrome.tabs.remove(tab.id);
                }
            });
        }
    });
}

// Check user
const checkUser = async (sessionSettings) => {
    let currTimezone = sessionSettings.currTimezone;
    let userStatus = sessionSettings.userStatus;
    // Init data
    if (userStatus == undefined) {
        userStatus = { userStatus: { status: "", lastChecked: null } }
    }
    // Compare time
    let lastChecked = userStatus.lastChecked;
    // If last checked = null
    if (lastChecked == null) { await checkUserSatus(); return; }
    let currTime = DateTime.utc();
    let lastCheckedTime = DateTime.fromISO(lastChecked).setZone("UTC");
    let diff = (currTime.diff(lastCheckedTime, "minutes")).toObject();
    // Check
    if (diff.minutes >= 60) { await checkUserSatus(); }
}

// Update user settings
const updateSettings = async () => {
    var newSets = {
        "Statistics": { "ShowTasksSubmittedOnIcon": "OFF" },
        "Notifications": { "TasksAvailable": "OFF", "TaskIsSubmitted": "OFF" },
        "Sounds": {
            "TaskIsSubmitted": "OFF",
            "TasksAvailable": {
                "status": "OFF",
                "loop": false,
                "SoundName": "default.mp3",
                "CustomSound": "OFF",
                "CustomSoundUrl": ""
            }
        },
        "Timing": {
            "TimeCounterClock": {
                "status": "OFF",
                "location": {
                    "pageTitle": "ON",
                    "taskTitle": "OFF",
                    "floating": "OFF",
                    "submitButton": "OFF"
                }
            }
        },
        "Automation": {
            "AutoReload": { "status": "OFF", "time": 300 },
            "AutoSubmit": {
                "status": "OFF",
                "startTime": 60,
                "endTime": 90,
                "customByTask": {
                    "status": "OFF",
                    "time": [
                        { "taskTitle": "sep", "startTime": 60, "endTime": 90 }
                    ]
                }
            }

        },
        "DateTime": { "Timezone": "default" }
    }
    //
    let currSets = await chrome.storage.sync.get([
        "Statistics",
        "Notifications",
        "Sounds",
        "Timing",
        "Automation",
        "DateTime"]);
    //
    // Statistics
    if (currSets.Statistics != undefined) {
        newSets.Statistics = currSets.Statistics;
    }
    // Notifications
    if (currSets.Notifications != undefined) {
        newSets.Notifications = currSets.Notifications;
    }
    // Sounds
    if (currSets.Sounds != undefined) {
        newSets.Sounds = currSets.Sounds;
    }
    // Timing
    if (currSets.Timing != undefined) {
        if (currSets.Timing.TimeCounterClock == "ON") {
            newSets.Timing.TimeCounterClock.status = currSets.Timing.TimeCounterClock;
        }
    }
    // Automation
    if (currSets.Automation != undefined) {
        if (currSets.Automation.AutoSubmit.customByTask == undefined) {
            currSets.Automation.AutoSubmit.customByTask = newSets.Automation.AutoSubmit.customByTask
        }
        newSets.Automation = currSets.Automation;
    }
    // DateTime
    if (currSets.DateTime != undefined) {
        newSets.DateTime = currSets.DateTime;
    }

    console.log(newSets)

    // await chrome.storage.sync.clear(() => { chrome.storage.sync.set(newSets); });

}

// Get submit history from local storage and set to session storage
const getSubHisToSessionStorage = async () => {
    let submitHistory = (await chrome.storage.local.get(["submitHistory"])).submitHistory;
    let subHis = [];

    // Get data
    if (submitHistory == null || submitHistory == []) {
        chrome.storage.session.set({ "subHis": [] });
    }
    let startDate = DateTime.utc().minus({ days: 3 }).toISODate();
    // console.log(startDate)
    for (let i = 0; i < submitHistory.length; i++) {
        let taskDate = DateTime.fromISO(submitHistory[i].datetime).toUTC();
        if (taskDate.toISODate() > startDate) {
            subHis.push(submitHistory[i])
        }
    }
    chrome.storage.session.set({ "subHis": subHis });
}

// Get submit history by day
const getDataByDay = async (date) => {
    let subHis = (await chrome.storage.session.get(["subHis"])).subHis;
    // let subHis = (await chrome.storage.local.get(["submitHistory"])).submitHistory;
    let timezone = (await chrome.storage.sync.get(["DateTime"])).DateTime.Timezone;
    let dataByDay = { date: date, totalTasks: 0, totalTime: 0 };
    //
    let totalTasks = 0;
    let totalTime = 0;
    // Get data
    if (subHis == null || subHis == []) { return dataByDay; }
    for (let i = 0; i < subHis.length; i++) {
        let taskDate = DateTime.fromISO(subHis[i].datetime).setZone(timezone);
        if (taskDate.toISODate() == date) {
            totalTasks += 1;
            totalTime += subHis[i].time;
        }
    }
    //
    dataByDay.totalTasks = totalTasks;
    dataByDay.totalTime = totalTime;
    // console.log(dataByDay)
    return dataByDay;
};

// Add submit to history
const newSubmit = async (taskType, time) => {
    let submitHistory = (await chrome.storage.local.get(["submitHistory"])).submitHistory;
    let subHis = (await chrome.storage.session.get(["subHis"])).subHis;
    let currTime = DateTime.utc().toISO();
    submitHistory.push({ datetime: currTime, taskType: taskType, time: time })
    //
    subHis.push({ datetime: currTime, taskType: taskType, time: time })
    //
    chrome.storage.local.set({ "submitHistory": submitHistory })
    chrome.storage.session.set({ "subHis": subHis })
}

// Set badge text
const setTasksSubmittedOnIcon = () => {
    chrome.storage.sync.get(["Statistics"], async (items) => {
        let ShowTasksSubmittedOnIcon = items.Statistics.ShowTasksSubmittedOnIcon;
        if (ShowTasksSubmittedOnIcon == "ON") {
            let timezone = (await chrome.storage.sync.get(["DateTime"])).DateTime.Timezone;
            let currDate = DateTime.utc().setZone(timezone).toISODate();
            let data = await getDataByDay(currDate);
            chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
            chrome.action.setBadgeText({ text: (data.totalTasks).toString() });
            return
        } else {
            chrome.action.setBadgeText({ text: "" });
        }

    })
}

/******** Call function ********/
setSessionSettings();
setInterval(async () => {
    let syncSettings = await chrome.storage.sync.get(null);
    let sessionSettings = await chrome.storage.session.get(null);
    //
    await checkUser(sessionSettings);
    await checkTask(syncSettings, sessionSettings);
}, 20000)


// ============ On install listener ============
chrome.runtime.onInstalled.addListener(async (reason) => {
    let exitsNotiSound = [];
    exitsNotiSound.push(["Default", "default.mp3"]);
    exitsNotiSound.push(["Bell ringing 1", "bell-ringing-1.mp3"]);
    exitsNotiSound.push(["Bell ringing 2", "bell-ringing-2.mp3"]);
    exitsNotiSound.push(["Iphone", "iphone.mp3"]);
    exitsNotiSound.push(["Iphone Notification", "iphone_notification.mp3"]);
    exitsNotiSound.push(["Old telephone ring", "old-telephone-ring.mp3"]);
    exitsNotiSound.push(["Phone off hook", "phone-off-hook.mp3"]);
    exitsNotiSound.push(["Telephone ring", "telephone-ring.mp3"]);
    // Install
    if (reason.reason == "install") {
        await chrome.storage.local.set({ "extensionStatus": "ON", "submitHistory": [], "soundExists": exitsNotiSound });
        await updateSettings();
        await checkUserSatus();
        //
    }
    // Update
    if (reason.reason == "update") {
        await updateSettings();
        await checkUserSatus();
    }
});

// On startup
chrome.runtime.onStartup.addListener(async () => {
    // Check status
    await checkUserSatus();
});

// ============ Message listener ============
chrome.runtime.onMessage.addListener((req, res, sendRes) => {

    /**************** CHECK USER STATUS **************/
    if (Object.getOwnPropertyNames(req) == "checkUserStatus") {
        checkUserPermission(async (data) => {
            if (data.status == "net error") {
                let sessionSettings = await chrome.storage.session.get(null);
                data = sessionSettings.userStatus;
            }
            sendRes(data);
        })
        return true;
    }

    // Set tasks submitted on icon
    if (Object.getOwnPropertyNames(req) == "setTaskSubmittedOnIcon") {
        setTasksSubmittedOnIcon();
        sendRes('OK')
        return true;
    }

    /*************** Receive message from EWOQ script ***************/
    // Submit
    if (Object.getOwnPropertyNames(req) == "submitted") {
        let taskData = req.submitted;
        newSubmit(taskData.taskType, taskData.time);
        sendRes(taskData);
        setTasksSubmittedOnIcon();
        return true;
    }

    // ===== GET ALL SETTINGS =====
    // GET ALL SETTINGS
    if (Object.getOwnPropertyNames(req) == "getAllSettings") {
        if (req.getAllSettings == true) {
            chrome.storage.local.get(["extensionStatus", "soundExists"],
                (localSettings) => {
                    chrome.storage.sync.get(null, (syncSettings) => {
                        chrome.storage.session.get(null, (sessionSettings) => {
                            let allSettings = { ...localSettings, ...syncSettings, ...sessionSettings };
                            // console.log(allSettings);
                            sendRes(allSettings);
                        });
                    });
                })
        }
        return true;
    }

    // 1. Get noti sound
    if (Object.getOwnPropertyNames(req) == "getNotiTasksAvailableSound") {
        chrome.storage.sync.get(["Sounds"], (items) => {
            let SoundName = items.Sounds.TasksAvailable.SoundName;
            let SoundURL = extensionUrl + "res/noti-audio/" + SoundName;
            if (items.Sounds.TasksAvailable.CustomSound == "ON") {
                SoundURL = items.Sounds.TasksAvailable.CustomSoundUrl;
            }
            sendRes({
                "SoundURL": SoundURL,
                "loop": items.Sounds.TasksAvailable.loop
            });
        })
        return true;
    }

    // 2. Get task is submitted noti sound
    if (Object.getOwnPropertyNames(req) == "getNotiTaskIsSubmittedSound") {
        chrome.storage.sync.get(["Sounds"], (items) => {
            let SoundName = "tick.mp3";
            let SoundURL = extensionUrl + "res/noti-audio/" + SoundName;
            // console.log(SoundURL)
            let data = {
                "status": items.Sounds.TaskIsSubmitted,
                "SoundURL": SoundURL
            }
            sendRes(data);
        })
        return true
    }

    // 3. Create noti tasks available
    if (Object.getOwnPropertyNames(req) == "createNotiTasksAvailable") {
        chrome.storage.sync.get(["Notifications"], (items) => {
            if (items.Notifications.TasksAvailable == "ON") {
                chrome.identity.getProfileUserInfo((userinfo) => {
                    let userEmail = userinfo.email;
                    chrome.notifications.create({
                        title: "Task available!",
                        message: "Account: " + userEmail,
                        iconUrl: "/assets/icons/org/icon-black-round.png",
                        type: "basic"
                    })
                });
            }
        })
        return true;
    }

    // 4. Create noti task is submitted
    if (Object.getOwnPropertyNames(req) == "createNotiTaskIsSubmitted") {
        chrome.storage.sync.get(["Notifications"], (items) => {
            if (items.Notifications.TaskIsSubmitted == "ON") {
                chrome.identity.getProfileUserInfo((userinfo) => {
                    let userEmail = userinfo.email;
                    chrome.notifications.create({
                        title: "Task is submitted!",
                        message: "Account: " + userEmail,
                        iconUrl: "/assets/icons/org/icon-black-round.png",
                        type: "basic"
                    })
                });

            }
        })
        return true;
    }

});

// ============ Context menu ================
// Create
chrome.contextMenus.removeAll(() => {
    // 1
    chrome.contextMenus.create({
        id: "1",
        title: "Statistics",
        contexts: ["action"],
    });

    // 2
    chrome.contextMenus.create({
        id: "2",
        title: "Develop by: duongcongit",
        contexts: ["action"],
    });

});

// Context menu click event
chrome.contextMenus.onClicked.addListener((id, tab) => {
    // 1. Open Statistics page
    if (id.menuItemId == 1) {
        let statisticsPageUrl = chrome.runtime.getURL("/pages/statistics.html");
        chrome.tabs.create({ url: statisticsPageUrl });
    }
});

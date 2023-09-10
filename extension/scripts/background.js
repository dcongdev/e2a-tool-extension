/* Copyright (C) 2023 Duong Cong - All Rights Reserved
* Email: duongcong0412hc@gmail.com
*/

import { DateTime } from "../libs/luxon/es6_luxon.min.js";
const extensionUrl = chrome.runtime.getURL("");

//  ========= TEST ==========
const reloadTestPage = async () => {
    let url = "http://127.0.0.1:5500/test.html";
    var tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
        if (tab.url.includes(url)) {
            // console.log(tab.id);
            var code = 'window.location.reload();';
            chrome.tabs.reload(tab.id);
            // chrome.tabs.remove(tab.id, () => { });
        }
    });
}
reloadTestPage();

const openTestPage = () => {
    let statisticsPageUrl = chrome.runtime.getURL("/pages/statistics.html");
    let popupPageUrl = chrome.runtime.getURL("/pages/popup.html");
    let errorPageUrl = chrome.runtime.getURL("/pages/error.html");
    // chrome.tabs.create({ url: statisticsPageUrl });
    // chrome.tabs.create({ url: popupPageUrl });
    // chrome.tabs.create({ url: errorPageUrl });
}
openTestPage();

const setTestSubHis = async () => {
    var response = await fetch("../testdata/testNew.json");
    let testHis = await response.json();
    console.log(testHis)
    chrome.storage.local.set({
        "submitHistory": testHis
    })
};
// setTestSubHis()


// ***************** FUNCTION *****************
// Format time to string
const formatTime = (time) => {
    let timeToDatetime = new Date(time);
    let formatedTime =
        timeToDatetime.getDate() +
        "/" +
        (timeToDatetime.getMonth() + 1) +
        "/" +
        timeToDatetime.getFullYear() +
        ", " +
        timeToDatetime.getHours() +
        ":" +
        timeToDatetime.getMinutes() +
        ":" +
        timeToDatetime.getSeconds();

    return formatedTime;
}

// == Check user permission
const checkUserPermission = async (next) => {
    await chrome.identity.getProfileUserInfo(async (userinfo) => {
        let userEmail = userinfo.email;
        // console.log(userEmail)
        let dt = { status: "", email: userEmail, message: "" }

        try {
            if (userEmail != "") {
                let response = await fetch("https://extension-api.e2atool.com/get-user-permission/" + userEmail);
                let data = await response.json();
                // console.log(response.status);
                // console.log(data);

                if (response.status == 200) {
                    if (data.status == "ok") {
                        // console.log(data.message);
                        // setCurrSubmittedInIcon();
                        dt.status = "ok";
                        dt.message = data.message;
                        // return dt;
                        return next(dt);
                    }
                }
                else if (data.status == "error" || response.status == 403) {

                    dt.status = "error";
                    dt.message = "error";
                    // return dt;
                    return next(dt);

                    // if (data.message == "Your account has been deleted.") { }
                    // else if (data.message == "Your account has been locked.") { }
                    // else if (data.message == "License expired.") { }
                    // else if (data.message == "Email has been deleted.") { }
                    // else if (data.message == "Email has been locked.") { }
                }
            }
            else {
                dt.status = "error";
                dt.message = "error";
                // return dt;
                return next(dt);
            }
        }
        catch (error) {
            dt.status = "error";
            dt.message = "error";
            // return dt;
            return next(dt);
        }
    });

}
// Check status
const checkUserSatus = async () => {
    await checkUserPermission(async (res) => {
        if (res.status != "ok" && res.message != "You have permission to use extension.") {
            chrome.storage.session.set({
                "userStatus": {
                    status: "error",
                    lastChecked: DateTime.utc().toISO()
                }
            });
            //
            let errorPageUrl = chrome.runtime.getURL("/pages/error.html");
            chrome.tabs.create({ url: errorPageUrl });
            chrome.action.setBadgeBackgroundColor({ color: "red" });
            chrome.action.setBadgeText({ text: "!" });
            return
        }
        chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
        chrome.action.setBadgeText({ text: "" });
        chrome.storage.session.set({
            "userStatus": {
                status: "ok",
                lastChecked: DateTime.utc().toISO()
            }
        });
        await getSubHisToSessionStorage();
        setTasksSubmittedOnIcon();
    });
}
// Update user settings
const updateSettings = async () => {
    var newSets = {
        "Statistics": {
            "ShowTasksSubmittedOnIcon": "OFF"
        },
        "Notifications": {
            "TasksAvailable": "OFF",
            "TaskIsSubmitted": "OFF"
        },
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
            "CountTimeClock": "OFF"
        },
        "Automation": {
            "AutoReload": {
                "status": "OFF",
                "time": 300
            },
            "AutoSubmit": {
                "status": "OFF",
                "time": 90
            }

        },
        "DateTime": {
            "Timezone": "default"
        }
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
    let oldVerSets = await chrome.storage.sync.get([
        "showTaskSubmittedInIcon",
        "countTimeInTask",
        "autoReload",
        "autoSubmit",
        "taskAvailNoti"]);
    //
    // Statistics
    if (currSets.Statistics != undefined) {
        newSets.Statistics = currSets.Statistics;
    }
    else if (oldVerSets.showTaskSubmittedInIcon != undefined) {
        let status = oldVerSets.showTaskSubmittedInIcon;
        newSets.Statistics.ShowTasksSubmittedOnIcon = status;
    }
    // Notifications
    if (currSets.Notifications != undefined) {
        newSets.Notifications = currSets.Notifications;
    }
    else {
        if (oldVerSets.taskAvailNoti != undefined) {
            let status = oldVerSets.taskAvailNoti.status;
            newSets.Notifications.TasksAvailable = status;
        }
    }
    // Sounds
    if (currSets.Sounds != undefined) {
        newSets.Sounds = currSets.Sounds;
    }
    else {
        // Tasks available
        if (oldVerSets.taskAvailNoti != undefined) {
            let status = oldVerSets.taskAvailNoti.notiSound.status;
            let loop = oldVerSets.taskAvailNoti.notiSound.loop;
            let SoundName = oldVerSets.taskAvailNoti.notiSound.soundName;
            let CustomSound = oldVerSets.taskAvailNoti.notiSound.soundCustom;
            let CustomSoundUrl = oldVerSets.taskAvailNoti.notiSound.soundCustomURL;

            // Set new
            newSets.Sounds.TasksAvailable.status = status;
            newSets.Sounds.TasksAvailable.loop = loop;
            newSets.Sounds.TasksAvailable.SoundName = SoundName;
            newSets.Sounds.TasksAvailable.CustomSound = CustomSound;
            newSets.Sounds.TasksAvailable.CustomSoundUrl = CustomSoundUrl;
        }
    }
    // Timing
    if (currSets.Timing != undefined) {
        newSets.Timing = currSets.Timing;
    }
    else {
        if (oldVerSets.countTimeInTask != undefined) {
            let status = oldVerSets.countTimeInTask;
            newSets.Timing.CountTimeClock = status;
        }
    }
    // Automation
    if (currSets.Automation != undefined) {
        newSets.Automation = currSets.Automation;
    }
    else {
        if (oldVerSets.autoReload != undefined) {
            let status = oldVerSets.autoReload.status;
            let time = oldVerSets.autoReload.time;
            // Set new
            newSets.Automation.AutoReload.status = status;
            newSets.Automation.AutoReload.time = time;
        }
        // Auto submit
        if (oldVerSets.autoSubmit != undefined) {
            let status = oldVerSets.autoSubmit.status;
            let time = oldVerSets.autoSubmit.time;
            // Set new
            newSets.Automation.AutoSubmit.status = status;
            newSets.Automation.AutoSubmit.time = time;
        }
    }
    // DateTime
    if (currSets.DateTime != undefined) {
        newSets.DateTime = currSets.DateTime;
    }

    // console.log(newSets)

    chrome.storage.sync.clear(() => { chrome.storage.sync.set(newSets); });

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
        checkUserStatus((data) => {
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
        let SoundName = "tick.mp3";
        let SoundURL = extensionUrl + "res/noti-audio/" + SoundName;
        // console.log(SoundURL)
        sendRes({ "SoundURL": SoundURL });
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


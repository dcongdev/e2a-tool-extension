/* Copyright (C) 2023 Duong Cong - All Rights Reserved
* Email: duongcong0412hc@gmail.com
*/

import { DateTime } from "../libs/luxon/es6_luxon.min.js";


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

const openStaPage = () => {
    let statisticsPageUrl = chrome.runtime.getURL("/pages/statistics.html");
    chrome.tabs.create({ url: statisticsPageUrl });
}
// openStaPage()

const newSubmit = async (taskType, time) => {
    let sumbitHistory = (await chrome.storage.local.get(["sumbitHistory"])).sumbitHistory;
    let currTime = DateTime.utc().setZone("America/Los_Angeles");
    let currDate = currTime.toISODate();
    // console.log(currTime.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS))
    // Get current date index, create new if not found
    let currDateIdx = sumbitHistory.findIndex(obj => obj.date == currDate);
    if (currDateIdx == -1) {
        sumbitHistory.push({ date: currDate, data: [] })
        currDateIdx = sumbitHistory.length - 1;
    }
    // Get task type index, create new if not found
    let taskTypeIdx = sumbitHistory[currDateIdx].data.findIndex(obj => obj.taskType == taskType);
    if (taskTypeIdx == -1) {
        sumbitHistory[currDateIdx].data.push({ taskType: taskType, tasks: 0, time: 0 })
        taskTypeIdx = sumbitHistory[currDateIdx].data.length - 1;
    }
    // Increase tasks and time
    sumbitHistory[currDateIdx].data[taskTypeIdx].tasks += 1;
    sumbitHistory[currDateIdx].data[taskTypeIdx].time += time;
    //
    chrome.storage.local.set({ "sumbitHistory": sumbitHistory })
}
// newSubmit("SIgergU", 30)

// chrome.storage.local.set({
//     "sumbitHistory": []
// })

// chrome.storage.local.get(["extensionStatus"], (items) => {
//     console.log(items.extensionStatus)
// })

const extensionUrl = chrome.runtime.getURL("");
// ============ FUNCTION ============
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

const resetCounter = () => {
    chrome.storage.local.get([
        "currentSubmitted",
        "showTaskSubmittedInIcon"
    ], (items) => {
        let currentSubmitted = items.currentSubmitted;
        let showTaskSubmittedInIcon = items.showTaskSubmittedInIcon;
        if (!showTaskSubmittedInIcon == "OFF") {
            chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
            chrome.action.setBadgeText({ text: "" });
            return
        }
        chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
        chrome.action.setBadgeText({ text: currentSubmitted.toString() });
    })
}

// Set badge text
const setCurrSubmittedInIcon = () => {
    chrome.storage.sync.get([
        "showTaskSubmittedInIcon"
    ], (items) => {
        let showTaskSubmittedInIcon = items.showTaskSubmittedInIcon;
        if (showTaskSubmittedInIcon == "ON") {
            chrome.storage.local.get(["currentSubmitted"], (curr) => {
                let currentSubmitted = curr.currentSubmitted;
                chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
                chrome.action.setBadgeText({ text: currentSubmitted.toString() });
            })

            return
        } else {
            chrome.action.setBadgeText({ text: "" });
        }

    })
}

const checkUserStatus = async () => {
    chrome.identity.getProfileUserInfo(async (userinfo) => {
        let userEmail = userinfo.email;
        // console.log(userEmail)
        try {
            if (userEmail != "") {
                let response = await fetch("http://localhost:8080/get-user-permission/" + userEmail);
                let data = await response.json();
                console.log(response.status);
                if (response.status == 200) {
                    if (data.status == "ok") {
                        console.log(data.message);
                        // setCurrSubmittedInIcon();
                        return;
                    }
                }
                else if (data.status == "error" || response.status == 403) {
                    console.log(data.message + "NOO");
                    if (data.message == "Your account has been deleted.") {
                        // chrome.management.uninstallSelf();
                    }
                    else if (data.message == "Your account has been locked.") {

                    }
                    else if (data.message == "License expired.") {

                    }
                    else if (data.message == "Email has been deleted.") {

                    }
                    else if (data.message == "Email has been locked.") {

                    }
                }
            }
            else {
                console.log("No permission to use!");
                // chrome.management.uninstallSelf();
            }

        }
        catch (error) {
            return false;
        }
    });
}

// Update settings
const updateSettings = async () => {
    await chrome.storage.sync.get([
        "showTaskSubmittedInIcon",
        "countTimeInTask",
        "autoReload",
        "autoSubmit",
        "taskAvailNoti"],
        async (items) => {
            let defaultTaskAvailNotiSettings = { // Task available notification mode
                "status": "OFF",
                "systemNoti": { "status": "OFF", "title": "Attention", "content": "Task available!", },
                "notiSound": {
                    "status": "OFF",
                    "loop": false,
                    "soundName": "vintage-telephone-ringtone.mp3",
                    "soundCustom": "OFF",
                    "soundCustomURL": "",
                }
            }
            //
            let newSettings = {
                "showTaskSubmittedInIcon": items.showTaskSubmittedInIcon != undefined ? items.showTaskSubmittedInIcon : "OFF",
                "countTimeInTask": items.countTimeInTask != undefined ? items.countTimeInTask : "OFF",
                "autoReload": items.autoReload != undefined ? items.autoReload : { "status": "OFF", "time": 900 },
                "autoSubmit": items.autoSubmit != undefined ? items.autoSubmit : { "status": "OFF", "time": 60 },
                "taskAvailNoti": items.taskAvailNoti != undefined ? items.taskAvailNoti : defaultTaskAvailNotiSettings,
            }
            //
            await chrome.storage.sync.set(newSettings);
        })
    // Local
    chrome.storage.local.get(["extensionStatus",], (items) => {
        if (items.extensionStatus == undefined) {
            chrome.storage.local.set({ "extensionStatus": "OFF" });
        }
    })
}

// setCurrSubmittedInIcon();

const getDataByDay = async (d) => {
    let rawData = (await chrome.storage.local.get(["sumbitHistory"])).sumbitHistory;
    let dataByDay = {date: d,totalTasks: 0,totalTime: 0,dataByTaskType: []}
    let totalTasks = 0;
    let totalTime = 0;
    let idx = rawData.findIndex(e => e.date == d);
    if (idx == -1) { return dataByDay; }
    //
    for (let i = 0; i < rawData[idx].data.length; i++) {
        totalTasks += rawData[idx].data[i].tasks;
        totalTime += rawData[idx].data[i].time;
    }
    dataByDay.totalTasks = totalTasks;
    dataByDay.totalTime = totalTime;
    dataByDay.dataByTaskType = rawData[idx].data;
    return dataByDay;
}

// getDataByDay("2023-09-03")

/* 
- Check if the user's email address is on the list of authorized users to install and use this extension 
- If the user does not have permission, this extension will automatically uninstall itself.
*/

// ============ On install listener ============
chrome.runtime.onInstalled.addListener(async (reason) => {

    let exitsNotiSound = [];
    exitsNotiSound.push(["Bell ringing 1", "bell-ringing-1.mp3"]);
    exitsNotiSound.push(["Bell ringing 2", "bell-ringing-2.mp3"]);
    exitsNotiSound.push(["Iphone", "iphone.mp3"]);
    exitsNotiSound.push(["Iphone Notification", "iphone_notification.mp3"]);
    exitsNotiSound.push(["Old telephone ring", "old-telephone-ring.mp3"]);
    exitsNotiSound.push(["Phone off hook", "phone-off-hook.mp3"]);
    exitsNotiSound.push(["Telephone ring", "telephone-ring.mp3"]);
    exitsNotiSound.push(["Vintage telephone ringtone", "vintage-telephone-ringtone.mp3"]);
    // Install
    if (reason.reason == "install") {
        // await checkUserStatus();
        chrome.storage.local.set({ "extensionStatus": "OFF", "sumbitHistory": [], "soundExists": exitsNotiSound });
        await updateSettings();
    }
    // Update
    if (reason.reason == "update") {
        // await checkUserStatus();
        await updateSettings();
        // setCurrSubmittedInIcon();
    }
});

// ============ Context menu ============
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

// === Context menu click event
chrome.contextMenus.onClicked.addListener((id, tab) => {
    // 1. Open Statistics page
    if (id.menuItemId == 1) {
        let statisticsPageUrl = chrome.runtime.getURL("/pages/statistics.html");
        chrome.tabs.create({ url: statisticsPageUrl });
    }
});

// ============ Message listener ============
chrome.runtime.onMessage.addListener((req, res, sendRes) => {

    /*************** Receive message from EWOQ script ***************/
    // Submit
    if (Object.getOwnPropertyNames(req) == "submitted") {
        let taskData = req.submitted;
        newSubmit(taskData.taskType, taskData.time);
        sendRes(taskData);
        return true;
    }

    // ===== GET ALL SETTINGS =====
    // GET ALL SETTINGS
    if (Object.getOwnPropertyNames(req) == "getAllSettings") {
        if (req.getAllSettings == true) {
            chrome.storage.local.get([
                "extensionStatus",
                "currentSubmitted",
                "soundExists"
            ], (localSettings) => {
                chrome.storage.sync.get([
                    "autoCount",
                    "countTimeInTask",
                    "autoReload",
                    "taskAvailNoti"
                ], (syncSettings) => {
                    let allSettings = { ...localSettings, ...syncSettings };
                    // console.log(allSettings)
                    sendRes(allSettings);
                })
            })
        }
        return true;
    }

    // 2. Get noti sound
    if (Object.getOwnPropertyNames(req) == "getNotiSound") {
        if (req.getNotiSound == null) {
            chrome.storage.sync.get(["taskAvailNoti"], (items) => {
                let soundName = items.taskAvailNoti.notiSound.soundName;
                sendRes({
                    "soundURL": extensionUrl + "res/noti-audio/" + soundName,
                    "loop": items.taskAvailNoti.notiSound.loop
                });
            })
        }
        else {
            let soundName = req.getNotiSound;
            sendRes(extensionUrl + "res/noti-audio/" + soundName);

        }
        return true;
    }

    // 3. Create system task noti
    if (Object.getOwnPropertyNames(req) == "createSystemNotiTask") {
        if (req.createSystemNotiTask == true) {
            chrome.storage.sync.get(["taskAvailNoti"], (items) => {
                chrome.notifications.create({
                    title: items.taskAvailNoti.systemNoti.title,
                    message: items.taskAvailNoti.systemNoti.content,
                    iconUrl: "/assets/icons/org/icon-black-round.png",
                    type: "basic"
                })
            })
        }
        return true;

    }

});



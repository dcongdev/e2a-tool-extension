/* Copyright (C) 2023 Duong Cong - All Rights Reserved
* Email: duongcong0412hc@gmail.com
*/

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
                let response = await fetch("https://e2atool.com/api/extension/get-user-permission/" + userEmail);
                let data = await response.json();
                console.log(data.message);
                if (data.status == "OK") {
                    console.log(data.message);
                    setCurrSubmittedInIcon();
                    return;
                }
                if (data.status == "NOTFOUND") {
                    console.log(data.message);
                    chrome.management.uninstallSelf();
                }
                else if (data.status == "FORBIDDEN") {
                    console.log(data.message);
                    chrome.management.uninstallSelf();
                }
                else {
                    console.log(data.message);
                    chrome.management.uninstallSelf();
                }
            }
            else {
                console.log("No permission to use!");
                chrome.management.uninstallSelf();
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
        "autoCount",
        "showTaskSubmittedInIcon",
        "countTimeInTask",
        "autoReload",
        "taskAvailNoti"
    ], async (items) => {
        //
        let defaultTaskAvailNotiSettings = { // Task available notification mode
            "status": "OFF",
            "systemNoti": {
                "status": "OFF",
                "title": "Attention",
                "content": "Task available!",
            },
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
            "autoCount": items.autoCount != undefined ? items.autoCount : "OFF",
            "showTaskSubmittedInIcon": items.showTaskSubmittedInIcon != undefined ? items.showTaskSubmittedInIcon : "OFF",
            "countTimeInTask": items.countTimeInTask != undefined ? items.countTimeInTask : "OFF",
            "autoReload": items.autoReload != undefined ? items.autoReload : { "status": "OFF", "time": 900 },
            "taskAvailNoti": items.taskAvailNoti != undefined ? items.taskAvailNoti : defaultTaskAvailNotiSettings,
        }

        //
        await chrome.storage.sync.set(newSettings);
    })
}

setCurrSubmittedInIcon();

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
        await checkUserStatus();
        chrome.storage.local.set({
            "currentSubmitted": 0,
            "sumbitHistory": [],
            "soundExists": exitsNotiSound,
        })
        await updateSettings();
    }
    // Update
    if (reason.reason == "update") {
        // await checkUserStatus();
        await updateSettings();
        setCurrSubmittedInIcon();
    }
});

// ============ Context menu ============
chrome.contextMenus.removeAll(() => {
    // 1
    chrome.contextMenus.create({
        id: "1",
        title: "Develop by: duongcongit",
        contexts: ["action"],
    });

});

// ============ Message listener ============
chrome.runtime.onMessage.addListener((req, res, sendRes) => {

    /*************** Receive message from EWOQ script ***************/
    // Submit
    if (Object.getOwnPropertyNames(req) == "submitted") {
        if (req.submitted == true) {
            chrome.storage.local.get(["currentSubmitted"], (items) => {
                let newCurrentSubmitted = parseInt(items.currentSubmitted) + 1;
                chrome.storage.local.set({ currentSubmitted: newCurrentSubmitted });
                setCurrSubmittedInIcon();
                sendRes(newCurrentSubmitted);
            })
        }
        return true;
    }

    // ===== GET ALL SETTINGS =====
    // GET ALL SETTINGS
    if (Object.getOwnPropertyNames(req) == "getAllSettings") {
        if (req.getAllSettings == true) {
            chrome.storage.local.get([
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

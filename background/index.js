import { DateTime } from "../libs/luxon/es6_luxon.min.js";
import CryptoJS from "../libs/CryptoJS_v3.1.2/rollups/aes.js";
const extensionUrl = chrome.runtime.getURL("");
//
import { initSettings, initSessionSettings, getAllSettings, getSettings, addNewTask, setSubmitHistory, saveSettings } from "./storage.js";
import { checkUserAndTask, setTasksSubmittedOnIcon, sendNotification } from "./ui.js";

// Check every 30s
// setInterval(async () => { await checkUserAndTask() }, 30000)
// checkUserAndTask()


// On installed
chrome.runtime.onInstalled.addListener(async (reason) => {
    if (reason.reason == "install") {
        console.log("installed")
        await initSettings()
        await checkUserAndTask()
    }
    if (reason.reason == "update") {
        console.log("updated")
        await checkUserAndTask()
        // initSettings()
    }
})

// On startup
chrome.runtime.onStartup.addListener(async () => {
    // Init session settings
    await initSessionSettings()
    await checkUserAndTask()
});


// ======================== Context menu ============================
// Create
chrome.contextMenus.removeAll(() => {
    // 1
    chrome.contextMenus.create({ id: "1", title: "Statistics", contexts: ["action"] });
    // 2
    chrome.contextMenus.create({ id: "2", title: "Develop by: duongcongit", contexts: ["action"] });
});

// Context menu click event
chrome.contextMenus.onClicked.addListener((id, tab) => {
    // 1. Open Statistics page
    if (id.menuItemId == 1) {
        let statisticsPageUrl = chrome.runtime.getURL("/pages/statistics.html");
        chrome.tabs.create({ url: statisticsPageUrl });
    }
});



// ======================== Message listener ========================
chrome.runtime.onMessage.addListener((req, res, sendResponse) => {

    /*************** Receive message from EWOQ script ***************/
    if (req.action == "getSettings") {
        getSettings(req.storage, req.key).then((response) => {
            sendResponse(response)
        })
        return true;
    }
    // Check status
    if (req.action == "checkUserStatus") {
        checkUserAndTask().then((response) => {
            sendResponse(response)
        })
        return true;
    }
    // Submit
    if (req.action == "submit") {
        getSettings("sync", "statistics").then((settings) => {
            if (settings.statistics.record == "ON") {
                addNewTask(req.data.name, req.data.time).then(() => {
                    setTasksSubmittedOnIcon();
                })
            }
        })
        sendResponse(true)
        return true
    }

    // Send notification
    if (req.action == "send notification") {
        sendNotification(req.title, req.message)
        sendResponse(true)
        return true
    }

});




/* ==================================================== TEST ==================================================== */
const createMenu = () => {
    // ====== TEST =======
    // 3 set email True
    chrome.contextMenus.create({ id: "3", title: "Reload", contexts: ["action"] });

    // 4 set set email False
    // chrome.contextMenus.create({ id: "4", title: "Set email False", contexts: ["action"] });

    // 5 set once time key True
    chrome.contextMenus.create({ id: "5", title: "Set key True", contexts: ["action"] });

    // 6 set once time key False
    chrome.contextMenus.create({ id: "6", title: "Set key False", contexts: ["action"] });

    // 7 change settings
    chrome.contextMenus.create({ id: "7", title: "Change settings", contexts: ["action"] });


    // ================================ Context menu click event
    chrome.contextMenus.onClicked.addListener((id, tab) => {
        // ====== TEST ======= permission.js 
        // 3. Reload / set email true
        if (id.menuItemId == 3) {
            // saveSettings("local", "userEmail", "mmohc0412@gmail.com")
            // console.log("Set email true")
            chrome.runtime.reload()
            console.log("Set Submit History")
        }
        // 4. set email false
        if (id.menuItemId == 4) {
            saveSettings("local", "userEmail", "sdvsf@ok.com")
            console.log("Set email false")
        }

        // 5. set once time key True
        if (id.menuItemId == 5) {
            saveSettings("local", "onceTimeKey", { key: "abc", permission: true })
            console.log("Set key true")
        }

        // 6. set once time key False
        if (id.menuItemId == 6) {
            saveSettings("local", "onceTimeKey", { key: "", permission: false })
            console.log("Set key false")
        }

        // 6. set once time key False
        if (id.menuItemId == 7) {

            let currentTime = DateTime.now().toISO()
            // saveSettings("local", "notifications", curr)
            // saveSettings("sync", "test", curr)
            console.log(currentTime)
        }
    });

}

setTimeout(() => { createMenu() }, 500);


const openTestPage = () => {
    let statisticsPageUrl = chrome.runtime.getURL("/pages/statistics.html");
    let popupPageUrl = chrome.runtime.getURL("/pages/popup.html");
    let errorPageUrl = chrome.runtime.getURL("/pages/error.html");
    chrome.tabs.create({ url: statisticsPageUrl });
    // chrome.tabs.create({ url: popupPageUrl });
    // chrome.tabs.create({ url: errorPageUrl });
}


const messageReload = () => {
    // === Reload test ===
    chrome.runtime.onMessage.addListener((req, res, sendRes) => {
        if (Object.getOwnPropertyNames(req) == "reload") {
            chrome.runtime.reload();
            sendRes(true)
            return true;
        }
    })
}

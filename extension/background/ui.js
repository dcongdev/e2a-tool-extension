import { DateTime } from "../libs/luxon/es6_luxon.min.js";
import { getSettings, getSubmitHistoryByDay } from "./storage.js";
import { checkUserStatus } from "./permissions.js";

//
export const sendNotification = (title, message) => {
    chrome.notifications.create({
        title: title,
        message: message,
        iconUrl: "/assets/images/icons/org/icon-black-round.png",
        type: "basic"
    })
}

// Set badge text
export const setTasksSubmittedOnIcon = async () => {
    let syncSettings = await getSettings("sync")
    if (syncSettings.statistics.showTasksSubmittedOnIcon == "OFF") {
        chrome.action.setBadgeText({ text: "" });
        return;
    }
    let timezone = syncSettings.dateTime.timezone // Timezone
    let currentDate = DateTime.utc().setZone(timezone).toISODate(); // Current day
    let submitHistory = await getSubmitHistoryByDay(currentDate, timezone)
    // Set badge
    chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
    chrome.action.setBadgeText({ text: (submitHistory.length).toString() });

    // console.log("checked")
}

//
const openCloseErrorPage = async (status) => {
    if (!status) {
        // Set badge
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "red" });
        // Error tab
        // return
        let errorPageUrl = chrome.runtime.getURL("/pages/error.html");
        let tabs = await chrome.tabs.query({});
        let isOpenErrorPage = false;
        // Kiểm tra có tab error không
        tabs.forEach((tab) => {
            if (tab.url.includes(errorPageUrl)) { isOpenErrorPage = true }
        });
        // Nếu chưa có tab nào thì mở tab mới
        // if (!isOpenErrorPage) { chrome.tabs.create({ url: errorPageUrl }); }
    }
}

export const checkUserAndTask = async () => {
    let status = (await checkUserStatus())
    if (status) { await setTasksSubmittedOnIcon(); }
    openCloseErrorPage(status)
    return status
}




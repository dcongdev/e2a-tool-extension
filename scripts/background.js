// ============ FUNCTION ============


/* 
- Check if the user's email address is on the list of authorized users to install and use this extension 
- If the user does not have permission, this extension will automatically uninstall itself.
*/
chrome.identity.getProfileUserInfo(async (userinfo) => {
    let userEmail = userinfo.email;
    // console.log(userEmail)
    let emailsHasPer = [ // Email for testing
        "duongcongbg0412@gmail.com",
        "duongcong0412hc@gmail.com",
    ];
    try {
        /*
        let data = {
            userEmail: userEmail
        }
        let response = await fetch("" + userEmail);
        let result = await response.json();
        
        if(result.result == "Fail"){
            console.log("No permission to use!");
            // chrome.management.uninstallSelf();
        }
        */

        if (userEmail != "") {
            let isPermission = emailsHasPer.find((email) => email == userEmail);
            if (!isPermission) {
                // console.log("No permission to use!");
                // chrome.management.uninstallSelf();
            }
        }
        else {
            // console.log("No permission to use!");
            // chrome.management.uninstallSelf();
        }

    }
    catch (error) {
        return false;
    }
});

// ============ On install listener ============
chrome.runtime.onInstalled.addListener((reason) => {
    // Install
    if (reason.reason == "install") {
        chrome.storage.local.set({
            "currentSubmited": 0,
        })
    }

    // Update
    if (reason.reason == "update") {

    }
});

// ============ Context menu ============
// === Context menu create
chrome.contextMenus.removeAll(() => {

    // 1
    chrome.contextMenus.create({
        id: "1",
        title: "Reset counter",
        contexts: ["all"],
    });

    // 2
    chrome.contextMenus.create({
        id: "2",
        title: "Develop by: duongcongit",
        contexts: ["all"],
    });

});

// === Context menu click event
chrome.contextMenus.onClicked.addListener((id, tab) => {
    // 1. Reset counter
    if (id.menuItemId == 1) {
        chrome.storage.local.set({ currentSubmited: "0" });
        chrome.action.setBadgeText({ text: "29" });
    }
});


// ============ Message listener ============
chrome.runtime.onMessage.addListener((req, res, sendRes) => {

    /*************** Receive message from EWOQ script ***************/
    if (Object.getOwnPropertyNames(req) == "submited") {
        if (req.submited == true) {
            chrome.storage.local.get(["currentSubmited"], (items) => {
                let newCurrentSubmited = parseInt(items.currentSubmited) + 1;
                chrome.storage.local.set({ currentSubmited: newCurrentSubmited });
                chrome.action.setBadgeText({ text: newCurrentSubmited.toString() });
                sendRes(newCurrentSubmited);
            })
        }
        return true;
    }

});



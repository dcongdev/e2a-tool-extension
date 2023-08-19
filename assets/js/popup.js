/* Copyright (C) 2023 Duong Cong - All Rights Reserved
* Email: duongcong0412hc@gmail.com
*/


$(document).ready(function () {
    const extensionUrl = chrome.runtime.getURL("");
    /*************** SETTINGS ***************/
    // ======= Check mode on load =======
    chrome.storage.local.get([
        "currentSubmitted",
        "sumbitHistory",
        "soundExists"
    ], (items) => {
        console.log(items)
        let currentSubmitted = items.currentSubmitted
        let sumbitHistory = items.sumbitHistory
        let soundExists = items.soundExists
        //
        $("#txtCurrentTask").text(currentSubmitted);
    });
    //
    chrome.storage.sync.get([
        "autoCount",
        "showTaskSubmittedInIcon",
        "countTimeInTask",
        "autoReload",
        "taskAvailNoti"
    ], (items) => {
        console.log(items)
        let autoCount = items.autoCount
        let showTaskSubmittedInIcon = items.showTaskSubmittedInIcon
        let countTimeInTask = items.countTimeInTask
        let autoReload = items.autoReload
        let taskAvailNoti = items.taskAvailNoti
        //
        if (autoCount == "ON") {
            $("#btnChangeAutoCountMode").attr("checked", true);
        }
        //
        if (showTaskSubmittedInIcon == "ON") {
            $("#btnChangeShowTaskInIcon").attr("checked", true);
        }
        //
        if (countTimeInTask == "ON") {
            $("#btnChangeCountTimeMode").attr("checked", true);
        }
        //
        if (autoReload.status == "ON") {
            $("#btnChangeAutoReloadMode").attr("checked", true);
            $("#autoReloadSelect").prop("disabled", false);
        }
        console.log(autoReload)
        // Set auto reload select value
        let autoReloadSelect = document.getElementById("autoReloadSelect");
        let autoReloadSlInHtml = "";
        for (let i = 5; i <= 60; i++) {
            if (autoReload.time == i * 60) {
                autoReloadSlInHtml += '<option value="' + i * 60 + '" selected>' + i + ' min</option>';
            }
            else {
                autoReloadSlInHtml += '<option value="' + i * 60 + '">' + i + ' min</option>';
            }

        }
        autoReloadSelect.innerHTML = autoReloadSlInHtml;
        //
        if (taskAvailNoti.status == "ON") {
            $("#btnChangeTaskAvailNotiMode").attr("checked", true);
            $(".taskAvailNotiSettings").removeClass("d-none");
        }
        //
        if (taskAvailNoti.systemNoti.status == "ON") {
            $("#btnChangeSysNotiMode").attr("checked", true);
            $(".sysNotiSet").removeClass("d-none");
        }
        // Noti title and content
        $("#inputTitleNoti").val(items.taskAvailNoti.systemNoti.title)
        $("#inputContentNoti").val(items.taskAvailNoti.systemNoti.content)
        //
        if (taskAvailNoti.notiSound.status == "ON") {
            $("#btnChangeNotiSoundMode").attr("checked", true);
            $(".notiSoundSets").removeClass("d-none");
        }
        if (taskAvailNoti.notiSound.loop == true) {
            $("#checkBoxLoopMode").attr("checked", true);
        }
        // List sound
        chrome.storage.local.get(["soundExists",], (items) => {
            let soundSelect = document.getElementById("notiSoundSelect");
            let soundSelectData = "";
            let soundList = items.soundExists;
            for (let i = 0; i < soundList.length; i++) {
                soundSelectData += '<option value="' + soundList[i][1] + '" ';
                if (taskAvailNoti.notiSound.soundName == soundList[i][1]) {
                    soundSelectData += 'selected';
                }
                soundSelectData += '>' + soundList[i][0] + '</option>';
            }
            soundSelect.innerHTML = soundSelectData;
        });
        //
    });

    // ======= Switch mode =======
    // Auto count mode
    $(document).on("click", "#btnChangeAutoCountMode", () => {
        if ($("#btnChangeAutoCountMode").is(":checked")) {
            chrome.storage.sync.set({ "autoCount": "ON" });
        }
        else {
            chrome.storage.sync.set({ "autoCount": "OFF" });
        }
    })
    // Reset button
    $(document).on("click", "#btnResetCounter", () => {
        chrome.storage.sync.get(["showTaskSubmittedInIcon"], (items) => {
            // reset
            chrome.storage.local.set({"currentSubmitted": 0});
            // Show
            let showTaskSubmittedInIcon = items.showTaskSubmittedInIcon;
            if (showTaskSubmittedInIcon == "OFF") {
                chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
                chrome.action.setBadgeText({ text: "" });
                return
            }
            chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
            chrome.action.setBadgeText({ text: "0" });
        })

        $("#alertResetCounterSuccs").removeClass("d-none");
        setTimeout(() => {
            $("#alertResetCounterSuccs").addClass("d-none");
        }, 2000);
    })
    // Show task submitted in icon
    $(document).on("click", "#btnChangeShowTaskInIcon", () => {
        if ($("#btnChangeShowTaskInIcon").is(":checked")) {
            chrome.storage.sync.set({ "showTaskSubmittedInIcon": "ON" });
            chrome.storage.local.get(["currentSubmitted"], (items) => {
                chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
                chrome.action.setBadgeText({ text: items.currentSubmitted.toString() });
            })
        }
        else {
            chrome.storage.sync.set({ "showTaskSubmittedInIcon": "OFF" });
            chrome.action.setBadgeText({ text: "" });
        }
    })
    // Count time in task
    $(document).on("click", "#btnChangeCountTimeMode", () => {
        if ($("#btnChangeCountTimeMode").is(":checked")) {
            chrome.storage.sync.set({ "countTimeInTask": "ON" });
        }
        else {
            chrome.storage.sync.set({ "countTimeInTask": "OFF" });
        }
    })
    // Auto reload
    // Event change status
    $(document).on("click", "#btnChangeAutoReloadMode", () => {
        if ($("#btnChangeAutoReloadMode").is(":checked")) {
            let autoReloadAfter = parseInt($("#autoReloadSelect option:selected").val());
            chrome.storage.sync.set({
                "autoReload": {
                    "status": "ON",
                    "time": autoReloadAfter
                }
            });
            $("#autoReloadSelect").prop("disabled", false);
        }
        else {
            let autoReloadAfter = parseInt($("#autoReloadSelect option:selected").val());
            chrome.storage.sync.set({
                "autoReload": {
                    "status": "OFF",
                    "time": autoReloadAfter
                }
            });
            $("#autoReloadSelect").prop("disabled", true);
        }
    })
    // Select time auto reload
    $(document).on("change", "#autoReloadSelect", () => {
        let autoReloadAfter = parseInt($("#autoReloadSelect option:selected").val());
        chrome.storage.sync.set({
            "autoReload": {
                "status": "ON",
                "time": autoReloadAfter
            }
        });
    })
    //
    // Task available notification mode
    $(document).on("click", "#btnChangeTaskAvailNotiMode", () => {
        chrome.storage.sync.get(["taskAvailNoti"], (items) => {
            let currSettings = items.taskAvailNoti;
            if ($("#btnChangeTaskAvailNotiMode").is(":checked")) {
                currSettings.status = "ON";
                $(".taskAvailNotiSettings").removeClass("d-none");
                chrome.storage.sync.set({ "taskAvailNoti": currSettings });
            }
            else {
                currSettings.status = "OFF";
                $(".taskAvailNotiSettings").addClass("d-none");
                chrome.storage.sync.set({ "taskAvailNoti": currSettings });
            }
        })

    })
    // Task available system notification
    $(document).on("click", "#btnChangeSysNotiMode", () => {
        chrome.storage.sync.get(["taskAvailNoti"], (items) => {
            let currSettings = items.taskAvailNoti;
            if ($("#btnChangeSysNotiMode").is(":checked")) {
                currSettings.systemNoti.status = "ON";
                $(".sysNotiSet").removeClass("d-none");
                chrome.storage.sync.set({ "taskAvailNoti": currSettings });
            }
            else {
                currSettings.systemNoti.status = "OFF";
                $(".sysNotiSet").addClass("d-none");
                chrome.storage.sync.set({ "taskAvailNoti": currSettings });
            }
        })

    })
    // Task available sound notification
    $(document).on("click", "#btnChangeNotiSoundMode", () => {
        chrome.storage.sync.get(["taskAvailNoti"], (items) => {
            let currSettings = items.taskAvailNoti;
            if ($("#btnChangeNotiSoundMode").is(":checked")) {
                currSettings.notiSound.status = "ON";
                $(".notiSoundSets").removeClass("d-none");
                chrome.storage.sync.set({ "taskAvailNoti": currSettings });
            }
            else {
                currSettings.notiSound.status = "OFF";
                $(".notiSoundSets").addClass("d-none");
                chrome.storage.sync.set({ "taskAvailNoti": currSettings });
            }
        })

    });

    // Test sound
    var playingTestSound = false;
    var testSoundEl = document.createElement("audio");
    $(document).on("click", "#btnTestSound", () => {
        if (playingTestSound == false) {
            let soundName = $("#notiSoundSelect option:selected").val();
            $("#btnTestSound").removeClass("bi-play-circle")
            $("#btnTestSound").addClass("bi-pause-circle")
            //
            chrome.runtime.sendMessage({ "getNotiSound": soundName }, (response) => {
                testSoundEl.innerHTML = '<source src="' + response + '" type="audio/mpeg" />'
                testSoundEl.load()
                testSoundEl.play();
                playingTestSound = true;
                //
                testSoundEl.onended = () => {
                    $("#btnTestSound").removeClass("bi-pause-circle")
                    $("#btnTestSound").addClass("bi-play-circle")
                    testSoundEl.pause();
                    testSoundEl.currentTime = 0;
                    playingTestSound = false;
                };
            })


        }
        else {
            $("#btnTestSound").removeClass("bi-pause-circle")
            $("#btnTestSound").addClass("bi-play-circle")
            testSoundEl.pause();
            testSoundEl.currentTime = 0;
            playingTestSound = false;
        }
    })

    // BUTTON SAVE NOTI SETTINGS
    $(document).on("click", "#btn-save-noti-sets", () => {
        let systemNoti_title = $("#inputTitleNoti").val();
        let systemNoti_content = $("#inputContentNoti").val();
        let notiSound_loop = $("#checkBoxLoopMode").is(':checked')
        let notiSound_soundName = $("#notiSoundSelect option:selected").val();

        chrome.storage.sync.get(["taskAvailNoti"], (items) => {
            let currSettings = items.taskAvailNoti;
            let newSettings = {
                "status": currSettings.status,
                "systemNoti": {
                    "status": currSettings.systemNoti.status,
                    "title": systemNoti_title,
                    "content": systemNoti_content,
                },
                "notiSound": {
                    "status": currSettings.notiSound.status,
                    "loop": notiSound_loop,
                    "soundName": notiSound_soundName,
                    "soundCustom": currSettings.notiSound.soundCustom,
                    "soundCustomURL": currSettings.notiSound.soundCustomURL,
                }
            }
            //
            chrome.storage.sync.set({ "taskAvailNoti": newSettings });
            $("#alertSaveSetsSuccs").removeClass("d-none");
            setTimeout(() => {
                $("#alertSaveSetsSuccs").addClass("d-none");
            }, 2000);

        });

    })

});




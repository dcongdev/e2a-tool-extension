/* Copyright (C) 2023 Duong Cong - All Rights Reserved
* Email: duongcong0412hc@gmail.com
*/

var DateTime = luxon.DateTime;
const extensionUrl = chrome.runtime.getURL("");

import { saveSettings, getSubmitHistoryByDay, getSettings, setSessionSubmitHistory } from "../background/storage.js";
import { checkUserAndTask, setTasksSubmittedOnIcon } from "../background/ui.js";

$(document).ready(async function () {

    // Timezone
    var timezoneList = await (await fetch("../data/timezone.json")).json();
    var timezone = (await chrome.storage.sync.get(["dateTime"])).dateTime.timezone;
    // console.log(timezone)

    // Loading animation
    const showLoading = (show) => {
        if (show) { $("#spinner").addClass("show"); }
        else { $("#spinner").removeClass("show"); }
    }


    /*************** UNLOCK ***************/
    $("#btn-unlock").on("click", async () => {
        showLoading(true)
        let key = $("#one-time-key").val().trim();
        if (key == "") {
            alert("The key is incorrect or has already been used, please try again.")
        }
        else {
            try {
                let response = await fetch("https://verify-e2atool.vercel.app/request-key/" + key);
                let data = await response.json();
                if (data.permission == "true") {

                    let onceTimeKey = { key: key, permission: true, description: "Active at: " + DateTime.utc().toISO() }
                    await saveSettings("local", "onceTimeKey", onceTimeKey)
                    alert("Unlock successfully!")
                    window.location.reload();
                }
                else {
                    alert("The key is incorrect or has already been used, please try again.")
                }
            } catch (error) {
                alert("Error, please try again.")
            }
        }
        //
        showLoading(false)
    });


    // Check user status
    await setSessionSubmitHistory();
    let userStatus = (await checkUserAndTask())
    // console.log(userStatus)
    if (!userStatus) {
        $(".error").removeClass("d-none");
        $(".main").addClass("d-none");
        return
    }
    else { showLoading(false) };

    // HIDDEN FEATURES
    var hiddenFeature = false;
    var userIconClick = 0;
    $("#txtExtensionStatus").on("click", () => {
        userIconClick++;
        if (userIconClick == 10) {
            hiddenFeature = true;
            $(".hidden-feature").toggleClass("d-none")
            console.log("Active ultimate features!")
        }
    })


    //
    const convertTime = (second) => {
        if (second <= 0) return "00:00";
        let hour = Math.floor(second / 3600);
        let min = Math.floor((second % 3600) / 60);
        let sec = second % 60;
        return [hour, min, sec].map(num => String(num).padStart(2, "0")).join(":");
    };

    // Update real time clock
    var blob = new Blob(["setInterval(function() {postMessage('');}, 1000); "]);
    var counterWorker = new Worker(window.URL.createObjectURL(blob));
    var txtRealTime = document.getElementsByClassName("txt-real-time");
    var txtCurrentTimezone = document.getElementsByClassName("txt-current-timezone");
    counterWorker.onmessage = async () => {
        if (timezone == "default") { timezone = DateTime.now().zoneName; }
        txtCurrentTimezone[0].innerText = timezone
        txtCurrentTimezone[1].innerText = timezone
        //
        let time = DateTime.utc().setZone(timezone);
        let dt = time.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS);
        txtRealTime[0].innerText = dt;
        txtRealTime[1].innerText = dt;
    };


    showLoading(true)
    setTimeout(async () => {
        let currentDay = DateTime.utc().setZone(timezone).toISODate()
        let data = await getSubmitHistoryByDay(currentDay, timezone)
        $("#txtToday").text(currentDay);
        $("#txtTasksSubmitted").text(data.length);
        $("#txtWorkTime").text(convertTime(data.reduce((sum, item) => sum + item.time, 0)));
        $(document).on("click", "#btn-open-detailed-statistic", () => {
            let statisticsPageUrl = chrome.runtime.getURL("/pages/statistics.html");
            chrome.tabs.create({ url: statisticsPageUrl });
        })
        showLoading(false)
    }, 100)

    // ========
    var localSettings = await getSettings("local", "soundFiles")
    var syncSettings = await getSettings("sync")
    //
    var { soundFiles } = localSettings;
    var { statistics, notifications, sounds, timing, automation, dateTime } = syncSettings;

    // =================================== Statistics =================================== //
    $("#btnChangeShowTasksOnIcon").prop("checked", statistics.showTasksSubmittedOnIcon === "ON");
    $(document).on("click", "#btnChangeShowTasksOnIcon", async () => {
        statistics.showTasksSubmittedOnIcon = $("#btnChangeShowTasksOnIcon").is(":checked") ? "ON" : "OFF";
        await saveSettings("sync", "statistics", statistics)
        await setTasksSubmittedOnIcon()
    });

    // Export submit history
    $(document).on("click", "#btn-export-submit-history", async () => {
        if (!hiddenFeature) { return }
        let { submitHistory } = await getSettings("local", "submitHistory");
        let currTime = DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd_HH-mm-ss');
        let fileName = "backup-data_" + currTime + ".json"
        try {
            let blob = new Blob([JSON.stringify(submitHistory, null, 4)], { type: "application/json" });
            let url = URL.createObjectURL(blob);
            //
            chrome.downloads.download({ url, filename: fileName, saveAs: false }, () => URL.revokeObjectURL(url));
        } catch { alert("Error!"); }
    });

    // Import submit history
    var selectedFile = null;
    document.getElementById("fileImportInput").addEventListener("change", function (event) {
        if (!hiddenFeature) { return }
        selectedFile = event.target.files[0];
        if (selectedFile) {
            document.getElementById("fileImportName").textContent = selectedFile.name;
        }
    });

    // Confirm
    document.getElementById("btn-import-submit-history").addEventListener("click", function () {
        if (!hiddenFeature) { return }
        if (!selectedFile) { alert("Please select file first"); return; }
        let reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let jsonData = JSON.parse(e.target.result);
                await saveSettings("local", "submitHistory", jsonData).then(() => { alert("Imported!") })
                await setSessionSubmitHistory();
                await checkUserAndTask();
            } catch { alert("Error"); }
        };
        reader.readAsText(selectedFile);
    });



    // =================================== Notifications =================================== //
    // Tasks available
    $("#btnChangeNotiTaskAvail").prop("checked", notifications.tasksAvailable === "ON");
    $(document).on("click", "#btnChangeNotiTaskAvail", async () => {
        notifications.tasksAvailable = $("#btnChangeNotiTaskAvail").is(":checked") ? "ON" : "OFF";
        await saveSettings("sync", "notifications", notifications)
    });

    // Task submitted
    $("#btnChangeNotiTaskSubmitted").prop("checked", notifications.taskIsSubmitted === "ON");
    $(document).on("click", "#btnChangeNotiTaskSubmitted", async () => {
        notifications.taskIsSubmitted = $("#btnChangeNotiTaskSubmitted").is(":checked") ? "ON" : "OFF";
        await saveSettings("sync", "notifications", notifications)
    });


    // =================================== Sounds =================================== //
    // ************* Task submitted *************
    $("#btnChangeNotiSoundTaskSubmitted").prop("checked", sounds.taskIsSubmitted.status === "ON");
    $(document).on("click", "#btnChangeNotiSoundTaskSubmitted", async () => {
        sounds.taskIsSubmitted.status = $("#btnChangeNotiSoundTaskSubmitted").is(":checked") ? "ON" : "OFF";
        await saveSettings("sync", "sounds", sounds)
    });
    // Volume slider
    let $taskSubmitSlider = $("#task-submit-volume-slider");
    let $taskSubmitLabel = $("#task-submit-volume-label");
    $taskSubmitSlider.val(sounds.taskIsSubmitted.volume)
    $taskSubmitLabel.text(sounds.taskIsSubmitted.volume * 100 + "%")
    //
    $taskSubmitSlider.on("input", async function () {
        let volume = Math.round($taskSubmitSlider.val() * 100);
        $taskSubmitLabel.text(volume + "%");
    });
    $taskSubmitSlider.on("change", async function () {
        sounds.taskIsSubmitted.volume = $taskSubmitSlider.val();
        await saveSettings("sync", "sounds", sounds)
    });

    // Select system files
    let $tickSoundSelect = $("#tickSoundSelect")
    for (let i = 0; i < soundFiles.tick.length; i++) {
        let name = soundFiles.tick[i].split(".")[0].replaceAll("-", " ");
        $tickSoundSelect.append('<option value="' + soundFiles.tick[i] + '">' + name + '</option>');
        $('#tickSoundSelect option[value="' + sounds.taskIsSubmitted.fileName + '"]').attr('selected', 'selected');
    }

    //
    $tickSoundSelect.on("change", async () => {
        let fileName = $("#tickSoundSelect option:selected").val();
        sounds.taskIsSubmitted.fileName = fileName;
        await saveSettings("sync", "sounds", sounds)
    })


    // ************* Task available *************
    $("#btnChangeNotiSoundTaskAvail").prop("checked", sounds.tasksAvailable.status === "ON");
    $(document).on("click", "#btnChangeNotiSoundTaskAvail", async () => {
        sounds.tasksAvailable.status = $("#btnChangeNotiSoundTaskAvail").is(":checked") ? "ON" : "OFF";
        await saveSettings("sync", "sounds", sounds)
    });

    // Volume slider
    let $taskAvailableSlider = $("#task-available-volume-slider");
    let $taskAvailableLabel = $("#task-available-volume-label");
    $taskAvailableSlider.val(sounds.tasksAvailable.volume)
    $taskAvailableLabel.text(sounds.tasksAvailable.volume * 100 + "%")
    //

    $taskAvailableSlider.on("input", async () => {
        let volume = Math.round($taskAvailableSlider.val() * 100);
        $taskAvailableLabel.text(volume + "%");
    });
    $taskAvailableSlider.on("change", async () => {
        sounds.tasksAvailable.volume = $taskAvailableSlider.val();
        await saveSettings("sync", "sounds", sounds)
    });

    // Change type
    $("#radioChooseSound" + (sounds.tasksAvailable.custom === "ON" ? "Custom" : "System")).prop("checked", true);
    $(document).on("click", "[name='radioChooseSound']", async () => {
        let type = $("[name=radioChooseSound]:checked").val();
        let isCustom = type === "custom";
        sounds.tasksAvailable.custom = isCustom ? "ON" : "OFF";
        await saveSettings("sync", "sounds", sounds)
    });

    // Select system files
    let $notiSysSoundSelect = $("#notiSysSoundSelect")
    for (let i = 0; i < soundFiles.sounds.length; i++) {
        let name = soundFiles.sounds[i].split(".")[0].replaceAll("-", " ");
        $notiSysSoundSelect.append('<option value="' + soundFiles.sounds[i] + '">' + name + '</option>');
    }

    $('#notiSysSoundSelect option[value="' + sounds.tasksAvailable.fileName + '"]').attr('selected', 'selected');

    //
    $notiSysSoundSelect.on("change", async () => {
        let fileName = $("#notiSysSoundSelect option:selected").val();
        sounds.tasksAvailable.fileName = fileName;
        await saveSettings("sync", "sounds", sounds)
    })

    // Edit custom sound url
    $("#notiCusSoundInput").val(sounds.tasksAvailable.customUrl);
    let $notiCusSoundInput = $("#notiCusSoundInput")
    $notiCusSoundInput.on("change", async () => {
        let url = $notiCusSoundInput.val();

        sounds.tasksAvailable.customUrl = url;
        await saveSettings("sync", "sounds", sounds)
    })

    // Loop
    let $checkBoxLoopMode = $("#checkBoxLoopMode")
    $checkBoxLoopMode.prop("checked", sounds.tasksAvailable.loop);
    $checkBoxLoopMode.on("click", async () => {
        sounds.tasksAvailable.loop = $checkBoxLoopMode.is(":checked") ? true : false;
        await saveSettings("sync", "sounds", sounds)
    });

    // Test sound
    let $btnTestSound = $("#btnTestSound");
    let playingTestSound = false;
    let testSoundEl = new Audio();

    $btnTestSound.on("click", async () => {
        if (!playingTestSound) {
            playingTestSound = true;
            let url = sounds.tasksAvailable.custom === "ON"
                ? sounds.tasksAvailable.customUrl
                : extensionUrl + "assets/sounds/" + sounds.tasksAvailable.fileName;

            if (!url) return;

            $btnTestSound.toggleClass("bi-pause-circle bi-play-circle");

            testSoundEl.src = url;
            testSoundEl.volume = sounds.tasksAvailable.volume;
            testSoundEl.play();

            testSoundEl.onended = () => resetTestSound();
        } else {
            resetTestSound();
        }
    });

    // Reset
    const resetTestSound = () => {
        $btnTestSound.toggleClass("bi-pause-circle bi-play-circle");
        testSoundEl.pause();
        testSoundEl.currentTime = 0;
        playingTestSound = false;
    };


    // ************* Timing *************
    let $btnChangeTimeCounterClock = $("#btnChangeTimeCounterClock")
    $btnChangeTimeCounterClock.prop("checked", timing.timeCounterClock.status === "ON");
    $btnChangeTimeCounterClock.on("click", async () => {
        timing.timeCounterClock.status = $btnChangeTimeCounterClock.is(":checked") ? "ON" : "OFF";
        await saveSettings("sync", "timing", timing)
    });
    //
    // Change type
    $("input[name='radioPositionClock'][value='" + timing.timeCounterClock.position + "']").prop("checked", true);
    $(document).on("click", "[name='radioPositionClock']", async (event) => {
        let position = $(event.target).val()
        timing.timeCounterClock.position = position
        await saveSettings("sync", "timing", timing)
    });




    // =================================== AUTOMATION =================================== //
    // ************* Auto reload *************
    let $btnChangeAutoReloadMode = $("#btnChangeAutoReloadMode")
    $btnChangeAutoReloadMode.prop("checked", automation.autoReload.status === "ON");
    $btnChangeAutoReloadMode.on("click", async () => {
        automation.autoReload.status = $btnChangeAutoReloadMode.is(":checked") ? "ON" : "OFF";
        await saveSettings("sync", "automation", automation)
    });

    // Select
    let $autoReloadSelectHour = $("#autoReloadSelectHour")
    let $autoReloadSelectMin = $("#autoReloadSelectMin")
    const createOptions = (max) => [...Array(max)].map((_, i) => `<option value="${i}">${i}</option>`).join("");
    $autoReloadSelectHour.html(createOptions(60));
    $autoReloadSelectMin.html(createOptions(60));
    //
    $autoReloadSelectHour.val(Math.floor(automation.autoReload.time / 3600));
    $autoReloadSelectMin.val(Math.floor((automation.autoReload.time % 3600) / 60));

    //
    const changeAutoReloadTime = async () => {
        let time = Number($autoReloadSelectHour.val()) * 3600 + Number($autoReloadSelectMin.val()) * 60
        automation.autoReload.time = time;
        await saveSettings("sync", "automation", automation);
    }
    // Change
    $("#autoReloadSelectHour, #autoReloadSelectMin").on("change", changeAutoReloadTime);


    // ************* Auto submit *************
    let $btnChangeAutoSubmitMode = $("#btnChangeAutoSubmitMode")
    $btnChangeAutoSubmitMode.prop("checked", automation.autoSubmit.status === "ON");
    $btnChangeAutoSubmitMode.on("click", async () => {
        automation.autoSubmit.status = $btnChangeAutoSubmitMode.is(":checked") ? "ON" : "OFF";
        await saveSettings("sync", "automation", automation)
    });
    //
    let $autoSubmitAllMin = $("#autoSubmitAllMin")
    let $autoSubmitAllMax = $("#autoSubmitAllMax")
    $autoSubmitAllMin.val(automation.autoSubmit.min)
    $autoSubmitAllMax.val(automation.autoSubmit.max)
    //
    $([$autoSubmitAllMin, $autoSubmitAllMax]).each((_, input) => {
        input[0].addEventListener("change", async function () {
            let min = $autoSubmitAllMin.val()
            let max = $autoSubmitAllMax.val()
            automation.autoSubmit.min = min;
            automation.autoSubmit.max = max;
            await saveSettings("sync", "automation", automation) // Save
        });
    });

    // Custom
    let $autoSubmitEdit = $("#autoSubmitEdit");
    let autoSBCustom = automation.autoSubmit.custom;

    // Change
    const triggerEventChange = () => {
        document.querySelectorAll(".autoSubmitCusMax, .autoSubmitCusMin").forEach(input => {
            input.addEventListener("change", async function () {
                let taskName = this.getAttribute("data-taskName");
                let min = document.querySelector("input.autoSubmitCusMin[data-taskName='" + taskName + "']").value;
                let max = document.querySelector("input.autoSubmitCusMax[data-taskName='" + taskName + "']").value;
                //
                let index = autoSBCustom.findIndex(x => x.name == taskName);
                autoSBCustom[index].min = min;
                autoSBCustom[index].max = max;
                automation.autoSubmit.custom = autoSBCustom;
                await saveSettings("sync", "automation", automation) // Save
            });
        });
    }

    // Remove
    const triggerEventRemove = () => {
        document.querySelectorAll('.btn-remove-custom-submit').forEach(button => {
            button.addEventListener('click', async function () {
                let taskName = this.getAttribute("data-taskName");
                autoSBCustom = autoSBCustom.filter(item => item.name !== taskName);
                automation.autoSubmit.custom = autoSBCustom;
                //
                await saveSettings("sync", "automation", automation).then(() => {
                    alert("Removed!");
                    loadCustomList()
                })
            })
        })
    }

    // Load list
    const loadCustomList = () => {
        $autoSubmitEdit.html("")
        //
        autoSBCustom.forEach(task => {
            let $items = $(`
            <div class="setting-options col-md-12 pb-1 pt-2 mt-1 setting-items container-fluid">
                <div class="row d-flex justify-content-between">
                    <div class="col-12 pe-0 me-1">
                        <strong class="taskTitle">${task.name}</strong>
                    </div>
                    <div class="container-fluid d-flex justify-content-between col-12 mt-1">
                        <div class="input-group mb-3 col">
                            <span class="input-group-text">min</span>
                            <input data-taskName="${task.name}" type="number" class="form-control autoSubmitCusMin" min="0" value="${task.min}">
                            <span class="input-group-text">max</span>
                            <input data-taskName="${task.name}" type="number" class="form-control autoSubmitCusMax" min="0" value="${task.max}">
                        </div>
                        <div>
                            <button data-taskName="${task.name}" class="btn btn-danger bi bi-trash-fill ms-1 btn-remove-custom-submit"></button>
                        </div>
                    </div>
                </div>
            </div>
        `);
            // 
            $autoSubmitEdit.append($items);
        });
        triggerEventChange();
        triggerEventRemove()
    }//
    loadCustomList();


    // Add new
    let $addCustomAutoSubmitCnt = $("#addCustomAutoSubmitCnt");
    $("#btn-add-custom-submit").on("click", async () => {
        let name = $addCustomAutoSubmitCnt.find('input')[0].value
        let min = $addCustomAutoSubmitCnt.find('input')[1].value
        let max = $addCustomAutoSubmitCnt.find('input')[2].value
        //
        if (name == "" || min == "" || max == "" || min <= 0 || max <= 0 || min > max) {
            alert("Incorrect data!")
            return;
        }
        //
        let index = autoSBCustom.findIndex(x => x.name == name);
        if (index >= 0) { alert("Has existed!"); return };
        //
        autoSBCustom.push({ name, min, max });
        autoSBCustom.sort((a, b) => a.name.localeCompare(b.name));
        automation.autoSubmit.custom = autoSBCustom;
        //
        await saveSettings("sync", "automation", automation).then(() => {
            alert("Added!");
            loadCustomList()
        })

    })


    // Toggle custom
    $("#customAutoSubmit-tab").on("click", () => {
        $("#customAutoSubmit").toggleClass("show active");
        $("#automation").toggleClass("show active");
    })



    // =================================== DATETIME =================================== //
    //
    let options = timezoneList.map(tz => `<option value="${tz.timezone}">${tz.name}</option>`).join('');
    $("#timezoneSelect").html(`
    <option value="default">Default (local timezone)</option>${options}`).val(timezone);
    //

    $("#btnSetTimezone").on("click", async () => {
        let timezoneSelect = $("#timezoneSelect").val()
        dateTime.timezone = timezoneSelect;
        await saveSettings("sync", "dateTime", dateTime).then(async () => {
            await setSessionSubmitHistory()
            await checkUserAndTask();

            window.location.reload();
            // Reload statistics page
            let tabs = await chrome.tabs.query({});
            let statisticsPageUrl = chrome.runtime.getURL("/pages/statistics.html");
            tabs.forEach((tab) => {
                if (tab.url.includes(statisticsPageUrl)) {
                    chrome.tabs.reload(tab.id);
                }
            });
        })

    })


})




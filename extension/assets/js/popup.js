/* Copyright (C) 2023 Duong Cong - All Rights Reserved
* Email: duongcong0412hc@gmail.com
*/

var DateTime = luxon.DateTime;
const extensionUrl = chrome.runtime.getURL("");
$(document).ready(async function () {

    // Loading animation
    var loading = false;
    var spinner = document.getElementById("spinner");
    setInterval(() => {
        if (loading == false) {
            $("#spinner").removeClass("show");
        }
        else if (loading == true) {
            if (!spinner.classList.contains("show")) {
                $("#spinner").addClass("show");
            }
        }
    }, 100)

    // Check permission
    loading = true
    setTimeout(() => {
        chrome.runtime.sendMessage({ "checkUserStatus": true }, (res) => {
            //
            if (res.status == "error") {
                $(".error").removeClass("d-none");
                $(".main").addClass("d-none");
                chrome.action.setBadgeBackgroundColor({ color: "red" });
                chrome.action.setBadgeText({ text: "!" });
                chrome.storage.session.set({
                    "userStatus": {
                        status: "error",
                        lastChecked: DateTime.utc().toISO()
                    }
                });
            }
            else if (res.status == "ok" && res.message == "You have permission to use extension.") {
                $(".error").addClass("d-none");
                $(".main").removeClass("d-none");
                chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
                chrome.action.setBadgeText({ text: "" });
                chrome.storage.session.set({
                    "userStatus": {
                        status: "ok",
                        lastChecked: DateTime.utc().toISO()
                    }
                });
                chrome.runtime.sendMessage({ "setTaskSubmittedOnIcon": true }, (res) => { })
            }
            loading = false
        })
    }, 100)

    // Timezone
    var response = await fetch("../../assets/js/timezone.json");
    let tzList = await response.json();
    // console.log(tzList)
    var timezone = (await chrome.storage.sync.get(["DateTime"])).DateTime.Timezone

    // Update real time clock
    var blob = new Blob(["setInterval(function() {postMessage('');}, 1000); "]);
    var counterWorker = new Worker(window.URL.createObjectURL(blob));
    counterWorker.onmessage = async () => {
        // timezone = (await chrome.storage.sync.get(["DateTime"])).DateTime.Timezone;

        let txtRealTime = document.getElementsByClassName("txt-real-time");
        let txtCurrentTimezone = document.getElementsByClassName("txt-current-timezone");
        if (timezone == "default") { timezone = DateTime.now().zoneName; }
        txtCurrentTimezone[0].innerText = timezone
        txtCurrentTimezone[1].innerText = timezone

        let time = DateTime.utc().setZone(timezone);
        let dt = time.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS);
        txtRealTime[0].innerText = dt;
        txtRealTime[1].innerText = dt;
    };

    // Test sound
    var playingTestSound = false;
    var testSoundEl = document.createElement("audio");

    // Function convert time
    const convertTime = (second) => {
        if (second <= 0) {
            return "00:00";
        }
        let time = "";
        let hour = parseInt(second / 3600);
        let min = parseInt((second % 3600) / 60);
        let sec = (second % 3600) % 60;
        if (hour < 10 && hour >= 1) {
            time += "0";
        }
        time += hour + ":";
        if (min < 10) {
            time += "0";
        } // Minute
        time += min + ":";
        if (sec < 10) {
            time += "0";
        } // Second
        time += sec;
        return time;
    };


    /*************** UNLOCK ***************/
    $("#btn-unlock").on("click", async () => {
        let key = $("#one-time-key").val();
        if (key == "") {
            alert("The key is incorrect or has already been used, please try again.")
            return
        }

        try {
            let response = await fetch("https://verify-e2atool.vercel.app/request-key/" + key);
            // console.log(response)
            let data = await response.json();
            if (data.permission == "true") {
                await chrome.storage.local.set({ "key": { "key": key, "permission": "true" } })
                alert("Unlock successfully!")
                window.location.reload();
            }
            else {
                alert("The key is incorrect or has already been used, please try again.")
            }
        } catch (error) {
            alert("Error, please try again.")
        }
    });



    /*************** DASHBOARD ***************/
    // DAY
    const getDataByDay = async (date) => {
        let submitHistory = (await chrome.storage.local.get(["submitHistory"])).submitHistory;
        let dataByDay = {
            date: date,
            totalTasks: 0,
            totalTime: 0
        };
        //
        let totalTasks = 0;
        let totalTime = 0;

        // Get data
        if (submitHistory == null || submitHistory == []) {
            return dataByDay;
        }

        for (let i = 0; i < submitHistory.length; i++) {
            let taskDate = DateTime.fromISO(submitHistory[i].datetime).setZone(
                timezone
            );
            // console.log(taskDate.toISODate())

            if (taskDate.toISODate() == date) {
                totalTasks += 1;
                totalTime += submitHistory[i].time;
            }
        }
        //
        dataByDay.totalTasks = totalTasks;
        dataByDay.totalTime = totalTime;
        //
        // console.log(dataByDay)
        return dataByDay;
    };

    // Set dashboard data
    loading = true;
    setTimeout(async () => {
        let detailDay = await getDataByDay(DateTime.utc().setZone(timezone).toISODate());
        $("#txtToday").text(detailDay.date);
        $("#txtTasksSubmitted").text(detailDay.totalTasks);
        $("#txtWorkTime").text(convertTime(detailDay.totalTime));
        $(document).on("click", "#btn-open-detailed-statistic", () => {
            let statisticsPageUrl = chrome.runtime.getURL("/pages/statistics.html");
            chrome.tabs.create({ url: statisticsPageUrl });
        })

        loading = false;
    }, 100)

    /*************** SETTINGS ***************/
    // ======= Check mode on load =======
    // Local
    chrome.storage.local.get(null, async (items) => {
        // console.log(items)
        // let sumbitHistory = items.sumbitHistory
        let soundExists = items.soundExists;
        for (let i = 0; i < soundExists.length; i++) {
            // console.log(soundExists[i]);
            $("#notiSysSoundSelect").append('<option value="' + soundExists[i][1] + '">' + soundExists[i][0] + '</option>');
            let Sounds = (await chrome.storage.sync.get(["Sounds"])).Sounds;
            let soundName = Sounds.TasksAvailable.SoundName;
            $('#notiSysSoundSelect option[value="' + soundName + '"]').attr('selected', 'selected');
        }
    });
    // Sync
    chrome.storage.sync.get(null, async (items) => {
        // console.log(items)
        let Statistics = items.Statistics;
        let Notifications = items.Notifications;
        let Sounds = items.Sounds;
        let Timing = items.Timing;
        let Automation = items.Automation;
        let DateTime = items.DateTime;

        // *** Statistics *** //
        if (Statistics.ShowTasksSubmittedOnIcon == "ON") {
            $("#btnChangeShowTasksOnIcon").attr("checked", true);
        }

        // *** Notifications *** //
        if (Notifications.TasksAvailable == "ON") {
            $("#btnChangeNotiTaskAvail").attr("checked", true);
        }
        if (Notifications.TaskIsSubmitted == "ON") {
            $("#btnChangeNotiTaskSubmitted").attr("checked", true);
        }

        // *** Sounds *** //
        if (Sounds.TaskIsSubmitted == "ON") {
            $("#btnChangeNotiSoundTaskSubmitted").attr("checked", true);
        }

        // Select sound
        if (Sounds.TasksAvailable.CustomSound == "ON") {
            $("#radioChooseSoundCustom").attr("checked", true);
        }
        else {
            $("#radioChooseSoundSystem").attr("checked", true);
        }
        // Custom sound url
        $("#notiCusSoundInput").val(Sounds.TasksAvailable.CustomSoundUrl);
        //
        // Loop
        if (Sounds.TasksAvailable.loop == true) {
            $("#checkBoxLoopMode").attr("checked", true);
        }
        // All
        if (Sounds.TasksAvailable.status == "ON") {
            $("#btnChangeNotiSoundTaskAvail").attr("checked", true);
            //
            $("#radioChooseSoundSystem").prop("disabled", false);
            //
            $("#radioChooseSoundCustom").prop("disabled", false);
            //
            $("#checkBoxLoopMode").prop("disabled", false);

            if (Sounds.TasksAvailable.CustomSound == "ON") {
                $("#notiSysSoundSelect").prop("disabled", true);
                $("#notiCusSoundInput").prop("disabled", false);
            }
            else {
                $("#notiSysSoundSelect").prop("disabled", false);
                $("#notiCusSoundInput").prop("disabled", true);
            }

        }


        // *** Timing *** //
        if (Timing.TimeCounterClock == "ON") {
            $("#btnChangeTimeCounterClock").attr("checked", true);
        }

        // *** Automation *** //
        // === Auto reload
        if (Automation.AutoReload.status == "ON") {
            $("#btnChangeAutoReloadMode").attr("checked", true);
            $("#autoReloadSelectHour").prop("disabled", false);
            $("#autoReloadSelectMin").prop("disabled", false);
        }
        // Select
        for (let i = 0; i < 60; i++) {
            $("#autoReloadSelectHour").append('<option value="' + i + '">' + i + '</option>')
        }
        for (let i = 0; i < 60; i++) {
            $("#autoReloadSelectMin").append('<option value="' + i + '">' + i + '</option>')
        }
        let autoReloadSecs = Automation.AutoReload.time;
        $('#autoReloadSelectHour option[value=' + parseInt(autoReloadSecs / 3600) + ']').attr('selected', 'selected');
        $('#autoReloadSelectMin option[value=' + parseInt((autoReloadSecs % 3600) / 60) + ']').attr('selected', 'selected');

        // === Auto submit
        if (Automation.AutoSubmit.status == "ON") {
            $("#btnChangeAutoSubmitMode").attr("checked", true);
            // Start
            $("#autoSubmitStartSelectMin").prop("disabled", false);
            $("#autoSubmitStartSelectSec").prop("disabled", false);
            // End
            $("#autoSubmitEndSelectMin").prop("disabled", false);
            $("#autoSubmitEndSelectSec").prop("disabled", false);
        }
        // Select
        for (let i = 0; i < 60; i++) {
            // Start
            $("#autoSubmitStartSelectMin").append('<option value="' + i + '">' + i + '</option>')
            $("#autoSubmitStartSelectSec").append('<option value="' + i + '">' + i + '</option>')
            // End
            $("#autoSubmitEndSelectMin").append('<option value="' + i + '">' + i + '</option>')
            $("#autoSubmitEndSelectSec").append('<option value="' + i + '">' + i + '</option>')
        }
        // Start
        let autoSubmitStartSecs = Automation.AutoSubmit.startTime;
        let autoSubmitStartMin = parseInt((autoSubmitStartSecs % 3600) / 60)
        let autoSubmitStartSec = (autoSubmitStartSecs % 3600) % 60;
        $('#autoSubmitStartSelectMin option[value=' + autoSubmitStartMin + ']').attr('selected', 'selected');
        $('#autoSubmitStartSelectSec option[value=' + autoSubmitStartSec + ']').attr('selected', 'selected');

        // End
        let autoSubmitEndSecs = Automation.AutoSubmit.endTime;
        let autoSubmitEndMin = parseInt((autoSubmitEndSecs % 3600) / 60)
        let autoSubmitEndSec = (autoSubmitEndSecs % 3600) % 60;
        $('#autoSubmitEndSelectMin option[value=' + autoSubmitEndMin + ']').attr('selected', 'selected');
        $('#autoSubmitEndSelectSec option[value=' + autoSubmitEndSec + ']').attr('selected', 'selected');

        // *** DateTime *** //
        let currTimezone = DateTime.Timezone;
        $("#timezoneSelect").append('<option value="default">Default (local timezone)</option>')

        for (let i = 0; i < tzList.length; i++) {
            let name = tzList[i].name;
            let zone = tzList[i].timezone;
            $("#timezoneSelect").append('<option value="' + zone + '">' + name + '</option>')
        }
        $('#timezoneSelect option[value="' + currTimezone + '"]').attr('selected', 'selected');


    })

    // ======= SWITCH MODE =======
    // *** Statistics *** //
    // Show tasks submitted on extension icon
    $(document).on("click", "#btnChangeShowTasksOnIcon", async () => {
        let Statistics = (await chrome.storage.sync.get(["Statistics"])).Statistics;
        if ($("#btnChangeShowTasksOnIcon").is(":checked")) {
            Statistics.ShowTasksSubmittedOnIcon = "ON";
            chrome.storage.sync.set({ "Statistics": Statistics });
            chrome.runtime.sendMessage({ "setTaskSubmittedOnIcon": true }, (res) => { })
        }
        else {
            Statistics.ShowTasksSubmittedOnIcon = "OFF";
            chrome.storage.sync.set({ "Statistics": Statistics });
            chrome.runtime.sendMessage({ "setTaskSubmittedOnIcon": true }, (res) => { })
        }
    })

    // *** Notifications *** //
    // When there are tasks available
    $(document).on("click", "#btnChangeNotiTaskAvail", async () => {
        let Notifications = (await chrome.storage.sync.get(["Notifications"])).Notifications;
        if ($("#btnChangeNotiTaskAvail").is(":checked")) {
            Notifications.TasksAvailable = "ON";
            chrome.storage.sync.set({ "Notifications": Notifications });
        }
        else {
            Notifications.TasksAvailable = "OFF";
            chrome.storage.sync.set({ "Notifications": Notifications });
        }
    })

    // When a task is submitted
    $(document).on("click", "#btnChangeNotiTaskSubmitted", async () => {
        let Notifications = (await chrome.storage.sync.get(["Notifications"])).Notifications;
        if ($("#btnChangeNotiTaskSubmitted").is(":checked")) {
            Notifications.TaskIsSubmitted = "ON";
            chrome.storage.sync.set({ "Notifications": Notifications });
        }
        else {
            Notifications.TaskIsSubmitted = "OFF";
            chrome.storage.sync.set({ "Notifications": Notifications });
        }
    })

    // *** Sounds *** //
    // When a task is submitted
    $(document).on("click", "#btnChangeNotiSoundTaskSubmitted", async () => {
        let Sounds = (await chrome.storage.sync.get(["Sounds"])).Sounds;
        if ($("#btnChangeNotiSoundTaskSubmitted").is(":checked")) {
            Sounds.TaskIsSubmitted = "ON";
            chrome.storage.sync.set({ "Sounds": Sounds });
        }
        else {
            Sounds.TaskIsSubmitted = "OFF";
            chrome.storage.sync.set({ "Sounds": Sounds });
        }
    })

    // When there are tasks available
    $(document).on("click", "#btnChangeNotiSoundTaskAvail", async () => {
        let Sounds = (await chrome.storage.sync.get(["Sounds"])).Sounds;
        if ($("#btnChangeNotiSoundTaskAvail").is(":checked")) {
            Sounds.TasksAvailable.status = "ON";
            chrome.storage.sync.set({ "Sounds": Sounds });
            $("#radioChooseSoundSystem").prop("disabled", false);
            //
            $("#radioChooseSoundCustom").prop("disabled", false);
            //
            $("#checkBoxLoopMode").prop("disabled", false);

            let type = $('[name=radioChooseSound]:checked').val()
            if (type == "system") {
                $("#notiSysSoundSelect").prop("disabled", false);
                $("#notiCusSoundInput").prop("disabled", true);
            }
            if (type == "custom") {
                $("#notiSysSoundSelect").prop("disabled", true);
                $("#notiCusSoundInput").prop("disabled", false);
            }

        }
        else {
            Sounds.TasksAvailable.status = "OFF";
            chrome.storage.sync.set({ "Sounds": Sounds });
            $("#radioChooseSoundSystem").prop("disabled", true);
            $("#notiSysSoundSelect").prop("disabled", true);
            //
            $("#radioChooseSoundCustom").prop("disabled", true);
            $("#notiCusSoundInput").prop("disabled", true);
            //
            $("#checkBoxLoopMode").prop("disabled", true);
        }
    })

    // Choose sound
    $(document).on("click", "[name='radioChooseSound']", async () => {
        let Sounds = (await chrome.storage.sync.get(["Sounds"])).Sounds;
        let type = $('[name=radioChooseSound]:checked').val()
        if (type == "system") {
            Sounds.TasksAvailable.CustomSound = "OFF";
            $("#notiSysSoundSelect").prop("disabled", false);
            $("#notiCusSoundInput").prop("disabled", true);
        }
        if (type == "custom") {
            Sounds.TasksAvailable.CustomSound = "ON";
            $("#notiSysSoundSelect").prop("disabled", true);
            $("#notiCusSoundInput").prop("disabled", false);
        }
        chrome.storage.sync.set({ "Sounds": Sounds });
        //
        $("#btnTestSound").removeClass("bi-pause-circle")
        $("#btnTestSound").addClass("bi-play-circle")
        testSoundEl.pause();
        testSoundEl.currentTime = 0;
        playingTestSound = false;
    })

    // Select system sound
    $(document).on("change", "#notiSysSoundSelect", async () => {
        let soundName = $("#notiSysSoundSelect option:selected").val();
        let Sounds = (await chrome.storage.sync.get(["Sounds"])).Sounds;
        Sounds.TasksAvailable.SoundName = soundName;
        chrome.storage.sync.set({ "Sounds": Sounds });
        $("#btnTestSound").removeClass("bi-pause-circle")
        $("#btnTestSound").addClass("bi-play-circle")
        testSoundEl.pause();
        testSoundEl.currentTime = 0;
        playingTestSound = false;
    })

    // Edit custom sound url
    $(document).on("change", "#notiCusSoundInput", async () => {
        let url = $("#notiCusSoundInput").val();
        let Sounds = (await chrome.storage.sync.get(["Sounds"])).Sounds;
        Sounds.TasksAvailable.CustomSoundUrl = url;
        chrome.storage.sync.set({ "Sounds": Sounds });
        //
        $("#btnTestSound").removeClass("bi-pause-circle")
        $("#btnTestSound").addClass("bi-play-circle")
        testSoundEl.pause();
        testSoundEl.currentTime = 0;
        playingTestSound = false;
    })
    // Loop mode
    $("#checkBoxLoopMode").on("click", async () => {
        let check = $("#checkBoxLoopMode").is(':checked');
        let Sounds = (await chrome.storage.sync.get(["Sounds"])).Sounds;
        Sounds.TasksAvailable.loop = check;
        chrome.storage.sync.set({ "Sounds": Sounds });
    });

    // Test sound
    $(document).on("click", "#btnTestSound", async () => {
        if (playingTestSound == false) {
            playingTestSound = true;

            let Sounds = (await chrome.storage.sync.get(["Sounds"])).Sounds;
            let url = extensionUrl + "res/noti-audio/" + Sounds.TasksAvailable.SoundName;

            if (Sounds.TasksAvailable.CustomSound == "ON") {
                url = Sounds.TasksAvailable.CustomSoundUrl;
            }

            $("#btnTestSound").removeClass("bi-play-circle")
            $("#btnTestSound").addClass("bi-pause-circle")
            testSoundEl.innerHTML = '<source src="' + url + '" type="audio/mpeg" />'
            testSoundEl.load()
            testSoundEl.play();
            //
            testSoundEl.onended = () => {
                $("#btnTestSound").removeClass("bi-pause-circle")
                $("#btnTestSound").addClass("bi-play-circle")
                testSoundEl.pause();
                testSoundEl.currentTime = 0;
                playingTestSound = false;
            };
        }
        else {
            $("#btnTestSound").removeClass("bi-pause-circle")
            $("#btnTestSound").addClass("bi-play-circle")
            testSoundEl.pause();
            testSoundEl.currentTime = 0;
            playingTestSound = false;
        }
    })

    // *** Timing *** //
    // Count time clock
    $(document).on("click", "#btnChangeTimeCounterClock", async () => {
        let Timing = (await chrome.storage.sync.get(["Timing"])).Timing;
        if ($("#btnChangeTimeCounterClock").is(":checked")) {
            Timing.TimeCounterClock = "ON";
            chrome.storage.sync.set({ "Timing": Timing });
        }
        else {
            Timing.TimeCounterClock = "OFF";
            chrome.storage.sync.set({ "Timing": Timing });
        }
    })


    // *** Automation *** //
    // === Auto reload
    $(document).on("click", "#btnChangeAutoReloadMode", async () => {
        let Automation = (await chrome.storage.sync.get(["Automation"])).Automation;
        if ($("#btnChangeAutoReloadMode").is(":checked")) {
            Automation.AutoReload.status = "ON";
            chrome.storage.sync.set({ "Automation": Automation });
            //
            $("#autoReloadSelectHour").prop("disabled", false);
            $("#autoReloadSelectMin").prop("disabled", false);
        }
        else {
            Automation.AutoReload.status = "OFF";
            chrome.storage.sync.set({ "Automation": Automation });
            //
            $("#autoReloadSelectHour").prop("disabled", true);
            $("#autoReloadSelectMin").prop("disabled", true);
        }
    })

    // Select auto reload hour and min
    $(document).on("change", "#autoReloadSelectHour", async () => {
        let hour = $("#autoReloadSelectHour option:selected").val();
        let min = $("#autoReloadSelectMin option:selected").val();
        let Automation = (await chrome.storage.sync.get(["Automation"])).Automation;
        let time = hour * 3600 + min * 60;
        Automation.AutoReload.time = time;
        chrome.storage.sync.set({ "Automation": Automation });
    })
    //
    $(document).on("change", "#autoReloadSelectMin", async () => {
        let hour = $("#autoReloadSelectHour option:selected").val();
        let min = $("#autoReloadSelectMin option:selected").val();
        let Automation = (await chrome.storage.sync.get(["Automation"])).Automation;
        let time = hour * 3600 + min * 60;
        Automation.AutoReload.time = time;
        chrome.storage.sync.set({ "Automation": Automation });
    })

    // === Auto submit
    $(document).on("click", "#btnChangeAutoSubmitMode", async () => {
        let Automation = (await chrome.storage.sync.get(["Automation"])).Automation;
        if ($("#btnChangeAutoSubmitMode").is(":checked")) {
            Automation.AutoSubmit.status = "ON";
            chrome.storage.sync.set({ "Automation": Automation });
            // Start
            $("#autoSubmitStartSelectMin").prop("disabled", false);
            $("#autoSubmitStartSelectSec").prop("disabled", false);
            // End
            $("#autoSubmitEndSelectMin").prop("disabled", false);
            $("#autoSubmitEndSelectSec").prop("disabled", false);
        }
        else {
            Automation.AutoSubmit.status = "OFF";
            chrome.storage.sync.set({ "Automation": Automation });
            // Start
            $("#autoSubmitStartSelectMin").prop("disabled", true);
            $("#autoSubmitStartSelectSec").prop("disabled", true);
            // End
            $("#autoSubmitEndSelectMin").prop("disabled", true);
            $("#autoSubmitEndSelectSec").prop("disabled", true);
        }
    })

    // START: Select auto submit min and sec
    const setAutoSubmitStartTime = async () => {
        let min = $("#autoSubmitStartSelectMin option:selected").val();
        let sec = $("#autoSubmitStartSelectSec option:selected").val();
        let Automation = (await chrome.storage.sync.get(["Automation"])).Automation;
        // 
        let currStartTime = Automation.AutoSubmit.startTime;
        let endTime = Automation.AutoSubmit.endTime;
        //
        let time = min * 60 + sec * 1;
        if (time <= endTime) {
            Automation.AutoSubmit.startTime = time;
            chrome.storage.sync.set({ "Automation": Automation });
        }
        else { alert("Start time cannot higher than end time!"); }
    }
    //
    const setAutoSubmitEndTime = async () => {
        let min = $("#autoSubmitEndSelectMin option:selected").val();
        let sec = $("#autoSubmitEndSelectSec option:selected").val();
        let Automation = (await chrome.storage.sync.get(["Automation"])).Automation;
        // 
        let startTime = Automation.AutoSubmit.startTime;
        let currEndTime = Automation.AutoSubmit.endTime;
        // 
        let time = min * 60 + sec * 1;
        if (time >= startTime) {
            Automation.AutoSubmit.endTime = time;
            chrome.storage.sync.set({ "Automation": Automation });
        }
        else { alert("End time cannot lower than start time!"); }
    }
    $(document).on("change", "#autoSubmitStartSelectMin", async () => {
        await setAutoSubmitStartTime();
    })
    //
    $(document).on("change", "#autoSubmitStartSelectSec", async () => {
        await setAutoSubmitStartTime();
    })

    // END: Select auto submit min and sec
    $(document).on("change", "#autoSubmitEndSelectMin", async () => {
        await setAutoSubmitEndTime();
    })
    //
    $(document).on("change", "#autoSubmitEndSelectSec", async () => {
        await setAutoSubmitEndTime();
    })

    // *** Date & Time tab *** //
    // Timezone
    $(document).on("click", "#btnSetTimezone", async () => {
        let statisticsPageUrl = chrome.runtime.getURL("/pages/statistics.html");
        let newTimezone = $("#timezoneSelect option:selected").val();
        timezone = newTimezone;

        //
        let NewDateTime = (await chrome.storage.sync.get(["DateTime"])).DateTime;
        NewDateTime.Timezone = newTimezone;
        await chrome.storage.sync.set({ "DateTime": NewDateTime });

        window.location.reload();

        var tabs = await chrome.tabs.query({});
        tabs.forEach((tab) => {
            if (tab.url.includes(statisticsPageUrl)) {
                var code = 'window.location.reload();';
                chrome.tabs.reload(tab.id);
                // chrome.tabs.remove(tab.id, () => { });
            }
        });
    })
});




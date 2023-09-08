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
            if (res.status != "ok" && res.message != "You have permission to use extension.") {
                $(".error").removeClass("d-none");
                $(".main").addClass("d-none");
                chrome.action.setBadgeBackgroundColor({ color: "red" });
                chrome.action.setBadgeText({ text: "!" });
                return
            }
            else{
                $(".error").addClass("d-none");
                $(".main").removeClass("d-none");
                chrome.action.setBadgeBackgroundColor({ color: "#D1F2EB" });
                chrome.action.setBadgeText({ text: "" });
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
        if (timezone == "default") { timezone = DateTime.local().zoneName; }
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
        if (Timing.CountTimeClock == "ON") {
            $("#btnChangeCountTimeCLock").attr("checked", true);
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
            $("#autoSubmitSelectMin").prop("disabled", false);
            $("#autoSubmitSelectSec").prop("disabled", false);
        }
        // Select
        for (let i = 0; i < 60; i++) {
            $("#autoSubmitSelectMin").append('<option value="' + i + '">' + i + '</option>')
            $("#autoSubmitSelectSec").append('<option value="' + i + '">' + i + '</option>')
        }
        let autoSubmitSecs = Automation.AutoSubmit.time;
        let autoSubmitMin = parseInt((autoSubmitSecs % 3600) / 60)
        let autoSubmitsec = (autoSubmitSecs % 3600) % 60;
        $('#autoSubmitSelectMin option[value=' + autoSubmitMin + ']').attr('selected', 'selected');
        $('#autoSubmitSelectSec option[value=' + autoSubmitsec + ']').attr('selected', 'selected');

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
        }
        else {
            Statistics.ShowTasksSubmittedOnIcon = "OFF";
            chrome.storage.sync.set({ "Statistics": Statistics });
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
    $(document).on("click", "#btnChangeCountTimeCLock", async () => {
        let Timing = (await chrome.storage.sync.get(["Timing"])).Timing;
        if ($("#btnChangeCountTimeCLock").is(":checked")) {
            Timing.CountTimeClock = "ON";
            chrome.storage.sync.set({ "Timing": Timing });
        }
        else {
            Timing.CountTimeClock = "OFF";
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
            //
            $("#autoSubmitSelectMin").prop("disabled", false);
            $("#autoSubmitSelectSec").prop("disabled", false);
        }
        else {
            Automation.AutoSubmit.status = "OFF";
            chrome.storage.sync.set({ "Automation": Automation });
            //
            $("#autoSubmitSelectMin").prop("disabled", true);
            $("#autoSubmitSelectSec").prop("disabled", true);
        }
    })
    // Select auto submit min and sec
    $(document).on("change", "#autoSubmitSelectMin", async () => {
        let min = $("#autoSubmitSelectMin option:selected").val();
        let sec = $("#autoSubmitSelectSec option:selected").val();
        let Automation = (await chrome.storage.sync.get(["Automation"])).Automation;
        let time = min * 60 + sec * 1;
        Automation.AutoSubmit.time = time;
        chrome.storage.sync.set({ "Automation": Automation });
    })
    //
    $(document).on("change", "#autoSubmitSelectSec", async () => {
        let min = $("#autoSubmitSelectMin option:selected").val();
        let sec = $("#autoSubmitSelectSec option:selected").val();
        let Automation = (await chrome.storage.sync.get(["Automation"])).Automation;
        let time = min * 60 + sec * 1;
        Automation.AutoSubmit.time = time;
        chrome.storage.sync.set({ "Automation": Automation });
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




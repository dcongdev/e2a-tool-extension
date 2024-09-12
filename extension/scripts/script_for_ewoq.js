/* Copyright (C) 2023 Duong Cong - All Rights Reserved
* Email: duongcong0412hc@gmail.com
*/

window.onload = () => {
    const extensionUrl = chrome.runtime.getURL("");
    console.log("Imported extension script!")

    var taskTitle = document.getElementsByClassName("taskTitle")[0];
    taskTitle.classList.add("notranslate")

    // Global variable
    var headerContainer = document.getElementsByClassName("dense-header")[0];
    var audioElement = document.createElement('audio');

    var isSubmitBtnEnabled = false;
    var timeCounterClockCounter = 0;
    var isStartNewTask = false;

    //
    var autoSubmitTime = 0;
    var isCancelAutoSubmit = false;

    //
    var autoReloadCounter = 0;
    var isAutoReloadCounting = false;
    var isCancelAutoReload = false;

    var isSentTaskVailableNoti = false;
    var isCancelTasksAvailableNoti = false;
    var isTasksAvailableNotiSoundPlaying = false;

    var currTaskType = null;

    // Worker
    var blob = new Blob(["setInterval(function() {postMessage('');}, 1000); "]);
    var counterWorker = new Worker(window.URL.createObjectURL(blob));

    var blob2 = new Blob(["setInterval(function() {postMessage('');}, 50); "]);
    var submitBtnWorker = new Worker(window.URL.createObjectURL(blob2));

    /********** FUCNTION **********/
    // Function convert time
    const convertTime = (second) => {
        if (second <= 0) { return "00:00"; }
        let time = "";
        let hour = parseInt(second / 3600);
        let min = parseInt((second % 3600) / 60);
        let sec = (second % 3600) % 60;
        if (hour > 0) { // Hour
            if (hour < 10 && hour >= 1) { time += "0" }
            time += hour + ":";
        }
        if (min < 10) { time += "0"; }// Minute
        time += min + ":";
        if (sec < 10) { time += "0"; }// Second
        time += sec;
        return time;
    }

    const getRandomNumber = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // =========== AUTO COUNT Submit button ===========
    // Check if submit button is enabled or not
    submitBtnWorker.onmessage = () => {
        let submitButton = document.getElementsByClassName("submitTaskButton")[0];
        if (submitButton != undefined) {
            if (!submitButton.classList.contains("is-disabled")) {
                isSubmitBtnEnabled = true;
                checkNewTaskType();
                submitButton.removeEventListener("click", submitButtonClick);
                submitButton.addEventListener("click", submitButtonClick);
            }
            else {
                isSubmitBtnEnabled = false;
            }
        }
        else {
            isSubmitBtnEnabled = false;
        }
    }

    // Submit button click event
    const submitButtonClick = () => {
        if (isSubmitBtnEnabled) {
            let submitData = { time: timeCounterClockCounter, taskType: currTaskType }
            chrome.runtime.sendMessage({ "submitted": submitData }, (response) => {
                // console.log(response)
                isStartNewTask = true;
                resetTimeCounterClockCounter();
            });
            //
            chrome.runtime.sendMessage({ "createNotiTaskIsSubmitted": true })
            // Play sound
            chrome.runtime.sendMessage({ "getNotiTaskIsSubmittedSound": true }, (res) => {
                if (res.status == "ON") {
                    let SoundURL = res.SoundURL;
                    let au = document.createElement('audio');
                    au.innerHTML = '<source src="' + SoundURL + '" type="audio/mpeg" />'
                    au.play();
                }
            })
        }
    }
    eventHandler = (e) => { if (e.keyCode == 13 && e.ctrlKey) { submitButtonClick() } }
    window.addEventListener('keydown', eventHandler, false);


    // =========== TASK TIME COUNTER ===========
    const createTimeCounterClockBox = () => {
        let timeCounterClockCounter = document.createElement("div");
        let taskTimeContent = '<div id="task-time" style="display:none;">'
            + '<img src="' + extensionUrl + 'assets/images/kisspng-clock.png" alt="" style="height: 20px;padding-right: 5px;margin-top: 2px;">'
            + '<p id="txt-task-time" style="margin: 0; display: inline;color: white;margin-top: 4px">0</p>'
            + '</div>';
        timeCounterClockCounter.innerHTML = taskTimeContent;
        headerContainer.appendChild(timeCounterClockCounter);
    }

    const showTimeCounterClockBox = () => {
        document.getElementById("txt-task-time").innerText = convertTime(timeCounterClockCounter);
        document.getElementById("task-time").style.display = "flex";

        // chrome.runtime.sendMessage({ "getAllSettings": true }, (res) => {
        //     // let autoReload = res.autoReload;
        //     // autoReloadCounter = autoReload.time;

        // })

    }

    const hideTimeCounterClock = () => {
        document.getElementById("task-time").style.display = "none";
    }

    const resetTimeCounterClockCounter = () => {
        isStartNewTask = true;
        isCancelAutoSubmit = false;
        timeCounterClockCounter = -1;
        // Reset auto submit time
        resetAutoSubmit();
    }


    //
    const resetTaskType = () => { currTaskType = null; }
    //
    const checkNewTaskType = () => { currTaskType = taskTitle.innerText; }


    // =========== AUTO SUBMIT COUNTER ===========
    const createAutoSubmitBox = () => {
        let autoSubmitBox = document.createElement("div");
        let autoSubmitBoxContent = '<div id="auto-submit-box" class="notranslate" style="display:none">'
            + '<p style="color: white;">'
            // + '<img src="' + extensionUrl + 'assets/images/reload-icon.png" alt="" style="height: 40px;"><br>'
            + 'Auto submit in <br> '
            + '<strong style="color: rgb(0, 217, 255);font-size: 15px;" id="txt-time-count-submit">0</strong></p>'
            + '<p type="button" style="cursor: pointer;" id="btn-cancel-auto-submit">CANCEL</p></div>';
        autoSubmitBox.innerHTML = autoSubmitBoxContent;
        headerContainer.appendChild(autoSubmitBox);
        let btn_cancel_auto_submit = document.getElementById("btn-cancel-auto-submit");
        btn_cancel_auto_submit.addEventListener("click", () => {
            isCancelAutoSubmit = true;
            hideAutoSubmitBox();
        })
    }

    const showAutoSubmitBox = (timeRemain) => {
        document.getElementById("txt-time-count-submit").innerText = convertTime(timeRemain);
        document.getElementById("auto-submit-box").style.display = "block";
    }

    const hideAutoSubmitBox = () => {
        document.getElementById("auto-submit-box").style.display = "none";
    }

    const resetAutoSubmit = () => { autoSubmitTime = 0; }

    // =========== AUTO RELOAD COUNTER ===========
    const createAutoReloadBox = () => {
        let autoReloadBox = document.createElement("div");
        let autoReloadBoxContent = '<div id="auto-reload-box" class="notranslate" style="display:none">'
            + '<div><p style="color: white;">'
            + '<img src="' + extensionUrl + 'assets/images/reload-icon.png" alt="" style="height: 40px;"><br>'
            + '<strong style="color: rgb(0, 217, 255);font-size: 20px;" id="txt-time-count-reload">0</strong></p>'
            + '</div><div><p type="button" style="cursor: pointer;" id="btn-cancel-auto-reload">CANCEL</p></div></div>';
        autoReloadBox.innerHTML = autoReloadBoxContent;
        headerContainer.appendChild(autoReloadBox);
        let btn_cancel_auto_reload = document.getElementById("btn-cancel-auto-reload");
        btn_cancel_auto_reload.addEventListener("click", () => {
            isCancelAutoReload = true;
            hideAutoReloadBox();
            resetAutoReloadCounter();
        })
    }

    const showAutoReloadBox = (timeRemain) => {
        document.getElementById("txt-time-count-reload").innerText = convertTime(timeRemain);
        document.getElementById("auto-reload-box").style.display = "block";
    }

    const hideAutoReloadBox = () => {
        document.getElementById("auto-reload-box").style.display = "none";
    }

    const resetAutoReloadCounter = () => {
        autoReloadCounter = -1;
    }

    // =========== TASK AVAILABLE NOTI ===========
    const createTaskAvailableNotiBox = () => {
        let notiBox = document.createElement("div");
        notiBox.innerHTML = '<div id="task-avail-noti-box" class="notranslate" style="display:none">'
            + '<div>'
            + '<p style="margin: 5px; display: inline;color: white; font-size: large;font-weight: 900;">Ting ting</p>'
            + '<br>'
            + '<br>'
            + '<p style="margin: 5px; display: inline;color: white;margin: 15px 0 10px 0;">There are tasks available!</p>'
            + '<br>'
            + '<img id="btn-close-task-noti" type="button" style="cursor: pointer;width: 50px;margin: 15px 0 10px 0;" src="' + extensionUrl + 'assets/images/cancel-icon-circle.png" alt="">'
            + '</div>'
            + '</div>';
        headerContainer.appendChild(notiBox);
        let btn_close_noti = document.getElementById("btn-close-task-noti");
        btn_close_noti.addEventListener("click", () => {
            isCancelTasksAvailableNoti = true;
            stopTasksAvailableNotiSound();
            hideTasksAvailableNotiBox();
        })

    }

    const showTasksAvailableNotiBox = () => {
        document.getElementById("task-avail-noti-box").style.display = "block";
    }

    const hideTasksAvailableNotiBox = () => {
        document.getElementById("task-avail-noti-box").style.display = "none";
    }

    const playTasksAvailableNotiSound = () => {
        if (isTasksAvailableNotiSoundPlaying == false) {
            chrome.runtime.sendMessage({ "getNotiTasksAvailableSound": true }, (res) => {
                let SoundURL = res.SoundURL;
                let loop = res.loop;
                audioElement.innerHTML = '<source src="' + SoundURL + '" type="audio/mpeg" />'
                audioElement.play().then(() => {
                    isTasksAvailableNotiSoundPlaying = true;
                    audioElement.loop = loop;
                })
            })
        }
    }

    const stopTasksAvailableNotiSound = () => {
        audioElement.pause();
        isTasksAvailableNotiSoundPlaying = false;
    }

    const sendMessToSystem = () => {
        chrome.runtime.sendMessage({ "createNotiTasksAvailable": true });
    }

    // Create
    createTimeCounterClockBox();
    createAutoSubmitBox();
    createAutoReloadBox();
    createTaskAvailableNotiBox();

    counterWorker.onmessage = async () => {
        let startButton = document.getElementsByClassName("start-button")[0];
        let requestAssignmentsButton = document.getElementsByClassName("request-assignments")[0];

        let continueButton = document.getElementsByClassName("continue-button")[0];
        let submitButton = document.getElementsByClassName("submitTaskButton")[0];
        let skipButton = document.getElementsByClassName("skip-button")[0];
        let takeABreakButton = document.getElementsByClassName("skip-and-take-a-break-button")[0];
        let finishButton = document.getElementsByClassName("finish-button")[0];

        // ======= EVENT =======
        if (startButton != null) { // startButton
            startButton.removeEventListener("click", resetTimeCounterClockCounter);
            startButton.addEventListener("click", resetTimeCounterClockCounter);
        }
        if (continueButton != null) { // continue button
            continueButton.removeEventListener("click", resetTimeCounterClockCounter);
            continueButton.addEventListener("click", resetTimeCounterClockCounter);
        }
        if (skipButton != null) { // continue button
            skipButton.removeEventListener("click", resetTimeCounterClockCounter);
            skipButton.addEventListener("click", resetTimeCounterClockCounter);
        }
        if (takeABreakButton != null) { // continue button
            takeABreakButton.removeEventListener("click", resetTimeCounterClockCounter);
            takeABreakButton.addEventListener("click", resetTimeCounterClockCounter);
        }
        if (finishButton != null) { // continue button
            finishButton.removeEventListener("click", resetTimeCounterClockCounter);
            finishButton.addEventListener("click", resetTimeCounterClockCounter);
        }


        let res = await chrome.runtime.sendMessage({ "getAllSettings": true })
        let extensionStatus = res.extensionStatus;
        //
        let Notifications = res.Notifications;
        let Sounds = res.Sounds;
        let Timing = res.Timing;
        let Automation = res.Automation;
        //
        let userStatus = res.userStatus;

        // Check permission
        if (userStatus.status != "ok") { return }

        // ============ WAITING ============
        // Start
        if (startButton != null) {
            // Hide and reset count time clock
            hideTimeCounterClock();
            resetTimeCounterClockCounter();

            // Hide and reset auto submit
            hideAutoSubmitBox();

            // Reset state
            isStartNewTask = true;
            isCancelAutoSubmit = false;

            resetTaskType();

            // Tasks Available
            // === Tasks Available notification
            if (startButton.classList.contains("enabled")) {
                // Hide and reset auto reload
                hideAutoReloadBox();
                resetAutoReloadCounter();
                if (isCancelTasksAvailableNoti == false) { // Check is canceled noti or not
                    // Create notification
                    if (isSentTaskVailableNoti == false) { // Checked "ON"/"OFF" in backgound script
                        sendMessToSystem();
                        isSentTaskVailableNoti = true;
                    }

                    // Play audio
                    if (Sounds.TasksAvailable.status == "ON") { playTasksAvailableNotiSound(); }
                    else { stopTasksAvailableNotiSound(); }

                    // Show noti box
                    if (Notifications.TasksAvailable == "ON" || Sounds.TasksAvailable.status == "ON") {
                        showTasksAvailableNotiBox();
                    }
                }
            }
            // No Tasks Available
            // === Auto Reload
            else {
                // Reset noti status
                isSentTaskVailableNoti = false;
                // Hide noti
                hideTasksAvailableNotiBox();
                // Stop audio
                stopTasksAvailableNotiSound();

                // Auto reload
                if (Automation.AutoReload.status == "OFF" || Automation.AutoReload.time <= 0 || isCancelAutoReload == true) { // Hide if status is "OFF"
                    hideAutoReloadBox();
                    resetAutoReloadCounter();
                }
                // If status is "ON"
                else if (isCancelAutoReload == false) { // Check cancel
                    // Reset counter If is not counting 
                    if (isAutoReloadCounting == false) { resetAutoReloadCounter(); }
                    // Countdown and show
                    autoReloadCounter += 1;
                    isAutoReloadCounting = true;
                    let timeAutoReload = Automation.AutoReload.time;
                    let timeRemain = timeAutoReload - autoReloadCounter;
                    showAutoReloadBox(timeRemain);
                    // Reload if 
                    if (timeRemain == 0) { window.location.reload(); }
                }

            }
            return
        }

        // Take A Break
        if (requestAssignmentsButton != null) {
            // Hide and reset count time clock
            hideTimeCounterClock();
            resetTimeCounterClockCounter();

            // Hide and reset auto submit
            hideAutoSubmitBox();

            // Hide Task Available notification
            // Hide noti
            hideTasksAvailableNotiBox();
            // Stop audio
            stopTasksAvailableNotiSound();

            // Hide and reset auto reload
            hideAutoReloadBox();
            resetAutoReloadCounter();

            // Reset state
            isStartNewTask = true;
            isCancelAutoSubmit = false;

            resetTaskType();

            return
        }


        // ============ IN TASK ============
        // Hide Task Available notification
        // Hide noti
        hideTasksAvailableNotiBox();
        // Stop audio
        stopTasksAvailableNotiSound();

        // Hide and reset auto reload
        hideAutoReloadBox();
        resetAutoReloadCounter();

        // Reset state
        isAutoReloadCounting = false;
        isCancelAutoReload = false;
        //
        isSentTaskVailableNoti = false;
        isCancelTasksAvailableNoti = false;
        isTasksAvailableNotiSoundPlaying = false;

        // ** Count time clock in Task, Instructions,...
        if (isStartNewTask == true) {
            resetTimeCounterClockCounter();
            isStartNewTask = false;
        }
        ++timeCounterClockCounter;

        // Show/hide count time clock
        if (Timing.TimeCounterClock == "ON" && finishButton == null) { showTimeCounterClockBox(); }
        else { hideTimeCounterClock(); }

        // ** Auto submit
        if (Automation.AutoSubmit.status == "OFF" || Automation.AutoSubmit.endTime <= 0 || finishButton != null || continueButton != null || isCancelAutoSubmit == true) { hideAutoSubmitBox() }
        // If status is "ON"
        else if (isCancelAutoSubmit == false && finishButton == null && continueButton == null) { // Check cancel
            if (autoSubmitTime == 0) {
                autoSubmitTime = getRandomNumber(Automation.AutoSubmit.startTime, Automation.AutoSubmit.endTime);
            }
            // console.log("In task - Auto submit: ON - " + timeCounterClockCounter)

            let timeRemain = autoSubmitTime - timeCounterClockCounter;
            // console.log(autoSubmitTime)
            // console.log(timeRemain)
            showAutoSubmitBox(timeRemain)
            if (timeRemain <= 0) {
                isCancelAutoSubmit = true;
                if (submitButton != null) { submitButton.click() }
                // document.getElementsByClassName("submitTaskButton")[0].click();
                hideAutoSubmitBox();
            }

        }

    }

};
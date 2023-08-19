window.onload = () => {
    const extensionUrl = chrome.runtime.getURL("");
    console.log("Imported extension script!")

    // Global variable
    var headerContainer = document.getElementsByClassName("dense-header")[0];
    var audioElement = document.createElement('audio');
    var isSubmitBtnEnabled = false;
    var taskTimeCounter = 0;
    var isStartNewTask = false;

    var autoReloadCounter = 0;
    var isAutoReloadCounting = false;
    var isCancelAutoReload = false;

    var isSendNotiToSystem = false;
    var isCancelNoti = false;
    var isNotiSoundPlaying = false;

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

    // =========== AUTO COUNT Submit button ===========
    // Check if submit button is enabled or not
    setInterval(() => {
        let submitButton = document.getElementsByClassName("submitTaskButton")[0];
        if (submitButton != undefined) {
            if (!submitButton.classList.contains("is-disabled")) {
                submitButton.removeEventListener("click", submitButtonClick);
                submitButton.addEventListener("click", submitButtonClick);
                isSubmitBtnEnabled = true;
            }
            else {
                isSubmitBtnEnabled = false;
            }
        }
        else {
            isSubmitBtnEnabled = false;
        }
    }, 100)

    // Submit button click event
    const submitButtonClick = () => {
        if (isSubmitBtnEnabled) {
            chrome.runtime.sendMessage({ "submitted": true }, (response) => {
                // console.log(response)
                isStartNewTask = true;
                resetTaskTimeCounter();
            })
        }
    }

    // =========== TASK TIME COUNTER ===========
    const createTaskTimeCounterBox = () => {
        let taskTimeCounter = document.createElement("div");
        let taskTimeContent = '<div id="task-time" style="display:none;left: ' + 45 + 'vw;">'
            + '<img src="' + extensionUrl + 'assets/images/kisspng-clock.png" alt="" style="height: 20px;padding-right: 5px;margin-top: 2px;">'
            + '<p id="txt-task-time" style="margin: 0; display: inline;color: white;">0</p>'
            + '</div>';
        taskTimeCounter.innerHTML = taskTimeContent;
        headerContainer.appendChild(taskTimeCounter);
    }

    const showTaskTimeCounterBox = () => {
        chrome.runtime.sendMessage({ "getAllSettings": true }, (res) => {
            let autoReload = res.autoReload;
            autoReloadCounter = autoReload.time;
            document.getElementById("txt-task-time").innerText = convertTime(taskTimeCounter);
            document.getElementById("task-time").style.display = "flex";
        })

    }

    const hideTaskTimeCounterBox = () => {
        document.getElementById("task-time").style.display = "none";
    }

    const resetTaskTimeCounter = () => {
        isStartNewTask = true;
        taskTimeCounter = 0;
    }

    // =========== AUTO RELOAD COUNTER ===========
    const createAutoReloadBox = () => {
        let autoReloadBox = document.createElement("div");
        let autoReloadBoxContent = '<div id="auto-reload-box" style="display:none">'
            + '<div><p style="color: white;">'
            + '<img src="./reload-icon.png" alt="" style="height: 40px;"><br>'
            + '<strong style="color: rgb(0, 217, 255);font-size: 20px;" id="txt-time-count-reload">0</strong></p>'
            + '</div><div><p type="button" id="btn-cancel-auto-reload">CANCEL</p></div></div>';
        autoReloadBox.innerHTML = autoReloadBoxContent;
        headerContainer.appendChild(autoReloadBox);
        let btn_cancel_auto_reload = document.getElementById("btn-cancel-auto-reload");
        btn_cancel_auto_reload.addEventListener("click", () => {
            isCancelAutoReload = true;
            hideAutoReloadBox();
            resetAutoReloadCounter();
        })
    }

    const showAutoReloadBox = () => {
        document.getElementById("txt-time-count-reload").innerText = convertTime(autoReloadCounter);
        document.getElementById("auto-reload-box").style.display = "block";
    }

    const hideAutoReloadBox = () => {
        document.getElementById("auto-reload-box").style.display = "none";
    }

    const resetAutoReloadCounter = () => {
        chrome.runtime.sendMessage({ "getAllSettings": true }, (res) => {
            let autoReload = res.autoReload;
            autoReloadCounter = autoReload.time;
        })
    }

    // =========== TASK AVAILABLE NOTI ===========
    const createTaskNotiBox = () => {
        let notiBox = document.createElement("div");
        notiBox.innerHTML = '<div id="task-avail-noti-box" style="display:none">'
            + '<div>'
            + '<p style="margin: 5px; display: inline;color: white; font-size: large;font-weight: 900;">Attention</p>'
            + '<br>'
            + '<p style="margin: 5px; display: inline;color: white;">Task available</p>'
            + '<br>'
            + '<img id="btn-close-task-noti" type="button" src="' + extensionUrl + 'assets/images/cancel-icon-circle.png" style="width: 50px" alt="">'
            + '<div><p style="margin: 0 0 10px 0; color: white; font-size: 12px;"></p></div>'
            + '</div>'
            + '</div>';
        headerContainer.appendChild(notiBox);
        let btn_close_noti = document.getElementById("btn-close-task-noti");
        btn_close_noti.addEventListener("click", () => {
            isCancelNoti = true;
            stopNotiSound();
            hideTaskNotiBox();
        })


    }

    const showTaskNotiBox = () => {
        document.getElementById("task-avail-noti-box").style.display = "block";
    }

    const hideTaskNotiBox = () => {
        document.getElementById("task-avail-noti-box").style.display = "none";
    }

    const playNotiSound = () => {
        if (isNotiSoundPlaying == false) {
            chrome.runtime.sendMessage({ "getNotiSound": null }, (res) => {
                let soundURL = res.soundURL;
                let isLoop = res.loop;
                audioElement.innerHTML = '<source src="' + soundURL + '" type="audio/mpeg" />'
                audioElement.play().then(() => {
                    isNotiSoundPlaying = true;
                    audioElement.loop = isLoop;
                })
            })
        }
    }

    const stopNotiSound = () => {
        audioElement.pause();
        isNotiSoundPlaying = false;
    }

    const sendMessToSystem = () => {
        chrome.runtime.sendMessage({ "createSystemNotiTask": true })
    }

    createAutoReloadBox();
    createTaskNotiBox();
    createTaskTimeCounterBox();

    setInterval(() => {

        let startButton = document.getElementsByClassName("start-button")[0];
        let requestAssignmentsButton = document.getElementsByClassName("request-assignments")[0];

        let continueButton = document.getElementsByClassName("continue-button")[0];
        let submitButton = document.getElementsByClassName("submitTaskButton")[0];
        let skipButton = document.getElementsByClassName("cancel-button")[0];
        let takeABreakButton = document.getElementsByClassName("skip-and-take-a-break-button")[0];
        let finishButton = document.getElementsByClassName("finish-button")[0];

        // ======= EVENT =======
        if (startButton != null) { // startButton
            startButton.removeEventListener("click", resetTaskTimeCounter);
            startButton.addEventListener("click", resetTaskTimeCounter);
        }
        if (continueButton != null) { // continue button
            continueButton.removeEventListener("click", resetTaskTimeCounter);
            continueButton.addEventListener("click", resetTaskTimeCounter);
        }
        if (skipButton != null) { // continue button
            skipButton.removeEventListener("click", resetTaskTimeCounter);
            skipButton.addEventListener("click", resetTaskTimeCounter);
        }
        if (takeABreakButton != null) { // continue button
            takeABreakButton.removeEventListener("click", resetTaskTimeCounter);
            takeABreakButton.addEventListener("click", resetTaskTimeCounter);
        }
        if (finishButton != null) { // continue button
            finishButton.removeEventListener("click", resetTaskTimeCounter);
            finishButton.addEventListener("click", resetTaskTimeCounter);
        }


        // ===== WAITING =====
        if (startButton != null || requestAssignmentsButton != null) {
            // Hide and reset task time counter
            hideTaskTimeCounterBox();
            resetTaskTimeCounter();

            chrome.runtime.sendMessage({ "getAllSettings": true }, (res) => {
                let autoReload = res.autoReload;
                let taskAvailNoti = res.taskAvailNoti;
                // 
                if (startButton != null) {
                    if (startButton.classList.contains("enabled")) {
                        // Stop auto reload counter
                        hideAutoReloadBox();
                        // Show notification
                        if (isCancelNoti == false) {
                            showTaskNotiBox();
                            if (taskAvailNoti.status == "ON") {
                                if (isCancelNoti == false) {
                                    // System noti
                                    if (taskAvailNoti.systemNoti.status == "ON" && isSendNotiToSystem == false) {
                                        sendMessToSystem();
                                        isSendNotiToSystem = true;
                                    }
                                    // Play audio
                                    if (taskAvailNoti.notiSound.status == "ON") {
                                        playNotiSound();
                                    } else { stopNotiSound(); }
                                }
                            }
                            else {
                                // Hide noti
                                hideTaskNotiBox();
                                // Stop audio
                                stopNotiSound();
                            }
                        }
                    } else {
                        isSendNotiToSystem = true;
                        // Stop audio
                        stopNotiSound();
                        // Hide noti
                        hideTaskNotiBox();
                        // Show auto reload
                        if (autoReload.status == "OFF") { return; }
                        if (isCancelAutoReload == true) { return; }
                        if (isAutoReloadCounting == false) {
                            resetAutoReloadCounter();
                        }
                        autoReloadCounter -= 1;
                        if (autoReloadCounter == 0) { window.location.reload(); }
                        isAutoReloadCounting = true;
                        showAutoReloadBox();
                    }
                } else if (requestAssignmentsButton != null) {
                    // Stop auto reload
                    hideAutoReloadBox();
                }
            })
        }
        // ===== IN TASK =====
        else {
            // Hide noti
            hideTaskNotiBox();
            stopNotiSound();
            // Noti
            isCancelNoti = false;
            isSendNotiToSystem = false;
            // Stop auto reload
            hideAutoReloadBox();
            isAutoReloadCounting = false;
            //
            chrome.runtime.sendMessage({ "getAllSettings": true }, (res) => {
                let countTimeInTask = res.countTimeInTask
                if (countTimeInTask == "ON") {
                    // Reset counter
                    if (isStartNewTask == true) {
                        resetTaskTimeCounter();
                        isStartNewTask = false;
                    }
                    // Show time counter
                    showTaskTimeCounterBox();
                    taskTimeCounter += 1;
                    // 
                }
                else {
                    hideTaskTimeCounterBox();
                    resetTaskTimeCounter();
                }
            })
        }

    }, 1000);
};
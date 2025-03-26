// Global variable
const extensionUrl = chrome.runtime.getURL("");

window.addEventListener("load", async () => {
    var counter = -1; // Only increase when counting reload, in task
    var audioElement = document.createElement('audio');
    //
    var alertTaskStatus = {
        isSentNotification: false,
        isAudioPlaying: false,
        isSoundAlertCanceled: false
    }

    // Worker
    var counterBlob = new Blob(["setInterval(function() {postMessage('');}, 1000); "]);
    var counterWorker = new Worker(window.URL.createObjectURL(counterBlob));

    var checkUserBlob = new Blob(["setInterval(function() {postMessage('');}, 1800000); "]);
    var checkUserWorker = new Worker(window.URL.createObjectURL(checkUserBlob));

    // Check user status lần đầu và sau mỗi 30p
    var userStatus = await sendMessageToBackground({ action: "checkUserStatus" })
    checkUserWorker.onmessage = async () => {
        userStatus = await sendMessageToBackground({ action: "checkUserStatus" })
        // console.log("CHECK - " + userStatus)
    }

    // Get settings and when change
    var settings = await sendMessageToBackground({ action: "getSettings", storage: "sync" });
    var { statistics, notifications, sounds, timing, automation } = settings;

    // Update setting on change
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
        if (areaName == "sync") { // On change settings
            if (changes.statistics) statistics = changes.statistics.newValue;
            if (changes.notifications) notifications = changes.notifications.newValue;
            if (changes.sounds) sounds = changes.sounds.newValue;
            if (changes.timing) timing = changes.timing.newValue;
            if (changes.automation) automation = changes.automation.newValue;
        }
    });


    /* =================== FUNCTION ========================= */
    const getRandomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };


    /* =================== Play sound ========================= */
    const playSound = async (url, volume = 1, loop = false, onendedCallback = null) => {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.src = url;
        audioElement.volume = volume;
        audioElement.loop = loop;
        //
        try { await audioElement.play(); }
        catch { console.log("ERROR PLAY AUDIO!") }
        //
        if (typeof onendedCallback === "function") {
            audioElement.onended = onendedCallback;
        }
    };

    // Stop
    const stopSound = () => { audioElement.pause(); }


    /* =================== Reset ========================= */
    const resetStatus = () => {
        counter = -1;
        autoSubmitStatus = { time: null, isCanceled: false };
        hideTimeCounterBox();
        hideAutoSubmitBox();

    }
    //
    const resetAlertStatus = () => {
        stopSound();
        hideAlertTaskBox();
        alertTaskStatus = {
            isSentNotification: false,
            isAudioPlaying: false,
            isSoundAlertCanceled: false
        }
    }

    /* ========================= COUNTER ========================= */
    counterWorker.onmessage = async () => {
        if (userStatus == false) { return } // Check user status
        // Home page
        if (currentPage === "home") {
            const { startButton } = buttonStatus;
            const { status, time } = automation.autoReload;
            const { tasksAvailable } = sounds;
            // Task available
            if (startButton === "enabled") {
                // console.log("Có task");

                // Play sound
                if (tasksAvailable.status == "ON" && !alertTaskStatus.isAudioPlaying && !alertTaskStatus.isSoundAlertCanceled) {
                    let url = (tasksAvailable.custom == "ON") ? tasksAvailable.customUrl : (
                        `${extensionUrl}assets/sounds/${tasksAvailable.fileName}`
                    )
                    playSound(url, tasksAvailable.volume, tasksAvailable.loop, hideAlertTaskBox);
                    alertTaskStatus.isAudioPlaying = true;
                    // Show alert
                    showAlertTaskBox();
                }

                // Send notification
                if (notifications.tasksAvailable == "ON" && !alertTaskStatus.isSentNotification) {
                    sendMessageToBackground({ action: "send notification", title: "Hey!", message: "There are some tasks available!" })
                    alertTaskStatus.isSentNotification = true;
                }
            }
            else { resetAlertStatus(); }// Hide alert

            // Auto reload
            if (startButton === "disabled" && status === "ON") {
                counter++;
                showAutoReloadBox(time - counter); // Show reload
                if (counter == time) window.location.reload(); // Reload
            }
            else { hideAutoReloadBox(); };
            //
            return
        }
        else { resetAlertStatus(); }

        // Instruction, In task show clock
        if (currentPage === "instruction" || currentPage === "in task") {
            counter++;
            //
            if (timing.timeCounterClock.status == "ON") {
                showTimeCounterBox(timing.timeCounterClock.position, currentPage, counter);
            } else { hideTimeCounterBox(); }
            //
        }

        // Auto submit
        if (currentPage === "in task") {
            let { status, min, max, custom } = automation.autoSubmit; // Settings
            // Auto submit
            if (status == "ON" && !autoSubmitStatus.isCanceled) {
                if (autoSubmitStatus.time == null) {
                    let customSetting = custom.find(x => x.name == taskTitle);
                    let minSecs = (customSetting) ? customSetting.min : min;
                    let maxSecs = (customSetting) ? customSetting.max : max;
                    //
                    autoSubmitStatus.time = getRandomInt(parseInt(minSecs), parseInt(maxSecs));
                }
                if (counter <= autoSubmitStatus.time) {
                    showAutoSubmitBox(autoSubmitStatus.time - counter); // Show
                    // Submit
                    if (counter == autoSubmitStatus.time) {
                        let submitButton = document.querySelector(".submitTaskButton")
                        if (submitButton && buttonStatus.submitButton == "enabled") { submitButton.click() }; // Trigger
                    }
                } else { hideAutoSubmitBox() }
            }
            else { hideAutoSubmitBox() }

        }
    }


    /* ========================= BUTTON CLICK EVENT ========================= */
    document.body.addEventListener("click", (event) => {
        if (userStatus == false) { return } // Check user status
        if (!event.target) { return } // 
        let classList = event.target.classList

        /* ================= Home ================= */
        // Start Button
        let startButton = event.target.closest(".start-button");
        if (startButton && buttonStatus.startButton == "enabled") {
            // console.log("Start");
            resetAlertStatus();
            resetStatus();
        }

        // Request Button
        let requestButton = event.target.closest(".request-assignments");
        if (requestButton) {
            resetAlertStatus();
            resetStatus();
        }

        // Alert
        let alertTaskBox = event.target.closest("#alertTaskBox");
        if (alertTaskBox) {
            alertTaskStatus.isSoundAlertCanceled = true
            stopSound();
            alertTaskBox.remove();
        }


        /* ================= In Task ================= */
        // Submit Button
        let submitButton = event.target.closest(".submit-button");
        if (submitButton && buttonStatus.submitButton == "enabled") {
            // console.log("submitted");
            if (statistics.record == "ON") {
                let taskData = { name: taskTitle, time: counter };
                sendMessageToBackground({ action: "submit", data: taskData });
            }
            resetStatus();
            resetAlertStatus();

            // Play sound
            const { taskIsSubmitted } = sounds;
            if (taskIsSubmitted.status == "ON") {
                let url = (taskIsSubmitted.custom == "ON") ? taskIsSubmitted.customUrl : (
                    `${extensionUrl}assets/sounds/tick/${taskIsSubmitted.fileName}`
                )
                playSound(url, taskIsSubmitted.volume, false, null);
                // console.log(url)
            }

            // Send notification
            if (notifications.taskIsSubmitted == "ON") {
                sendMessageToBackground({ action: "send notification", title: "Task submitted!", message: "Name: " + taskTitle })
            }

        }

        // Continue Button
        let continueButton = event.target.closest(".continue-button");
        if (continueButton) {
            resetStatus();
            resetAlertStatus();
        }

        // Skip Button
        let skipButton = event.target.closest(".skip-button");
        if (skipButton) {
            resetStatus();
            resetAlertStatus();
        }

        // Skip And Take A Break Button
        let skipAndTakeButton = event.target.closest(".skip-and-take-a-break-button");
        if (skipAndTakeButton) {
            resetStatus();
            resetAlertStatus();
        }

        // Take A Break Button
        let takeABreakButton = event.target.closest(".take-a-break-button");
        if (takeABreakButton) {
            resetStatus();
            resetAlertStatus();
        }

    })


})

// Global variable
var currentPage = "home"; // home, instruction, in task
var buttonStatus = { startButton: null, submitButton: null }
var taskTitle = "EWOQ";


var autoSubmitStatus = { time: null, isCanceled: false }

// ================== ON LOAD ===================
window.addEventListener("load", () => {

    var taskTitleElm = document.querySelector(".taskTitle");
    taskTitleElm.classList.add("notranslate")
    taskTitle = taskTitleElm.innerText;

    // ======== Observe task title change ========
    const observeTextChange = (targetNode) => {
        new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "characterData") {
                    taskTitle = mutation.target.data;
                }
            });
        }).observe(targetNode.firstChild, { characterData: true });
    }
    observeTextChange(taskTitleElm)
    // ======== Observe task title change ========


    /* ================= OBSERVE ================= */
    // ==== Observe button change ======
    // Check class enabled, is-disabled
    const checkButtonClass = (button, stateVariable) => {
        if (!button) { return }
        setTimeout(() => {
            buttonStatus[stateVariable] = button.classList.contains("is-disabled") ? "disabled" : "enabled";
        }, 200);
    }

    // Observe class change enabled, is-disabled
    const observeClassChange = (button, stateVariable) => {
        if (!button) return;
        //
        if (button.dataset.observed == true) { return }
        button.dataset.observed = true
        //
        let observer = new MutationObserver(() => checkButtonClass(button, stateVariable));
        observer.observe(button, { attributes: true, attributeFilter: ["class"] });
    };

    // --> Check button
    const checkButton = (container) => {
        if (container.matches("start-task-panel")) {
            currentPage = "home";
            let startButton = container.querySelector(".start-button");
            // Check start button
            if (startButton) {
                // observe class change 
                observeClassChange(startButton, "startButton")
                // Check class enabled/disabled
                checkButtonClass(startButton, "startButton")
            }
            else { buttonStatus.startButton = null }
        }
        else { buttonStatus.startButton = null; }
        //
        if (container.matches("task-footer")) {
            currentPage = "in task";
            let submitButton = container.querySelector(".submitTaskButton");
            let continueButton = container.querySelector(".continue-button");
            // Check start button
            if (continueButton) { currentPage = "instruction"; }
            else if (submitButton) {
                // observe class change 
                observeClassChange(submitButton, "submitButton")
                // Check class enabled/disabled
                checkButtonClass(submitButton, "submitButton")
            }
            else {
                buttonStatus.submitButton = null
            }
        }
        else { buttonStatus.submitButton = null; }
    }

    // --> Observe button change in section: rating home, task
    const observeButtonChange = (container, matchString, callback) => {
        if (container.dataset.observed == true) { return }
        container.dataset.observed = true
        //
        new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.matches(matchString)) {
                        callback(container)
                    }
                });
            });
        }).observe(container, { childList: true, subtree: true });
    }

    // ==> Check page change in section: rating home, task
    const checkPage = (node) => {
        if (!node.nodeType === 1) { return }
        // If page is home: check div and get button change in start panel
        if (node.matches("rating-home")) {
            // console.log("Home")
            let startPanel = node.querySelector('start-task-panel');
            checkButton(startPanel)
            observeButtonChange(startPanel, "div", checkButton)
        }
        // If page is "task": check and get button change in task footer
        if (node.matches("task")) {
            // console.log("In task")
            let taskFooter = node.querySelector('task-footer');
            checkButton(taskFooter)
            observeButtonChange(taskFooter, "div", checkButton)
        }

    }

    // ==>  Observe page change in section: rating home, task
    const observeSectionChange = () => {
        new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.matches('rating-home, task')) {
                        checkPage(node)
                    }
                });
            });
        }).observe(document.querySelector("section"), { childList: true, subtree: true });
    }
    //
    observeSectionChange()

    // Check on load
    document.querySelectorAll('rating-home, task').forEach(checkPage);
    /* ================= OBSERVE ================= */


});
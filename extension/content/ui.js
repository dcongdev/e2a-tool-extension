const convertTime = (second) => {
    if (second <= 0) return "00:00";

    let hour = Math.floor(second / 3600);
    let min = Math.floor((second % 3600) / 60);
    let sec = second % 60;

    return (hour ? `${hour}:${String(min).padStart(2, "0")}` : `${String(min).padStart(2, "0")}`)
        + `:${String(sec).padStart(2, "0")}`;
};


/* =================== Alert task ========================= */
const showAlertTaskBox = () => {
    let alertTaskBox = document.getElementById("alertTaskBox");
    if (!alertTaskBox) {
        alertTaskBox = document.createElement("div");
        alertTaskBox.id = "alertTaskBox";
        alertTaskBox.style.display = "flex";
        alertTaskBox.style.alignItems = "center";
        alertTaskBox.style.gap = "8px";
        alertTaskBox.style.padding = "5px";
        alertTaskBox.style.marginLeft = "10px";
        alertTaskBox.style.backgroundColor = "rgb(38, 64, 73)";
        alertTaskBox.style.borderRadius = "8px";
        alertTaskBox.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.2)";
        alertTaskBox.style.width = "auto";
        // Img
        let img = document.createElement("img");
        img.src = `${extensionUrl}assets/images/bell.png`;
        img.style.cssText = "height: 30px;"
        // Dấu X
        let cancelButton = document.createElement("span");
        cancelButton.id = "cancelAlertBtn"
        cancelButton.innerHTML = "&#10006;";
        cancelButton.style.cssText = "font-size: 20px; color: red;cursor: pointer;transition: 0.2s"
        //
        alertTaskBox.appendChild(img)
        alertTaskBox.appendChild(cancelButton);
        //

        let page_name = document.querySelector(".page-name");
        if (page_name) { page_name.insertAdjacentElement("afterend", alertTaskBox); }
        //
    }


}
// Hide
const hideAlertTaskBox = () => {
    let alertTaskBox = document.getElementById("alertTaskBox");
    if (alertTaskBox) { alertTaskBox.remove() }
}

/* =================== Auto Reload ========================= */
const showAutoReloadBox = (time) => {
    let autoReloadBox = document.getElementById("autoReloadBox");
    if (!autoReloadBox) {
        autoReloadBox = document.createElement("div");
        autoReloadBox.id = "autoReloadBox";
        let img = document.createElement("img");
        img.src = `${extensionUrl}assets/images/reload-icon.png`;
        img.style.cssText = "height: 30px;"

        // Tạo hộp chứa đồng hồ
        autoReloadBox.style.display = "flex";
        autoReloadBox.style.alignItems = "center";
        autoReloadBox.style.gap = "8px";
        autoReloadBox.style.padding = "5px";
        autoReloadBox.style.marginLeft = "10px";
        autoReloadBox.style.backgroundColor = "rgb(38, 64, 73)";
        autoReloadBox.style.borderRadius = "8px";
        autoReloadBox.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.2)";
        autoReloadBox.style.width = "auto";

        let clockBox = document.createElement("div");
        clockBox.style.width = "80px";
        clockBox.style.height = "30px";
        clockBox.style.border = "2px solid black";
        clockBox.style.borderRadius = "8px";
        clockBox.style.display = "flex";
        clockBox.style.alignItems = "center";
        clockBox.style.justifyContent = "center";
        clockBox.style.fontFamily = "monospace";
        clockBox.style.fontSize = "25px";
        clockBox.style.color = "white";
        clockBox.style.backgroundColor = "rgb(38, 64, 73)";

        //
        autoReloadBox.appendChild(img)
        autoReloadBox.appendChild(clockBox);

        let page_name = document.querySelector(".page-name");
        if (page_name) { page_name.insertAdjacentElement("afterend", autoReloadBox); }
    }

    //
    // autoReloadBox.style.display = "flex";
    autoReloadBox.querySelector("div").textContent = convertTime(time);
}
// Hide
const hideAutoReloadBox = () => {
    let autoReloadBox = document.getElementById("autoReloadBox");
    if (autoReloadBox) { autoReloadBox.remove() }
}


/* =================== Time Counter ========================= */
const showTimeCounterBox = (position, page, time) => {
    let timeCounterBox = document.getElementById("timeCounterBox");
    // Create
    if (!timeCounterBox && (position == "all" || position == "in task")) {
        timeCounterBox = document.createElement("div");
        timeCounterBox.id = "timeCounterBox";
        // Container
        timeCounterBox.style.display = "flex";
        timeCounterBox.style.alignItems = "center";
        timeCounterBox.style.gap = "8px";
        timeCounterBox.style.padding = "5px";
        timeCounterBox.style.margin = "0px 0px 0px 24px";
        timeCounterBox.style.backgroundColor = "rgb(38, 64, 73)";
        timeCounterBox.style.borderRadius = "8px";
        timeCounterBox.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.2)";
        timeCounterBox.style.width = "auto";
        //
        let img = document.createElement("img");
        img.src = `${extensionUrl}assets/images/kisspng-clock.png`;
        img.style.cssText = "height: 30px;"
        //
        let clockBox = document.createElement("div");
        clockBox.style.width = "80px";
        clockBox.style.height = "30px";
        clockBox.style.border = "2px solid black";
        clockBox.style.borderRadius = "8px";
        clockBox.style.display = "flex";
        clockBox.style.alignItems = "center";
        clockBox.style.justifyContent = "center";
        clockBox.style.fontFamily = "monospace";
        clockBox.style.fontSize = "25px";
        clockBox.style.color = "white";
        clockBox.style.backgroundColor = "rgb(38, 64, 73)";
        //
        timeCounterBox.appendChild(img)
        timeCounterBox.appendChild(clockBox);

        // Append
        if (page === "instruction") {
            let before_task_banner = document.querySelector(".continue-button-container");
            if (before_task_banner) { before_task_banner.prepend(timeCounterBox); }
        }
        else if (page === "in task") {
            let topBanner = document.querySelector(".in-task-top-banner")
            if (topBanner) { topBanner.prepend(timeCounterBox) }
        }
    }



    // Show/hide
    if (position == "all" || position == "in task") {
        timeCounterBox.querySelector("div").textContent = convertTime(time);
    }
    else { timeCounterBox.remove() };

    // Web title
    if (position == "all" || position == "website title") {
        document.title = `${convertTime(time)} - Ewoq Rating Portal`
    }
    else { document.title = "Ewoq Rating Portal"; }


}

const hideTimeCounterBox = () => {
    let timeCounterBox = document.getElementById("timeCounterBox");
    if (timeCounterBox) {
        document.title = "Ewoq Rating Portal";
        timeCounterBox.remove()
    }
}


/* =================== Auto submit ========================= */
const showAutoSubmitBox = (time) => {
    let autoSubmitBox = document.getElementById("autoSubmitBox");
    // Create
    if (!autoSubmitBox) {
        autoSubmitBox = document.createElement("div");
        autoSubmitBox.id = "autoSubmitBox";
        // Tạo hộp chứa đồng hồ và nút hủy
        autoSubmitBox.style.display = "flex";
        autoSubmitBox.style.alignItems = "center";
        autoSubmitBox.style.gap = "8px";
        autoSubmitBox.style.padding = "5px";
        autoSubmitBox.style.backgroundColor = "rgb(38, 64, 73)";
        autoSubmitBox.style.borderRadius = "8px";
        autoSubmitBox.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.2)";
        autoSubmitBox.style.width = "auto";
        // Img
        let img = document.createElement("img");
        img.src = `${extensionUrl}assets/images/click.png`;
        img.style.cssText = "height: 30px;"
        //
        let clockBox = document.createElement("div");
        clockBox.style.width = "80px";
        clockBox.style.height = "30px";
        clockBox.style.border = "2px solid black";
        clockBox.style.borderRadius = "8px";
        clockBox.style.display = "flex";
        clockBox.style.alignItems = "center";
        clockBox.style.justifyContent = "center";
        clockBox.style.fontFamily = "monospace";
        clockBox.style.fontSize = "25px";
        clockBox.style.color = "white";
        clockBox.style.backgroundColor = "rgb(38, 64, 73)";
        // Dấu X
        let cancelButton = document.createElement("span");
        cancelButton.id = "cancelAutoSubmitBtn"
        cancelButton.innerHTML = "&#10006;";
        cancelButton.style.cssText = "font-size: 20px; color: red;cursor: pointer;transition: 0.2s"
        //
        autoSubmitBox.appendChild(img)
        autoSubmitBox.appendChild(clockBox);
        autoSubmitBox.appendChild(cancelButton);
        //
        let submitButton = document.querySelector(".submitTaskButton");
        if (submitButton) {
            submitButton.insertAdjacentElement("afterend", autoSubmitBox);
        }
    }
    // Update time
    autoSubmitBox.querySelector("div").textContent = convertTime(time);
}

const hideAutoSubmitBox = () => {
    let autoSubmitBox = document.getElementById("autoSubmitBox");
    if (autoSubmitBox) { autoSubmitBox.remove(); }
}
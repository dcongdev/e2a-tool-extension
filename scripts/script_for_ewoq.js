window.onload = () => {
    console.log("Imported extension script")

    var headerContainer = document.getElementsByClassName("dense-header")[0];
    var isSubmitBtnEnabled = false;


    // ======= Auto count Submit button =======
    // Check if submit button is enabled or not
    setInterval(() => {
        let btnSubmit = document.getElementsByClassName("submitTaskButton")[0];
        if (btnSubmit != null) {
            if (!btnSubmit.classList.contains("is-disabled")) {
                isSubmitBtnEnabled = true;
            }
            else {
                isSubmitBtnEnabled = false;
            }
        }
        else {
            isSubmitBtnEnabled = false;
        }
    }, 20)

    // Submit button click event
    const submitButtonClick = () => {
        if (isSubmitBtnEnabled) {
            chrome.runtime.sendMessage({ "submited": true }, (response) => {
                console.log(response)
            })
        }
    }


    // Set click listener for submit button
    const setClickListener = () => {
        let submitButton = document.getElementsByClassName("submitTaskButton")[0];
        if (submitButton != undefined) {
            submitButton.removeEventListener("click", submitButtonClick);
            submitButton.addEventListener("click", submitButtonClick);
        }

    }
    //
    setInterval(setClickListener, 2000);

};
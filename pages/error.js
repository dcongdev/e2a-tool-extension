import { checkUserAndTask } from "../background/ui.js";
window.onload = async () => {
    
    let status = (await checkUserAndTask())
    // console.log(status)
    if (status) { window.close(); }
}
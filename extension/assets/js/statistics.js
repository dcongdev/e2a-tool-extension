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

    var DateTime = luxon.DateTime;
    // Function convert time
    const convertTime = (second) => {
        if (second <= 0) {
            return "00:00";
        }
        let time = "";
        let hour = parseInt(second / 3600);
        let min = parseInt((second % 3600) / 60);
        let sec = (second % 3600) % 60;
        // if (hour > 0) { // Hour
        //     if (hour < 10 && hour >= 1) { time += "0" }
        //     time += hour + ":";
        // }
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
    //
    var timezone = (await chrome.storage.sync.get(["DateTime"])).DateTime.Timezone;
    if (timezone == "default") { timezone = DateTime.local().zoneName; }
    //
    var currentTime = DateTime.utc().setZone(timezone);
    // var currentTime = DateTime.fromISO("2023-03-14").setZone(timezone);
    //
    var submitHistory = [];
    var weekList = [];
    var monthList = [];
    var yearList = [];
    var startHis = null;
    var endHis = null;
    // Day
    var dayChartByType = null;
    var dataTableDay = null;
    // Week
    var weekChartByTasks = null;
    var weekChartByTime = null;
    var weekChartByType = null;
    // Month
    var monthChartByTasks = null;
    var monthChartByTime = null;
    // Show timezone
    var txtRealTime = document.getElementById("txt-real-time");
    let timeStr = currentTime.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS);
    // txtRealTime.innerText = timeStr;
    let txtTimezone = document.getElementById("txtTimezone")
    // txtTimezone.innerText = "Statistics by " + timezone;

    // Update real time clock
    var blob = new Blob(["setInterval(function() {postMessage('');}, 1000); "]);
    var counterWorker = new Worker(window.URL.createObjectURL(blob));
    counterWorker.onmessage = () => {
        let time = DateTime.utc().setZone(timezone);
        let a = time.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS);
        txtRealTime.innerText = a;
        // console.log(currentTime.toISO)
    };

    /* ======= GET DATA ======= */
    const getSubmitHistory = async () => {
        submitHistory = (await chrome.storage.local.get(["submitHistory"])).submitHistory;
        // console.log(submitHistory)
        //
        if(submitHistory == []) {return}
        if(submitHistory == null) {return}
        if (submitHistory.length == 0) {return}
        //
        startHis = DateTime.fromISO(submitHistory[0].datetime).setZone(timezone);
        endHis = DateTime.fromISO(
            submitHistory[submitHistory.length - 1].datetime
        ).setZone(timezone);
        // console.log(startHis.toISO())
        // console.log(endHis.toISO())

        for (let i = startHis.year; i <= endHis.year; i++) {
            // push list year
            yearList.push(i);
            let startMonth = 1; // Init start month
            let endMonth = 12; // Init end month
            //
            let startWeek = 1; // Init start week
            let endWeek = parseInt(DateTime.fromISO(i + "-12-28").toFormat("WW"));
            // If year = start year
            if (i == startHis.year) {
                startWeek = startHis.weekNumber;
                startMonth = startHis.month;
            }
            // If year = end year
            if (i == endHis.year) {
                endMonth = endHis.month;
                endWeek = endHis.weekNumber;
            }

            // Set list weeks of year
            let weeks = [];
            for (let k = startWeek; k <= endWeek; k++) {
                weeks.push(k);
            }
            weekList.push({ year: i, week: weeks });

            // Set list month of year
            let months = [];
            for (let k = startMonth; k <= endMonth; k++) {
                months.push(k);
            }
            monthList.push({ year: i, month: months });
        }

        // console.log("YEAR list ====")
        // console.log(yearList)
        // console.log("WEEK list ====")
        // console.log(weekList)
        // console.log("MONTH list ====")
        // console.log(monthList)
    };

    /* ======= SHOW CHART ======= */
    // DAY
    const getDataByDay = (date) => {
        let dataByDay = {
            date: date,
            totalTasks: 0,
            totalTime: 0,
            data: { taskType: [], tasks: [], time: [] },
            dataByTaskType: [],
        };
        //
        let totalTasks = 0;
        let totalTime = 0;
        let dataByTaskType = [];

        // Get data
        for (let i = 0; i < submitHistory.length; i++) {
            let taskDate = DateTime.fromISO(submitHistory[i].datetime).setZone(
                timezone
            );
            // console.log(taskDate.toISODate())

            if (taskDate.toISODate() == date) {
                totalTasks += 1;
                totalTime += submitHistory[i].time;
                //
                let idx = dataByTaskType.findIndex(
                    (e) => e.taskType == submitHistory[i].taskType
                );
                if (idx == -1) {
                    dataByTaskType.push({
                        taskType: submitHistory[i].taskType,
                        tasks: 0,
                        time: 0,
                    });
                    idx = dataByTaskType.length - 1;
                }
                // Total tasks and time work
                dataByTaskType[idx].tasks += 1;
                dataByTaskType[idx].time += submitHistory[i].time;
            }
        }
        //
        dataByDay.totalTasks = totalTasks;
        dataByDay.totalTime = totalTime;
        dataByDay.dataByTaskType = dataByTaskType;
        //
        for (let i = 0; i < dataByTaskType.length; i++) {
            dataByDay.data.taskType.push(dataByTaskType[i].taskType);
            dataByDay.data.tasks.push(dataByTaskType[i].tasks);
            dataByDay.data.time.push(Math.round(dataByTaskType[i].time / 60));
        }
        // console.log(dataByDay)
        return dataByDay;
    };
    //

    const showDatePicker = () => {
        let datepicker = $("#date-picker");
        let currentDate = currentTime.toISODate();
        let startHistDate = startHis.toISODate();
        let endHistDate = endHis.toISODate();
        if (currentTime > endHis) {
            endHistDate = currentTime.toISODate();
        }
        datepicker.val(currentDate);
        datepicker.attr({ min: startHistDate });
        datepicker.attr({ max: endHistDate });
    };
    //

    const showDayTable = (d) => {
        let data = getDataByDay(d).dataByTaskType;
        // data = await data.sort((a,b) => b.tasks - a.tasks);
        let tableContent = "";
        for (let i = 0; i < data.length; i++) {
            tableContent +=
                "<tr>" +
                "<td>" +
                data[i].taskType +
                "</td>" +
                "<td>" +
                data[i].tasks +
                "</td>" +
                "<td>" +
                convertTime(data[i].time) +
                "</td>" +
                "<td>" +
                Math.round(3600 / (data[i].time / data[i].tasks)) +
                "</td>" +
                "<td>" +
                Math.round(data[i].time / data[i].tasks) +
                "s</td>" +
                "</tr>";
        }
        let table = document.getElementById("day-table-body-by-type");
        table.innerHTML = tableContent;
        dataTableDay = $("#day-table-by-type").DataTable();
    };
    //
    const showDetailDay = (d) => {
        let data = getDataByDay(d);
        let tasks = 0;
        let time = 0;
        for (let i = 0; i < data.dataByTaskType.length; i++) {
            tasks += data.dataByTaskType[i].tasks;
            time += data.dataByTaskType[i].time;
        }
        let taskTxt = document.getElementById("dayDetailTasksTxt");
        let timeTxt = document.getElementById("dayDetailTimeTxt");
        let rphTxt = document.getElementById("dayDetailRphTxt");
        let dayTitle = document.getElementById("day-title");
        //
        dayTitle.innerText = d;
        taskTxt.innerText = tasks;
        timeTxt.innerText = convertTime(time);
        rphTxt.innerText = Math.round(3600 / (time / tasks)) + "";
    };
    //
    const showDayChartByType = (d) => {
        let dataPerDay = getDataByDay(d);
        let dataByTaskType = { taskType: [], tasks: [], time: [] };
        for (let i = 0; i < dataPerDay.dataByTaskType.length; i++) {
            dataByTaskType.taskType.push(dataPerDay.dataByTaskType[i].taskType);
            dataByTaskType.tasks.push(dataPerDay.dataByTaskType[i].tasks);
            dataByTaskType.time.push(dataPerDay.dataByTaskType[i].time);
        }
        dayChartByType = new Chart("dayChartByType", {
            type: "pie",
            data: {
                labels: dataByTaskType.taskType,
                datasets: [{ label: "Tasks", data: dataByTaskType.tasks }],
            },
            options: {
                legend: { display: true },
                plugins: { title: { display: true, text: "Statistics by task type" } },
                maintainAspectRatio: false,
            },
        });
    };
    //

    $(document).on("click", "#btn-search-by-day", () => {
        if(submitHistory == null || submitHistory == []){return}
        let datePick = DateTime.fromISO($("#date-picker").val());
        let startHistDate = startHis;
        let endHisDate = endHis;
        if (currentTime > endHis) { endHisDate = currentTime; }
        if (datePick < startHistDate || datePick > endHisDate) {
            $("#date-picker").css("border", "2px solid red");
            return;
        }
        $("#date-picker").css("border", "1px solid rgb(187, 187, 187)");
        // Destroy
        if (dataTableDay != null) { dataTableDay.destroy(); }
        if (dayChartByType != null) { dayChartByType.destroy(); }
        let table = document.getElementById("day-table-body-by-type");
        table.innerHTML = "";
        showDay(datePick.toISODate())
    });



    // =========== WEEK ===========
    const getDataByWeek = (y, w) => {
        let dataPerWeek = {
            week: "",
            data: { day: [], tasks: [], time: [] },
            dataByTaskType: [],
        };
        // return
        let year = parseInt(y);
        let week = parseInt(w);
        let weekString = week < 10 ? year + "W0" + week : year + "W" + week;
        let startDay = DateTime.fromISO(weekString);
        for (let i = 0; i < 7; i++) {
            let day = startDay.plus({ days: i }).toISODate();
            dataPerWeek.data.day.push(day.substring(5));
            dataPerWeek.data.tasks.push(0);
            dataPerWeek.data.time.push(0);
        }
        // 
        for (let i = 0; i < submitHistory.length; i++) {

            let submitDate = DateTime.fromISO(submitHistory[i].datetime).setZone(
                timezone
            );
            //
            if (submitDate.year == year && submitDate.weekNumber == week) {
                let idx = dataPerWeek.data.day.findIndex(e => e == submitDate.toISODate().substring(5))

                let time = submitHistory[i].time
                dataPerWeek.data.tasks[idx] += 1;
                dataPerWeek.data.time[idx] += time;

            }
        }
        dataPerWeek.week = weekString;
        for (let k = 0; k < dataPerWeek.data.time.length; k++) {
            dataPerWeek.data.time[k] = Math.round(dataPerWeek.data.time[k] / 60);
        }

        // console.log(dataPerWeek);
        return dataPerWeek;
    };
    //

    const showDetailWeek = (wData) => {
        let data = wData.data;
        let tasks = 0;
        let time = 0;
        for (let i = 0; i < data.day.length; i++) {
            tasks += data.tasks[i];
            time += data.time[i] * 60;
        }
        let taskTxt = document.getElementById("weekDetailTasksTxt");
        let timeTxt = document.getElementById("weekDetailTimeTxt");
        let rphTxt = document.getElementById("weekDetailRphTxt");
        let weekTitle = document.getElementById("week-title");
        //
        let startDay = DateTime.fromISO(wData.week);
        let endDay = startDay.plus({ day: 6 });
        //
        let startDayStr = startDay.toISODate().replace(/-/g, "/");
        let endDayStr = endDay.toISODate().replace(/-/g, "/");
        //
        weekTitle.innerText =
            "Week " + wData.week.substring(5)
            + " - " + wData.week.substring(0, 4)
            + " (" + startDayStr
            + " - " + endDayStr + ")";
        taskTxt.innerText = tasks;
        timeTxt.innerText = convertTime(time);
        rphTxt.innerText = Math.round(3600 / (time / tasks)) + "";
    };
    //

    const showSelectWeek = () => {
        let selectYearWeekContent = "";
        let selectWeekContent = "";
        for (let i = 0; i < weekList.length; i++) {
            let year = weekList[i].year;
            // Year select
            if (year == currentTime.year) {
                selectYearWeekContent +=
                    '<option selected value="' + year + '">' + year + "</option>";
                // Week select
                for (let k = 0; k < weekList[i].week.length; k++) {
                    let week = weekList[i].week[k];
                    let weekString = week < 10 ? year + "W0" + week : year + "W" + week;
                    let startDay = DateTime.fromISO(weekString);
                    let endDay = startDay.plus({ day: 6 });
                    let startDayStr = startDay.toISODate().replace(/-/g, "/");
                    let endDayStr = endDay.toISODate().replace(/-/g, "/");
                    selectWeekContent += "<option ";
                    selectWeekContent +=
                        week == currentTime.weekNumber ? "selected " : " ";
                    selectWeekContent +=
                        'value="' +
                        week +
                        '">' +
                        week +
                        " (" +
                        startDayStr +
                        " - " +
                        endDayStr +
                        ")</option>";
                }
                continue;
            }
            selectYearWeekContent +=
                '<option value="' + year + '">' + year + "</option>";
        }
        let selectYearWeek = document.getElementById("select-year-week");
        selectYearWeek.innerHTML = selectYearWeekContent;
        let selectWeek = document.getElementById("select-week");
        selectWeek.innerHTML = selectWeekContent;
    };
    //

    const showWeekTable = (y, w) => {
        let data = getDataByWeek(y, w).dataByTaskType;
        // data = await data.sort((a,b) => b.tasks - a.tasks);
        let tableContent = "";
        for (let i = 0; i < data.length; i++) {
            tableContent +=
                "<tr>" +
                "<td>" +
                data[i].taskTypeName +
                "</td>" +
                "<td>" +
                data[i].tasks +
                "</td>" +
                "<td>" +
                convertTime(data[i].time) +
                "</td>" +
                "<td>" +
                Math.round(3600 / (data[i].time / data[i].tasks)) +
                "</td>" +
                "<td>" +
                Math.round(data[i].time / data[i].tasks) +
                "s</td>" +
                "</tr>";
        }
        let table = document.getElementById("week-table-body-by-type");
        table.innerHTML = tableContent;
        let tablea = new DataTable("#week-table-by-type");
    };
    //

    const showWeekChartByType = (y, w) => {
        let dataPerWeek = getDataByWeek(y, w);
        let dataByTaskType = { taskType: [], tasks: [], time: [] };
        for (let i = 0; i < dataPerWeek.dataByTaskType.length; i++) {
            dataByTaskType.taskType.push(dataPerWeek.dataByTaskType[i].taskTypeName);
            dataByTaskType.tasks.push(dataPerWeek.dataByTaskType[i].tasks);
            dataByTaskType.time.push(dataPerWeek.dataByTaskType[i].time);
        }
        weekChartByType = new Chart("weekChartByType", {
            type: "pie",
            data: {
                labels: dataByTaskType.taskType,
                datasets: [{ label: "Tasks", data: dataByTaskType.tasks }],
            },
            options: {
                legend: { display: true },
                plugins: { title: { display: true, text: "Statistics by task type" } },
                maintainAspectRatio: false,
            },
        });
    };
    //

    const showWeekChartByTasks = (wData) => {
        // let data = wData.data;

        weekChartByTasks = new Chart("weekChartByTasks", {
            type: "bar",
            data: {
                labels: wData.data.day,
                datasets: [
                    {
                        label: "Tasks",
                        backgroundColor: "rgb(54, 162, 235)",
                        borderColor: "rgb(54, 162, 235)",
                        data: wData.data.tasks,
                    },
                ],
            },
            options: {
                legend: { display: false },
                plugins: { title: { display: true, text: wData.week } },
                maxBarThickness: 45,
                maintainAspectRatio: false,
                scales: {
                    x: { beginAtZero: true, title: { display: true, text: "Day" } },
                    y: { beginAtZero: true, title: { display: true, text: "Tasks" } },
                },
            },
        });
    };
    //

    const showWeekChartByTime = (wData) => {
        // let data = wData.data;
        weekChartByTime = new Chart("weekChartByTime", {
            type: "bar",
            data: {
                labels: wData.data.day,
                datasets: [
                    {
                        label: "Time (Minutes)",
                        data: wData.data.time,
                        backgroundColor: "rgb(226, 105, 49)",
                        borderColor: "rgb(226, 105, 49)",
                    },
                ],
            },
            options: {
                legend: { display: false },
                plugins: { title: { display: true, text: wData.week } },
                maxBarThickness: 45,
                maintainAspectRatio: false,
                scales: {
                    x: { beginAtZero: true, title: { display: true, text: "Day" } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Time (Minutes)" },
                    },
                },
            },
        });
    };
    //

    $(document).on("change", "#select-year-week", () => {
        if(submitHistory == null || submitHistory == []){return}
        let year = parseInt($("#select-year-week option:selected").val());
        let selectWeekContent = "";
        let idx = weekList.findIndex((e) => e.year == year);
        // Week select
        selectWeekContent += '<option selected value="0">Select week</option>';
        for (let k = 0; k < weekList[idx].week.length; k++) {
            let week = weekList[idx].week[k];
            let weekString = week < 10 ? year + "W0" + week : year + "W" + week;
            let startDay = DateTime.fromISO(weekString);
            let endDay = startDay.plus({ day: 6 });
            let startDayStr = startDay.toISODate().replace(/-/g, "/");
            let endDayStr = endDay.toISODate().replace(/-/g, "/");
            selectWeekContent +=
                '<option value="' +
                week +
                '">' +
                week +
                " (" +
                startDayStr +
                " - " +
                endDayStr +
                ")</option>";
        }
        //
        let selectWeek = document.getElementById("select-week");
        selectWeek.innerHTML = selectWeekContent;
    });
    //
    $(document).on("change", "#select-week", () => {
        if(submitHistory == null || submitHistory == []){return}
        setTimeout(() => {
            let year = parseInt($("#select-year-week option:selected").val());
            let week = parseInt($("#select-week option:selected").val());
            if (week == 0) { return; }

            if (weekChartByTasks != null) { weekChartByTasks.destroy(); }
            if (weekChartByTime != null) { weekChartByTime.destroy(); }
            // if (weekChartByType != null) { weekChartByType.destroy(); }
            //
            showWeek(year, week)

        }, 100)
    });



    //  ============= MONTH ============= //
    const getDataByMonth = (y, m) => {
        let dataPerMonth = { month: "", data: { day: [], tasks: [], time: [] } };
        let year = parseInt(y);
        let month = parseInt(m);
        let monthString = month < 10 ? y + "-0" + m : y + "-" + m;
        let numDay = DateTime.fromISO(monthString).endOf("month").day;

        // Init empty data
        for (let i = 1; i <= numDay; i++) {
            let dateString = "";
            if (i < 10) {
                dateString = monthString + "-0" + i;
            } else {
                dateString = monthString + "-" + i;
            }
            dataPerMonth.data.day.push(dateString.substring(5));
            dataPerMonth.data.tasks.push(0);
            dataPerMonth.data.time.push(0);
        }
        // Get data
        for (let i = 0; i < submitHistory.length; i++) {
            let submitDate = DateTime.fromISO(submitHistory[i].datetime).setZone(
                timezone
            );

            if (submitDate.year == year && submitDate.month == month) {
                let idx = dataPerMonth.data.day.findIndex(e => e == submitDate.toISODate().substring(5))
                let time = submitHistory[i].time
                dataPerMonth.data.tasks[idx] += 1;
                dataPerMonth.data.time[idx] += time;
            }
        }
        dataPerMonth.month = y + "-" + m;
        // Round time work
        for (let k = 0; k < dataPerMonth.data.time.length; k++) {
            dataPerMonth.data.time[k] = Math.round(dataPerMonth.data.time[k] / 60);
        }
        // console.log(dataPerMonth)
        return dataPerMonth;
    };
    //

    const showDetailMonth = (mData) => {
        // let data = getDataByMonth(y, m).data;
        let data = mData.data;
        let tasks = 0;
        let time = 0;
        for (let i = 0; i < data.day.length; i++) {
            tasks += data.tasks[i];
            time += data.time[i] * 60;
        }
        let taskTxt = document.getElementById("monthDetailTasksTxt");
        let timeTxt = document.getElementById("monthDetailTimeTxt");
        let rphTxt = document.getElementById("monthDetailRphTxt");
        let monthTitle = document.getElementById("month-title");
        //
        monthTitle.innerText = mData.month;
        taskTxt.innerText = tasks;
        timeTxt.innerText = convertTime(time);
        rphTxt.innerText = Math.round(3600 / (time / tasks)) + "";
    };
    //

    const showSelectMonth = () => {
        let selectYearMonthContent = "";
        let selectMonthContent = "";
        for (let i = 0; i < monthList.length; i++) {
            let year = monthList[i].year;
            // Year select
            selectYearMonthContent += "<option ";
            selectYearMonthContent += year == currentTime.year ? "selected " : " ";
            selectYearMonthContent +=
                '<option value="' + year + '">' + year + "</option>";
            if (year == currentTime.year) {
                // Week select
                for (let k = 0; k < monthList[i].month.length; k++) {
                    let month = monthList[i].month[k];
                    selectMonthContent += "<option ";
                    selectMonthContent += month == currentTime.month ? "selected " : " ";
                    selectMonthContent += 'value="' + month + '">' + month + "</option>";
                }
            }
        }
        let selectMonthWeek = document.getElementById("select-year-month");
        selectMonthWeek.innerHTML = selectYearMonthContent;
        let selectMonth = document.getElementById("select-month");
        selectMonth.innerHTML = selectMonthContent;
    };
    //

    const showMonthChartByTasks = (mData) => {
        // let dataPerMonth = getDataByMonth(y, m);
        // let data = mData;
        monthChartByTasks = new Chart("monthChartByTasks", {
            type: "bar",
            data: {
                labels: mData.data.day,
                datasets: [
                    {
                        label: "Tasks",
                        data: mData.data.tasks,
                        backgroundColor: "rgb(54, 162, 235)",
                        borderColor: "rgb(54, 162, 235)",
                    },
                ],
            },
            options: {
                legend: { display: false },
                maintainAspectRatio: false,
                scales: {
                    x: { beginAtZero: true, title: { display: true, text: "Day" } },
                    y: { beginAtZero: true, title: { display: true, text: "Tasks" } },
                },
            },
        });
    };
    //

    const showMonthChartByTime = (mData) => {
        // let dataPerMonth = getDataByMonth(y, m);
        // let data = mData;
        monthChartByTime = new Chart("monthChartByTime", {
            type: "bar",
            data: {
                labels: mData.data.day,
                datasets: [
                    {
                        label: "Time (Minutes)",
                        data: mData.data.time,
                        backgroundColor: "rgb(226, 105, 49)",
                        borderColor: "rgb(226, 105, 49)",
                    },
                ],
            },
            options: {
                legend: { display: false },
                maintainAspectRatio: false,
                scales: {
                    x: { beginAtZero: true, title: { display: true, text: "Day" } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Time (Minutes)" },
                    },
                },
            },
        });
    };
    //
    $(document).on("change", "#select-year-month", () => {
        if(submitHistory == null || submitHistory == []){return}
        let year = parseInt($("#select-year-month option:selected").val());
        let selectMonthContent = "";
        let idx = monthList.findIndex((e) => e.year == year);
        // Week select
        selectMonthContent += '<option selected value="0">Select month</option>';
        for (let k = 0; k < monthList[idx].month.length; k++) {
            let month = monthList[idx].month[k];
            selectMonthContent +=
                '<option value="' + month + '">' + month + "</option>";
        }
        let selectMonth = document.getElementById("select-month");
        selectMonth.innerHTML = selectMonthContent;
    });
    //
    $(document).on("change", "#select-month", () => {

        if(submitHistory == null || submitHistory == []){return}
        setTimeout(() => {
            let year = parseInt($("#select-year-month option:selected").val());
            let month = parseInt($("#select-month option:selected").val());
            if (month == 0) { loading = false; return; }

            if (monthChartByTasks != null) { monthChartByTasks.destroy() }
            if (monthChartByTime != null) { monthChartByTime.destroy() }
            showMonth(year, month)
        }, 100)
    });

    /**********************************************************************/
    // ================= GET DATA ==================
    await getSubmitHistory();
    if(submitHistory == null || submitHistory == []){return}

    // DAY
    showDatePicker()
    const showDay = (date) => {
        loading = true
        setTimeout(() => {
            showDetailDay(date);
            showDayTable(date);
            showDayChartByType(date);
            loading = false;
        }, 100)
    }
    showDay(currentTime.toISODate())

    // WEEK
    showSelectWeek();
    const showWeek = (year, week) => {
        loading = true
        setTimeout(() => {
            let wData = getDataByWeek(year, week)
            showDetailWeek(wData);
            showWeekChartByTasks(wData);
            showWeekChartByTime(wData);
            // showWeekTable(wData);
            // showWeekChartByType(wData);
            loading = false;
        }, 100)
    }
    // showWeek(currentTime.year, currentTime.weekNumber)

    // MONTH
    showSelectMonth();
    const showMonth = (year, month) => {
        loading = true
        setTimeout(() => {
            let mData = getDataByMonth(year, month)
            showDetailMonth(mData)
            showMonthChartByTasks(mData);
            showMonthChartByTime(mData);
            loading = false;
        }, 100)
    }
    // showMonth(currentTime.year, currentTime.month)
});

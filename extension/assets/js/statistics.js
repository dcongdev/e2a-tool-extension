$(document).ready(async function () {
    var DateTime = luxon.DateTime;
    // Function convert time
    const convertTime = (second) => {
        if (second <= 0) { return "00:00"; }
        let time = "";
        let hour = parseInt(second / 3600);
        let min = parseInt((second % 3600) / 60);
        let sec = (second % 3600) % 60;
        // if (hour > 0) { // Hour
        //     if (hour < 10 && hour >= 1) { time += "0" }
        //     time += hour + ":";
        // }
        if (hour < 10 && hour >= 1) { time += "0" }
        time += hour + ":";
        if (min < 10) { time += "0"; }// Minute
        time += min + ":";
        if (sec < 10) { time += "0"; }// Second
        time += sec;
        return time;
    }
    //
    var rawData = [];
    var weekList = [];
    var monthList = [];
    var yearList = [];
    var startHis = null;
    var endHis = null;
    // Day
    var dayChartByType = null;
    // Week
    var weekChartByTasks = null;
    var weekChartByTime = null;
    var weekChartByType = null;

    // Month
    var monthChartByTasks = null;
    var monthChartByTime = null;
    //
    var currentTime = DateTime.utc().setZone("America/Los_Angeles");
    //
    var txtRealTime = document.getElementById("txt-real-time");
    let a = currentTime.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)
    txtRealTime.innerText = a
    var blob = new Blob(["setInterval(function() {postMessage('');}, 1000); "]);
    var counterWorker = new Worker(window.URL.createObjectURL(blob));
    counterWorker.onmessage = () => {
        let time = DateTime.utc().setZone("America/Los_Angeles");
        let a = time.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)
        txtRealTime.innerText = a
        // console.log(currentTime)
    }
    /* ======= GET DATA ======= */
    const getSubmitHistory = async () => {
        rawData = (await chrome.storage.local.get(["sumbitHistory"])).sumbitHistory;
        //
        if (rawData.length == 0) { return null };
        //
        startHis = DateTime.fromISO(rawData[0].date);
        endHis = DateTime.fromISO(rawData[rawData.length - 1].date);
        for (let i = startHis.year; i <= endHis.year; i++) {
            yearList.push(i)
            let startMonth = 1;
            let endMonth = 12;
            //
            let startWeek = 1;
            let endWeek = parseInt(DateTime.fromISO(i + "-12-28").toFormat("WW"));
            //
            if (i == startHis.year) {
                startWeek = startHis.weekNumber;
                startMonth = startHis.month;
            }
            //
            if (i == endHis.year) {
                endMonth = endHis.month;
                endWeek = endHis.weekNumber;
            }
            let weeks = []
            for (let k = startWeek; k <= endWeek; k++) { weeks.push(k); }
            weekList.push({ year: i, week: weeks })

            let months = []
            for (let k = startMonth; k <= endMonth; k++) { months.push(k); }
            monthList.push({ year: i, month: months })
        }

    }

    /* ======= SHOW CHART ======= */
    // DAY
    const getDataByDay = (d) => {
        let dataByDay = { date: d, data: { taskType: [], tasks: [], time: [] }, dataByTaskType: [] }
        let idx = rawData.findIndex(e => e.date == d);
        if (idx == -1) { return dataByDay; }
        //
        for (let i = 0; i < rawData[idx].data.length; i++) {
            dataByDay.data.taskType.push(rawData[idx].data[i].taskType)
            dataByDay.data.tasks.push(rawData[idx].data[i].tasks)
            dataByDay.data.time.push((rawData[idx].data[i].time) / 60)
        }
        dataByDay.dataByTaskType = rawData[idx].data
        return dataByDay;
    }
    
    const showDatePicker = () => {
        let datepicker = $('#date-picker');
        let currentDate = currentTime.toISODate();
        let startHistDate = startHis.toISODate();
        let endHistDate = endHis.toISODate();
        if (currentTime > endHis) { endHistDate = currentTime.toISODate(); }
        datepicker.val(currentDate)
        datepicker.attr({ "min": startHistDate });
        datepicker.attr({ "max": endHistDate });
    }
    const showDayTable = (d) => {
        let data = getDataByDay(d).dataByTaskType;
        // data = await data.sort((a,b) => b.tasks - a.tasks);
        let tableContent = "";
        for (let i = 0; i < data.length; i++) {
            tableContent += '<tr>'
                + '<td>' + data[i].taskType + '</td>'
                + '<td>' + data[i].tasks + '</td>'
                + '<td>' + convertTime(data[i].time) + '</td>'
                + '<td>' + Math.round(3600 / (data[i].time / data[i].tasks)) + '</td>'
                + '<td>' + Math.round(data[i].time / data[i].tasks) + 's</td>'
                + '</tr>';
        }
        let table = document.getElementById("day-table-body-by-type");
        table.innerHTML = tableContent;
        let tablea = $('#day-table-by-type').DataTable()
    }
    const showDetailDay = (d) => {
        let data = getDataByDay(d).data;
        let tasks = 0;
        let time = 0;
        for (let i = 0; i < data.taskType.length; i++) {
            tasks += data.tasks[i];
            time += data.time[i] * 60;
        }
        let taskTxt = document.getElementById("dayDetailTasksTxt");
        let timeTxt = document.getElementById("dayDetailTimeTxt");
        let rphTxt = document.getElementById("dayDetailRphTxt");
        let dayTitle = document.getElementById("day-title");
        //
        dayTitle.innerText = d;
        taskTxt.innerText = tasks;
        timeTxt.innerText = convertTime(time)
        rphTxt.innerText = Math.round(3600 / (time / tasks)) + ""
    }
    const showDayChartByType = (d) => {
        let dataPerDay = getDataByDay(d);
        let dataByTaskType = { taskType: [], tasks: [], time: [] };
        for (let i = 0; i < dataPerDay.dataByTaskType.length; i++) {
            dataByTaskType.taskType.push(dataPerDay.dataByTaskType[i].taskType)
            dataByTaskType.tasks.push(dataPerDay.dataByTaskType[i].tasks)
            dataByTaskType.time.push(dataPerDay.dataByTaskType[i].time)
        }
        dayChartByType = new Chart("dayChartByType", {
            type: "pie",
            data: {
                labels: dataByTaskType.taskType,
                datasets: [{ label: 'Tasks', data: dataByTaskType.tasks, }]
            },
            options: {
                legend: { display: true, },
                plugins: { title: { display: true, text: "Statistics by task type" } },
                maintainAspectRatio: false
            }
        });
    }
    $(document).on("click", "#btn-search-by-day", () => {
        let datePick = DateTime.fromISO($("#date-picker").val());
        let startHistDate = startHis;
        let endHisDate = endHis;
        if (currentTime > endHis) { endHisDate = currentTime }
        if (datePick < startHistDate || datePick > endHisDate) {
            $("#date-picker").css("border", "2px solid red");
            return
        }
        $("#date-picker").css("border", "1px solid rgb(187, 187, 187)");
        dayChartByType.destroy()
        showDetailDay(datePick.toISODate());
        showDayTable(datePick.toISODate());
        showDayChartByType(datePick.toISODate());
    });

    // WEEK
    const getDataByWeek = (y, w) => {
        let dataPerWeek = {week: "",data: { day: [], tasks: [], time: [] }, dataByTaskType: []};
        // return
        let year = parseInt(y);
        let week = parseInt(w);
        let weekString = week < 10 ? (year + "W0" + week) : (year + "W" + week);
        let startDay = DateTime.fromISO(weekString);
        for (let i = 0; i < 7; i++) {
            let day = startDay.plus({ days: i }).toISODate()
            dataPerWeek.data.day.push(day.substring(5));
            dataPerWeek.data.tasks.push(0);
            dataPerWeek.data.time.push(0);
        }
        let arrTaskType = [];
        for (let i = 0; i < rawData.length; i++) {
            let date = DateTime.fromISO(rawData[i].date);
            if (date.year == year && date.weekNumber == week) {
                let tasks = 0;
                let time = 0;
                for (let k = 0; k < rawData[i].data.length; k++) {
                    tasks += rawData[i].data[k].tasks;
                    time += rawData[i].data[k].time;
                    // Get data by task type
                    let taskTypeName = rawData[i].data[k].taskType;
                    if (arrTaskType.find(e => e.taskTypeName == taskTypeName) == undefined) {
                        arrTaskType.push({
                            taskTypeName: taskTypeName,
                            tasks: rawData[i].data[k].tasks,
                            time: rawData[i].data[k].time
                        })
                    }
                    else {
                        let idx = arrTaskType.findIndex(e => e.taskTypeName == taskTypeName);
                        arrTaskType[idx].tasks += rawData[i].data[k].tasks;
                        arrTaskType[idx].time += rawData[i].data[k].time;
                    }
                }
                let idx = dataPerWeek.data.day.findIndex(e => e == date.toISODate().substring(5))
                dataPerWeek.data.tasks[idx] = tasks;
                dataPerWeek.data.time[idx] = time / 60;
            }

        }
        dataPerWeek.week = weekString;
        dataPerWeek.dataByTaskType = arrTaskType;
        return dataPerWeek;
    }
    const showDetailWeek = (y, w) => {
        let data = getDataByWeek(y, w).data;
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
        let weekString = w < 10 ? (y + "W0" + w) : (y + "W" + w);
        let startDay = DateTime.fromISO(weekString);
        let endDay = startDay.plus({ day: 6 })
        let startDayStr = (startDay.toISODate()).replace(/-/g, "/");
        let endDayStr = (endDay.toISODate()).replace(/-/g, "/");
        weekTitle.innerText = "Week " + w + " - " + y + " (" + startDayStr + " - " + endDayStr + ")";
        taskTxt.innerText = tasks;
        timeTxt.innerText = convertTime(time)
        rphTxt.innerText = Math.round(3600 / (time / tasks)) + ""
    }
    const showSelectWeek = () => {
        let selectYearWeekContent = "";
        let selectWeekContent = "";
        for (let i = 0; i < weekList.length; i++) {
            let year = weekList[i].year;
            // Year select
            if (year == currentTime.year) {
                selectYearWeekContent += '<option selected value="' + year + '">' + year + '</option>';
                // Week select
                for (let k = 0; k < weekList[i].week.length; k++) {
                    let week = weekList[i].week[k];
                    let weekString = week < 10 ? (year + "W0" + week) : (year + "W" + week);
                    let startDay = DateTime.fromISO(weekString);
                    let endDay = startDay.plus({ day: 6 })
                    let startDayStr = (startDay.toISODate()).replace(/-/g, "/");
                    let endDayStr = (endDay.toISODate()).replace(/-/g, "/");
                    selectWeekContent += '<option ';
                    selectWeekContent += (week == currentTime.weekNumber) ? 'selected ' : ' ';
                    selectWeekContent += 'value="' + week + '">' + week + ' (' + startDayStr + ' - ' + endDayStr + ')</option>';
                }
                continue;
            }
            selectYearWeekContent += '<option value="' + year + '">' + year + '</option>';
        }
        let selectYearWeek = document.getElementById("select-year-week");
        selectYearWeek.innerHTML = selectYearWeekContent;
        let selectWeek = document.getElementById("select-week");
        selectWeek.innerHTML = selectWeekContent;
    }
    const showWeekTable = (y, w) => {
        let data = getDataByWeek(y, w).dataByTaskType;
        // data = await data.sort((a,b) => b.tasks - a.tasks);
        let tableContent = "";
        for (let i = 0; i < data.length; i++) {
            tableContent += '<tr>'
                + '<td>' + data[i].taskTypeName + '</td>'
                + '<td>' + data[i].tasks + '</td>'
                + '<td>' + convertTime(data[i].time) + '</td>'
                + '<td>' + Math.round(3600 / (data[i].time / data[i].tasks)) + '</td>'
                + '<td>' + Math.round(data[i].time / data[i].tasks) + 's</td>'
                + '</tr>';
        }
        let table = document.getElementById("week-table-body-by-type");
        table.innerHTML = tableContent;
        let tablea = new DataTable('#week-table-by-type')
    }
    const showWeekChartByType = (y, w) => {
        let dataPerWeek = getDataByWeek(y, w);
        let dataByTaskType = { taskType: [], tasks: [], time: [] };
        for (let i = 0; i < dataPerWeek.dataByTaskType.length; i++) {
            dataByTaskType.taskType.push(dataPerWeek.dataByTaskType[i].taskTypeName)
            dataByTaskType.tasks.push(dataPerWeek.dataByTaskType[i].tasks)
            dataByTaskType.time.push(dataPerWeek.dataByTaskType[i].time)
        }
        weekChartByType = new Chart("weekChartByType", {
            type: "pie",
            data: {labels: dataByTaskType.taskType,datasets: [{label: 'Tasks',data: dataByTaskType.tasks,}]},
            options: {
                legend: {display: true,},
                plugins: {title: {display: true,text: "Statistics by task type"}},
                maintainAspectRatio: false
            }
        });
    }
    const showWeekChartByTasks = (y, w) => {
        let dataPerWeek = getDataByWeek(y, w);
        let dataByTaskType = { taskType: [], tasks: [], time: [] };
        for (let i = 0; i < dataPerWeek.dataByTaskType.length; i++) {
            dataByTaskType.taskType.push(dataPerWeek.dataByTaskType[i].taskTypeName)
            dataByTaskType.tasks.push(dataPerWeek.dataByTaskType[i].tasks)
            dataByTaskType.time.push(dataPerWeek.dataByTaskType[i].time)
        }
        weekChartByTasks = new Chart("weekChartByTasks", {
            type: "bar",
            data: {
                labels: dataPerWeek.data.day,
                datasets: [{
                    label: 'Tasks',
                    backgroundColor: 'rgb(54, 162, 235)',
                    borderColor: 'rgb(54, 162, 235)',
                    data: dataPerWeek.data.tasks
                }]
            },
            options: {
                legend: { display: false },
                plugins: {title: {display: true,text: dataPerWeek.month}},
                maxBarThickness: 45,
                maintainAspectRatio: false,
                scales: {
                    x: {beginAtZero: true,title: {display: true,text: "Day"}},
                    y: {beginAtZero: true,title: {display: true,text: "Tasks"}}
                }
            }
        });
    }
    const showWeekChartByTime = (y, w) => {
        let dataPerWeek = getDataByWeek(y, w);
        weekChartByTime = new Chart("weekChartByTime", {
            type: "bar",
            data: {
                labels: dataPerWeek.data.day,
                datasets: [{
                    label: 'Time (Minutes)',
                    data: dataPerWeek.data.time,
                    backgroundColor: 'rgb(226, 105, 49)',
                    borderColor: 'rgb(226, 105, 49)'
                }]
            },
            options: {
                legend: { display: false },
                plugins: {title: {display: true,text: dataPerWeek.month}},
                maxBarThickness: 45,
                maintainAspectRatio: false,
                scales: {
                    x: {beginAtZero: true,title: {display: true,text: "Day"}},
                    y: {beginAtZero: true,title: {display: true,text: "Time (Minutes)"}}
                }
            }
        });
    }
    $(document).on("change", "#select-year-week", () => {
        let year = parseInt($("#select-year-week option:selected").val());
        let selectWeekContent = "";
        let idx = weekList.findIndex(e => e.year == year);
        // Week select
        selectWeekContent += '<option selected value="0">Select week</option>';
        for (let k = 0; k < weekList[idx].week.length; k++) {
            let week = weekList[idx].week[k];
            let weekString = week < 10 ? (year + "W0" + week) : (year + "W" + week);
            let startDay = DateTime.fromISO(weekString);
            let endDay = startDay.plus({ day: 6 })
            let startDayStr = (startDay.toISODate()).replace(/-/g, "/");
            let endDayStr = (endDay.toISODate()).replace(/-/g, "/");
            selectWeekContent += '<option value="' + week + '">' + week + ' (' + startDayStr + ' - ' + endDayStr + ')</option>';
        }
        //
        let selectWeek = document.getElementById("select-week");
        selectWeek.innerHTML = selectWeekContent;
    });
    $(document).on("change", "#select-week", () => {
        let year = parseInt($("#select-year-week option:selected").val());
        let week = parseInt($("#select-week option:selected").val());
        if (week == 0) { return }
        showWeekTable(year, week);
        weekChartByType.destroy();
        weekChartByTasks.destroy();
        weekChartByTime.destroy();
        showWeekChartByType(year, week)
        showWeekChartByTasks(year, week)
        showWeekChartByTime(year, week)
        showDetailWeek(year, week);
    });

    //  ============= MONTH =============
    const getDataByMonth = (y, m) => {
        let dataPerMonth = {month: "",data: { day: [], tasks: [], time: [] }};
        let year = parseInt(y);
        let month = parseInt(m);
        let monthString = month < 10 ? (y + "-0" + m) : (y + "-" + m);
        let numDay = DateTime.fromISO(monthString).endOf("month").day
        for (let i = 1; i <= numDay; i++) {
            let dateString = "";
            if (i < 10) { dateString = monthString + "-0" + i }
            else { dateString = monthString + "-" + i }
            dataPerMonth.data.day.push(dateString.substring(5));
            dataPerMonth.data.tasks.push(0);
            dataPerMonth.data.time.push(0);
        }
        let arrTaskType = [];
        for (let i = 0; i < rawData.length; i++) {
            let date = DateTime.fromISO(rawData[i].date);
            if (date.year == year && date.month == month) {
                // console.log(rawData[i])
                let tasks = 0;
                let time = 0;
                for (let k = 0; k < rawData[i].data.length; k++) {
                    tasks += rawData[i].data[k].tasks;
                    time += rawData[i].data[k].time;
                    // Get data by task type
                    let taskTypeName = rawData[i].data[k].taskType;
                    if (arrTaskType.find(e => e.taskTypeName == taskTypeName) == undefined) {
                        arrTaskType.push({
                            taskTypeName: taskTypeName,
                            tasks: rawData[i].data[k].tasks,
                            time: rawData[i].data[k].time
                        })
                    }
                    else {
                        let idx = arrTaskType.findIndex(e => e.taskTypeName == taskTypeName);
                        arrTaskType[idx].tasks += rawData[i].data[k].tasks;
                        arrTaskType[idx].time += rawData[i].data[k].time;
                    }
                }
                let idx = dataPerMonth.data.day.findIndex(e => e == date.toISODate().substring(5))

                dataPerMonth.data.tasks[idx] = tasks;
                dataPerMonth.data.time[idx] = time / 60;
            }

        }
        dataPerMonth.month = y + "-" + m
        dataPerMonth.dataByTaskType = arrTaskType;
        // console.log(dataPerMonth)
        return dataPerMonth;
    }
    const showDetailMonth = (y, m) => {
        let data = getDataByMonth(y, m).data;
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
        let monthString = y + "-";
        monthString += (m < 10) ? ("0" + m) : + m;
        monthTitle.innerText = monthString
        taskTxt.innerText = tasks;
        timeTxt.innerText = convertTime(time)
        rphTxt.innerText = Math.round(3600 / (time / tasks)) + ""
    }
    const showSelectMonth = () => {
        let selectYearMonthContent = "";
        let selectMonthContent = "";
        for (let i = 0; i < monthList.length; i++) {
            let year = monthList[i].year;
            // Year select
            selectYearMonthContent += '<option ';
            selectYearMonthContent += (year == currentTime.year) ? 'selected ' : ' ';
            selectYearMonthContent += '<option value="' + year + '">' + year + '</option>';
            if (year == currentTime.year) {
                // Week select
                for (let k = 0; k < monthList[i].month.length; k++) {
                    let month = monthList[i].month[k];
                    selectMonthContent += '<option ';
                    selectMonthContent += (month == currentTime.month) ? 'selected ' : ' ';
                    selectMonthContent += 'value="' + month + '">' + month + '</option>';
                }
            }
        }
        let selectMonthWeek = document.getElementById("select-year-month");
        selectMonthWeek.innerHTML = selectYearMonthContent;
        let selectMonth = document.getElementById("select-month");
        selectMonth.innerHTML = selectMonthContent;
    }
    const showMonthChartByTasks = (y, m) => {
        let dataPerMonth = getDataByMonth(y, m);
        monthChartByTasks = new Chart("monthChartByTasks", {
            type: "bar",
            data: {
                labels: dataPerMonth.data.day,
                datasets: [{
                    label: 'Tasks',
                    data: dataPerMonth.data.tasks,
                    backgroundColor: 'rgb(54, 162, 235)',
                    borderColor: 'rgb(54, 162, 235)',
                }]
            },
            options: {
                legend: { display: false },
                maintainAspectRatio: false,
                scales: {
                    x: {beginAtZero: true,title: {display: true,text: "Day"}},
                    y: {beginAtZero: true,title: {display: true,text: "Tasks"}}
                }
            }
        });
    }
    const showMonthChartByTime = (y, m) => {
        let dataPerMonth = getDataByMonth(y, m);
        monthChartByTime = new Chart("monthChartByTime", {
            type: "bar",
            data: {
                labels: dataPerMonth.data.day,
                datasets: [{
                    label: 'Time (Minutes)',
                    data: dataPerMonth.data.time,
                    backgroundColor: 'rgb(226, 105, 49)',
                    borderColor: 'rgb(226, 105, 49)'
                }]
            },
            options: {
                legend: { display: false },
                maintainAspectRatio: false,
                scales: {
                    x: {beginAtZero: true,title: {display: true,text: "Day"}},
                    y: {beginAtZero: true,title: {display: true,text: "Time (Minutes)"}}
                }
            }
        });
    }
    $(document).on("change", "#select-year-month", () => {
        let year = parseInt($("#select-year-month option:selected").val());
        let selectMonthContent = "";
        let idx = monthList.findIndex(e => e.year == year);
        // Week select
        selectMonthContent += '<option selected value="0">Select month</option>';
        for (let k = 0; k < monthList[idx].month.length; k++) {
            let month = monthList[idx].month[k];
            selectMonthContent += '<option value="' + month + '">' + month + '</option>';
        }
        let selectMonth = document.getElementById("select-month");
        selectMonth.innerHTML = selectMonthContent;
    });
    $(document).on("change", "#select-month", () => {
        let year = parseInt($("#select-year-month option:selected").val());
        let month = parseInt($("#select-month option:selected").val());
        if (month == 0) { return }
        monthChartByTasks.destroy();
        monthChartByTime.destroy();
        showMonthChartByTasks(year, month)
        showMonthChartByTime(year, month)
        showDetailMonth(year, month);
    });

    // ================= 
    await getSubmitHistory();
    if (rawData.length == 0) { return null }

    // DAY
    showDatePicker()
    showDetailDay(currentTime.toISODate());
    showDayTable(currentTime.toISODate());
    showDayChartByType(currentTime.toISODate());

    // WEEK
    showSelectWeek();
    showDetailWeek(currentTime.year, currentTime.weekNumber);
    showWeekTable(currentTime.year, currentTime.weekNumber);
    showWeekChartByType(currentTime.year, currentTime.weekNumber);
    showWeekChartByTasks(currentTime.year, currentTime.weekNumber)
    showWeekChartByTime(currentTime.year, currentTime.weekNumber);

    // MONTH
    showSelectMonth();
    showDetailMonth(currentTime.year, currentTime.month)
    showMonthChartByTasks(currentTime.year, currentTime.month);
    showMonthChartByTime(currentTime.year, currentTime.month);

})
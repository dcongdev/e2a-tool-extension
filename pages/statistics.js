/* Copyright (C) 2023 Duong Cong - All Rights Reserved
* Email: duongcong0412hc@gmail.com
*/

var DateTime = luxon.DateTime;
import { saveSettings, getSubmitHistory, getSettings, setSessionSubmitHistory } from "../background/storage.js";
import { checkUserAndTask } from "../background/ui.js";
const extensionUrl = chrome.runtime.getURL("");

$(document).ready(async function () {
    var timezone = (await chrome.storage.sync.get(["dateTime"])).dateTime.timezone;

    // Loading animation
    const showLoading = (show) => {
        if (show) { $("#spinner").addClass("show"); }
        else { $("#spinner").removeClass("show"); }
    }

    // Check user status
    let userStatus = (await checkUserAndTask())
    if (!userStatus) {
        $(".error").removeClass("d-none");
        $(".main").addClass("d-none");
        return
    }
    else {
        $(".error").addClass("d-none");
        $(".main").removeClass("d-none");
        showLoading(false)
    };


    async function fetchJSON(filePath) {
        let response = await fetch(filePath);
        return response.json();
    }

    //
    const convertTime = (second) => {
        if (second <= 0) return "00:00";
        let hour = Math.floor(second / 3600);
        let min = Math.floor((second % 3600) / 60);
        let sec = second % 60;
        return [hour, min, sec].map(num => String(num).padStart(2, "0")).join(":");
    };



    // Update real time clock
    var blob = new Blob(["setInterval(function() {postMessage('');}, 1000); "]);
    var counterWorker = new Worker(window.URL.createObjectURL(blob));
    var txtRealTime = document.getElementById("txt-real-time");
    var txtCurrentTimezone = document.getElementById("txt-current-timezone");
    //
    var currentTime = DateTime.utc().setZone(timezone);
    var currentDate = currentTime.toISODate()
    //
    counterWorker.onmessage = async () => {
        if (timezone == "default") { timezone = DateTime.now().zoneName; }
        txtCurrentTimezone.innerText = timezone
        //
        let dt = currentTime.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS);
        txtRealTime.innerText = dt;
    };

    //

    var submitHistory = [];
    var startHistoryDate = null;
    var endHistoryDate = null;
    const chartInstances = {}; // Object lưu chart
    //
    const loadData = async () => {
        submitHistory = await getSubmitHistory();
        if (submitHistory.length == 0) { return }
        //
        startHistoryDate = DateTime.fromISO(submitHistory[0].datetime).setZone(timezone).toISODate();
        endHistoryDate = DateTime.fromISO(
            submitHistory[submitHistory.length - 1].datetime
        ).setZone(timezone).toISODate();
        // console.log(startHistoryDate)
        // console.log(endHistoryDate)
    }
    await loadData();


    // HIDDEN FEATURES
    var hiddenFeature = false;
    var userIconClick = 0;
    $("#txtExtensionStatus").on("click", () => {
        userIconClick++;
        if (userIconClick == 10) {
            hiddenFeature = true;
            $(".hidden-feature").toggleClass("d-none")
            console.log("Active ultimate features!")
        }
    })

    /* =================================== GET DATA =================================== */
    const convertTimezone = (datetime, timezone = "UTC") =>
        DateTime.fromISO(datetime, { zone: "utc" }).setZone(timezone);
    //
    const getData = (startDate, endDate, timezone) => {
        return submitHistory
            .map(task => {
                const taskDate = convertTimezone(task.datetime, timezone);
                return {
                    name: task.name,
                    datetime: taskDate.toISO(),
                    time: task.time,
                    date: taskDate.toISODate()
                };
            })
            .filter(task => task.date >= startDate && task.date <= endDate)
            .map(({ date, ...task }) => task);
    };
    //

    const processData = (data, timezone) => {
        let totalTasks = data.length;
        let totalTime = data.reduce((sum, task) => sum + task.time, 0);

        let dateMap = new Map();
        let timeMap = new Map();
        let nameMap = new Map();

        let minDate = null, maxDate = null;

        // Thu thập dữ liệu và tìm minDate, maxDate
        data.forEach(task => {
            const taskDate = convertTimezone(task.datetime, timezone).toISODate();

            if (!minDate || taskDate < minDate) minDate = taskDate;
            if (!maxDate || taskDate > maxDate) maxDate = taskDate;

            dateMap.set(taskDate, (dateMap.get(taskDate) || 0) + 1);
            timeMap.set(taskDate, (timeMap.get(taskDate) || 0) + task.time);

            if (!nameMap.has(task.name)) {
                nameMap.set(task.name, { tasks: 0, time: 0 });
            }
            nameMap.get(task.name).tasks += 1;
            nameMap.get(task.name).time += task.time;
        });



        // Nếu không có dữ liệu, return sớm
        if (!minDate || !maxDate) {
            return { totalTasks, totalTime, tasksByDate: [], timeByDate: [], tasksByName: [] };
        }

        // Đảm bảo currentDate và endDate là đối tượng DateTime hợp lệ
        let currentDate = DateTime.fromISO(minDate);
        let endDate = DateTime.fromISO(maxDate);

        // Duyệt từ minDate đến maxDate và đảm bảo tất cả các ngày đều có trong map
        while (currentDate <= endDate) {
            let dateStr = currentDate.toISODate();

            if (!dateMap.has(dateStr)) dateMap.set(dateStr, 0);
            if (!timeMap.has(dateStr)) timeMap.set(dateStr, 0);

            currentDate = currentDate.plus({ days: 1 }); // Cộng thêm 1 ngày
        }

        // Chuyển đổi map thành mảng và sắp xếp theo ngày
        let tasksByDate = Array.from(dateMap.entries()).map(([date, tasks]) => ({ date, tasks })).sort((a, b) => a.date.localeCompare(b.date));
        let timeByDate = Array.from(timeMap.entries()).map(([date, totalTime]) => ({ date, totalTime })).sort((a, b) => a.date.localeCompare(b.date));

        // Sắp xếp tasks theo số lần xuất hiện
        let tasksByName = Array.from(nameMap.entries()).map(([name, value]) => ({ name, tasks: value.tasks, time: value.time }))
            .sort((a, b) => b.tasks - a.tasks);

        return { totalTasks, totalTime, tasksByDate, timeByDate, tasksByName };
    };



    const convertForChartJS = (data) => {
        return {
            tasksByDate: {
                labels: data.tasksByDate.map(item => item.date),
                datasets: [{
                    label: "Total Tasks",
                    data: data.tasksByDate.map(item => item.tasks),
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1
                }]
            },
            timeByDate: {
                labels: data.timeByDate.map(item => item.date),
                datasets: [{
                    label: "Total time (min)",
                    data: data.timeByDate.map(item => item.totalTime),
                    backgroundColor: "rgba(255, 99, 132, 0.6)",
                    borderColor: "rgba(255, 99, 132, 1)",
                    borderWidth: 1
                }]
            },
            tasksByName: {
                labels: data.tasksByName.map(item => item.name),
                datasets: [{
                    label: "Tasks",
                    data: data.tasksByName.map(item => item.tasks),
                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1
                }]
            }
        };
    };

    //
    const convertDataForChartByHour = (data, timezone) => {
        let hourMap = new Map();

        // Khởi tạo dữ liệu với 24 giờ, đảm bảo mọi giờ có giá trị mặc định = 0
        for (let i = 0; i < 24; i++) {
            hourMap.set(i, 0);
        }

        // Lặp qua dữ liệu và tính tổng số task theo giờ
        data.forEach(task => {
            const taskHour = convertTimezone(task.datetime, timezone).hour; // Lấy giờ theo múi giờ
            hourMap.set(taskHour, (hourMap.get(taskHour) || 0) + 1);
        });

        // Chuyển Map thành mảng labels (giờ) và data (tổng task)
        let labels = Array.from(hourMap.keys()).map(h => `${h}:00`); // Nhãn trục X (0:00 - 23:00)
        let values = Array.from(hourMap.values()); // Dữ liệu số task theo giờ

        return {
            labels,
            datasets: [
                {
                    label: "Total tasks",
                    data: values,
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1
                }
            ]
        };
    };


    // Show table
    const showTable = (data, tableCnt, tableBody) => {
        data = data.tasksByName;
        let tableContent = "";
        data.forEach(({ name, tasks, time }) => {
            let avgTimePerTask = tasks > 0 ? Math.round(time / tasks) : 0;
            let rph = tasks > 0 ? Math.round(3600 / avgTimePerTask) : 0;
            tableContent += `
                    <tr>
                        <td>${name}</td>
                        <td>${tasks}</td>
                        <td>${convertTime(time)}</td>
                        <td>${rph}</td>
                        <td>${avgTimePerTask}s</td>
                    </tr>`;
        });
        let table = document.getElementById(tableBody);
        table.innerHTML = tableContent;
        $("#" + tableCnt).DataTable();
    };

    //
    const showChart = (chartElm, chartData, type, statisticType) => {
        let chartCnt = document.getElementById(chartElm).getContext("2d");

        let data = null;
        if (statisticType === "task name") { data = chartData.tasksByName; }
        else if (statisticType === "date") { data = chartData.tasksByDate; }
        else if (statisticType === "time") { data = chartData.timeByDate; }
        else if (statisticType === "hour") { data = chartData; }

        // Nếu biểu đồ của `chartElm` đã tồn tại, destroy trước khi tạo mới
        if (chartInstances[chartElm]) {
            chartInstances[chartElm].destroy();
        }

        // Tạo biểu đồ mới và lưu vào `chartInstances`
        chartInstances[chartElm] = new Chart(chartCnt, {
            type: type,
            data: data,
            options: {
                plugins: { title: { display: true, text: "Statistics by " + statisticType } },
                maintainAspectRatio: false,
                responsive: true
            }
        });
    };


    /* ==================================== CALCULATE AMOUNT ==================================== */
    async function loadAmountData(data, tableId) {
        let uncategorizedTasks = new Set();
        let rateData = await fetchJSON('../data/rate.json');
        let tierData = await fetchJSON('../data/tier.json');
        let taskCounts = data.tasksByName
        //
        let groupedData = {};
        let rateMap = {};
        rateData[0].data.forEach(rate => {
            rateMap[rate.tier] = rate.rate;
        });
        let categorizedTasks = new Set(tierData.map(task => task.name));
        tierData.forEach(task => {
            if (task.name === "-") return;
            if (!task.tier) {

                uncategorizedTasks.push(task.name);
                return;
            }
            let taskCount = taskCounts.find(t => t.name === task.name)?.tasks || 0;
            if (!groupedData[task.tier]) {
                groupedData[task.tier] = { totalTasks: 0, taskNames: [] };
            }
            groupedData[task.tier].totalTasks += parseInt(taskCount);
            if (taskCount > 0) {
                groupedData[task.tier].taskNames.push(`${task.name} (${taskCount})`);
            }
        });

        let table = document.getElementById(tableId)

        let tableBody = table.getElementsByClassName("task-table-body")[0];
        let grandTotal = 0;
        table.getElementsByClassName('grand-total')[0].innerHTML = `<strong>$0.00</strong>`;
        let uncategorizedTableBody = table.getElementsByClassName("uncategorized-task-table-body")[0];
        taskCounts.forEach(task => {
            if (!categorizedTasks.has(task.name)) {
                uncategorizedTasks.add(task.name);
            }
        });
        //
        tableBody.innerHTML = "";
        uncategorizedTableBody.innerHTML = ""
        uncategorizedTasks.forEach(task => {
            let taskCount = taskCounts.find(t => t.name === task)?.tasks || 0;
            uncategorizedTableBody.innerHTML += `<tr><td>${task}</td><td>${taskCount}</td></tr>`;
        });
        Object.keys(groupedData).sort((a, b) => a - b).forEach(tier => {
            if (groupedData[tier].totalTasks === 0) return;
            let totalAmount = groupedData[tier].totalTasks * (rateMap[tier] || 0);

            let row = `<tr>
                <td>${tier}</td>
                <td>${groupedData[tier].totalTasks}</td>
                <td>$${totalAmount.toFixed(2)}</td>
                <td>${groupedData[tier].taskNames.join("<br>")}</td>
            </tr>`;
            grandTotal += totalAmount;
            tableBody.innerHTML += row;
            table.getElementsByClassName('grand-total')[0].innerHTML = `<strong>$${grandTotal.toFixed(2)}</strong>`;
        });
    }



    /* ==================================== DAY ==================================== */
    // DATE PICKER
    const showDatePicker = () => {
        let datepicker = $("#date-picker");
        datepicker.val(currentDate);
        datepicker.attr({ min: startHistoryDate, max: currentDate });
    };

    // Show detail
    const showDetailDate = (date, data) => {
        $("#day-title").text(date);
        $("#dayDetailTasksTxt").text(data.totalTasks);
        $("#dayDetailTimeTxt").text(convertTime(data.totalTime));
        let rph = data.totalTasks > 0 ? Math.round(3600 / (data.totalTime / data.totalTasks)) : 0;
        $("#dayDetailRphTxt").text(rph);
    };



    // Show all
    const showDay = (date, timezone) => {
        let rawData = getData(date, date, timezone)
        let data = processData(rawData, timezone);
        let dataByHour = convertDataForChartByHour(rawData, timezone);
        showDetailDate(date, data);
        showTable(data, "day-table-by-type", "day-table-body-by-type");
        showChart("dayChartByType", convertForChartJS(data), "doughnut", "task name");
        showChart("dayChartByHour", dataByHour, "bar", "hour");
        loadAmountData(data, "day-amount");
    }

    /* ===================== SHOW DAY ===================== */
    showDatePicker();
    showDay(currentDate, timezone)
    // 
    $(document).on("click", "#btn-search-by-day", () => {
        let datePick = DateTime.fromISO($("#date-picker").val()).toISODate();
        showDay(datePick, timezone)
    });



    /* ==================================== WEEK ==================================== */
    const getWeeksInYear = (year, timeZone = "UTC", minDate = null, maxDate = null) => {
        let weeks = [];
        // Ngày đầu tiên của năm
        let firstDay = DateTime.fromObject({ year, month: 1, day: 1 }, { zone: timeZone });
        // Xác định ngày Thứ Hai đầu tiên trong năm
        let firstMonday = firstDay;
        while (firstMonday.weekday !== 1) { firstMonday = firstMonday.plus({ days: 1 }); }
        // Ngày cuối cùng của năm
        let lastDay = DateTime.fromObject({ year, month: 12, day: 31 }, { zone: timeZone });
        // Chuyển đổi minDate và maxDate thành DateTime để so sánh
        let minDateTime = minDate ? DateTime.fromISO(minDate, { zone: timeZone }) : null;
        let maxDateTime = maxDate ? DateTime.fromISO(maxDate, { zone: timeZone }) : null;
        let currentWeekStart = firstMonday;
        let weekNumber = 1;
        while (currentWeekStart.year === year || currentWeekStart <= lastDay) {
            let weekEnd = currentWeekStart.plus({ days: 6 });
            // Nếu tuần chứa minDate hoặc maxDate, vẫn giữ lại tuần đó
            if ((!minDateTime || weekEnd >= minDateTime) &&
                (!maxDateTime || currentWeekStart <= maxDateTime)) {
                weeks.push({
                    weekNumber,
                    start: currentWeekStart.toISODate(),
                    end: weekEnd.toISODate()
                });
            }
            currentWeekStart = currentWeekStart.plus({ days: 7 }); // Nhảy sang tuần tiếp theo
            weekNumber++;
        }
        return weeks;
    };
    //
    const getWeekFromDate = (dateString, timeZone = "UTC") => {
        let date = DateTime.fromISO(dateString, { zone: timeZone });
        return {
            year: date.weekYear,
            weekNumber: date.weekNumber,
            start: date.startOf("week").toISODate(),
            end: date.endOf("week").toISODate()
        };
    };

    // Show detail
    const showDetailWeek = (weekInfo, data) => {
        $("#week-title").text(`Week ${weekInfo.weekNumber - 1} - ${weekInfo.year} (${weekInfo.start} → ${weekInfo.end})`);
        $("#weekDetailTasksTxt").text(data.totalTasks);
        $("#weekDetailTimeTxt").text(convertTime(data.totalTime));
        let rph = data.totalTasks > 0 ? Math.round(3600 / (data.totalTime / data.totalTasks)) : 0;
        $("#weekDetailRphTxt").text(rph);
    };

    // Show select
    const showSelectYearWeek = (startDate, endDate) => {
        $selectYearWeek.empty();
        let startYear = DateTime.fromISO(startDate).year;
        let endYear = DateTime.fromISO(endDate).year;
        for (let year = startYear; year <= endYear; year++) {
            let isSelected = (year == currentWeek.year) ? "selected" : "";
            $selectYearWeek.append(
                `<option value="${year}" ${isSelected}>${year}</option>`
            );
        }
    }

    // Show select
    const showSelectWeek = (year) => {
        $selectWeek.empty();
        //
        let listWeek = getWeeksInYear(year, timezone, startHistoryDate, currentDate);
        $selectWeek.append('<option selected value="" disabled>Select</option>')
        listWeek.forEach(week => {
            let isSelected = (year == currentWeek.year && week.start === currentWeek.start) ? "selected" : "";
            $selectWeek.append(
                `<option value="${week.start}" ${isSelected}>
                Week ${week.weekNumber} (${week.start} → ${week.end})
            </option>`
            );
        });
    }

    //
    $(document).on("change", "#select-year-week", () => {
        let year = parseInt($("#select-year-week option:selected").val());
        showSelectWeek(year)
    });
    //
    $(document).on("change", "#select-week", () => {
        let startDate = $("#select-week option:selected").val();
        if (startDate == "") { return }
        let weekInfo = getWeekFromDate(startDate, timezone);
        showWeek(weekInfo, timezone)
    });


    // Show all 
    const showWeek = (weekInfo, timezone) => {
        let rawData = getData(weekInfo.start, weekInfo.end, timezone)
        let data = processData(rawData, timezone);
        showDetailWeek(weekInfo, data)
        //
        showTable(data, "week-table-by-type", "week-table-body-by-type");
        showChart("weekChartByType", convertForChartJS(data), "pie", "task name")
        showChart("weekChartByTasks", convertForChartJS(data), "bar", "date")
        showChart("weekChartByTime", convertForChartJS(data), "bar", "time");
        loadAmountData(data, "week-amount")
    }

    var $selectYearWeek = $("#select-year-week");
    var $selectWeek = $("#select-week");
    var currentWeek = getWeekFromDate(currentDate, timezone);
    //
    showSelectYearWeek(startHistoryDate, currentDate)
    showSelectWeek(currentWeek.year)
    showWeek(currentWeek, timezone)



    /* ==================================== MONTH ==================================== */
    const getMonthsInYear = (year, timeZone = "UTC", minDate = null, maxDate = null) => {
        let months = [];
        // Chuyển đổi minDate & maxDate thành DateTime để so sánh
        let minDateTime = minDate ? DateTime.fromISO(minDate, { zone: timeZone }) : null;
        let maxDateTime = maxDate ? DateTime.fromISO(maxDate, { zone: timeZone }) : null;
        for (let month = 1; month <= 12; month++) {
            let firstDayOfMonth = DateTime.fromObject({ year, month, day: 1 }, { zone: timeZone });
            let lastDayOfMonth = firstDayOfMonth.endOf("month");
            // Chỉ lấy tháng nếu nằm trong khoảng minDate → maxDate
            if ((!minDateTime || lastDayOfMonth >= minDateTime) &&
                (!maxDateTime || firstDayOfMonth <= maxDateTime)) {
                months.push({
                    month: month,
                    name: firstDayOfMonth.toFormat("MMMM"), // Tên tháng (January, February,...)
                    start: firstDayOfMonth.toISODate(),
                    end: lastDayOfMonth.toISODate()
                });
            }
        }
        return months;
    };

    //
    const getMonthFromDate = (dateString, timeZone = "UTC") => {
        let date = DateTime.fromISO(dateString, { zone: timeZone });
        let firstDay = date.startOf("month");
        let lastDay = date.endOf("month");

        return {
            year: date.year,
            month: date.month,
            name: date.toFormat("MMMM"),
            start: firstDay.toISODate(),
            end: lastDay.toISODate()
        };
    };

    // Show detail
    const showDetailMonth = (monthInfo, data) => {
        $("#month-title").text(`Month ${monthInfo.month} - ${monthInfo.year}`);
        $("#monthDetailTasksTxt").text(data.totalTasks);
        $("#monthDetailTimeTxt").text(convertTime(data.totalTime));
        let rph = data.totalTasks > 0 ? Math.round(3600 / (data.totalTime / data.totalTasks)) : 0;
        $("#monthDetailRphTxt").text(rph);
    };


    // Show select
    const showSelectYearMonth = (startDate, endDate) => {
        $selectYearMonth.empty();
        let startYear = DateTime.fromISO(startDate).year;
        let endYear = DateTime.fromISO(endDate).year;
        for (let year = startYear; year <= endYear; year++) {
            let isSelected = (year == currentWeek.year) ? "selected" : "";
            $selectYearMonth.append(
                `<option value="${year}" ${isSelected}>${year}</option>`
            );
        }
    }

    // Show select
    const showSelectMonth = (year) => {
        $selectMonth.empty();
        let listMonth = getMonthsInYear(year, timezone, startHistoryDate, currentDate);
        $selectMonth.append('<option selected value="" disabled>Select</option>')
        listMonth.forEach(month => {
            let isSelected = (year == currentMonth.year && month.start === currentMonth.start) ? "selected" : "";
            $selectMonth.append(
                `<option value="${month.start}" ${isSelected}>${month.month}</option>`
            );
        });
    }


    //
    $(document).on("change", "#select-year-month", () => {
        let year = parseInt($("#select-year-month option:selected").val());
        showSelectMonth(year)
    });
    //
    $(document).on("change", "#select-month", () => {
        let startDate = $("#select-month option:selected").val();
        if (startDate == "") { return }
        let monthInfo = getMonthFromDate(startDate, timezone);
        showMonth(monthInfo, timezone)
    });


    // Show all 
    const showMonth = (monthInfo, timezone) => {
        let rawData = getData(monthInfo.start, monthInfo.end, timezone)
        let data = processData(rawData, timezone);
        showDetailMonth(monthInfo, data)
        //
        showTable(data, "month-table-by-type", "month-table-body-by-type");
        showChart("monthChartByTasks", convertForChartJS(data), "bar", "date")
        showChart("monthChartByTime", convertForChartJS(data), "bar", "time")
        loadAmountData(data, "month-amount")
    }
    //
    var $selectYearMonth = $("#select-year-month");
    var $selectMonth = $("#select-month");
    var currentMonth = getMonthFromDate(currentDate, timezone);
    showSelectYearMonth(startHistoryDate, currentDate)
    showSelectMonth(currentMonth.year)
    showMonth(currentMonth, timezone)







})
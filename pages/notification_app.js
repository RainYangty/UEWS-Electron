const ipcRenderer = require('electron').ipcRenderer;
const _setInterval = require('timers').setInterval;

ipcRenderer.send('1', 'hello');

var iclStartAt;
var iclLat;
var iclLon;
var iclDepth;
var iclMagnitude;
var iclEpicenter;
var icllastId;
var iclUpdates;
var iclmainMaxInt;
var iclarrivetime;
var iclint0time;

var sc_eewStartAt;
var sc_eewLat;
var sc_eewLon;
var sc_eewDepth;
var sc_eewMagnitude;
var sc_eewEpicenter;
var sc_eewlastId;
var sc_eewUpdates;
var sc_eewmainMaxInt;
var sc_eewlocalname;
var sc_eewarrivetime;
var sc_eewint0time;

var ifmarker = false;
var iclcancel = true;
var sc_eewcancel = true;

var warningtf = false;

var localLat = getCookie("la");
var localLon = getCookie("ln");
var minint = (getCookie("minint") == null) ? 3 : getCookie("minint");

ipcRenderer.send("ask", "ask");

ipcRenderer.on('Lat', (event, data) => {
    localLat = +(data);
    ipcRenderer.send('1', localLat);
})

ipcRenderer.on('Lon', (event, data) => {
    localLon = +(data);
    ipcRenderer.send('1', localLon);
})

ipcRenderer.on('int', (event, data) => {
    minint = +(data);
    ipcRenderer.send('1', minint);
})

var deltatime = 0;
var currentTimeStamp = 0;

ipcRenderer.send('cancel', 'cancel');

const intColor = {
    "0": {
        "bkcolor": "#2e2e2e"
    },
    "1": {
        "bkcolor": "#9edeff"
    },
    "2": {
        "bkcolor": "#76cbf6"
    },
    "3": {
        "bkcolor": "#3cbdff"
    },
    "4": {
        "bkcolor": "#46BC67"
    },
    "5": {
        "bkcolor": "#12994E"
    },
    "6": {
        "bkcolor": "#F6B72D"
    },
    "7": {
        "bkcolor": "#FF8400"
    },
    "8": {
        "bkcolor": "#fa5151"
    },
    "9": {
        "bkcolor": "#f4440d"
    },
    "10": {
        "bkcolor": "#ff000d"
    },
    "11": {
        "bkcolor": "#c20007"
    },
    "12": {
        "bkcolor": "#fd2fc2"
    }
};

function getcurrenttime() //同步时间
{
    var start = Date.now();
    $.getJSON("https://api.wolfx.jp/ntp.json?" + Date.now(),
        function (json) {
            systemTime = Date();
            systemTimeStamp = Date.now();
            deltatime = DateToTimestamp(json.CST.str) - Date.parse(new Date()) + (systemTimeStamp - start);
        });
}

function settime() //同步时间
{
    systemTime = Date();
    systemTimeStamp = Date.now();
    currentTimeStamp = Date.parse(new Date()) + deltatime;
}

function updatelocation()
{
    ipcRenderer.send("ask", "ask");
}

function sceew() //四川地震局
{
    var starttime = Date.now();
    $.getJSON("https://api.wolfx.jp/sc_eew.json?" + Date.now(),//https://api.wolfx.jp/sc_eew.json
        function (json) {
            var endtime = Date.now();
            sc_eewLat = json.Latitude;
            sc_eewLon = json.Longitude;
            sc_eewDepth = json.Depth;
            sc_eewStartAt = Date.parse(new Date(json.OriginTime).toString());
            sc_eewUpdates = json.ReportNum;
            sc_eewEpicenter = json.HypoCenter;
            sc_eewMagnitude = json.Magunitude;
            sc_eewlocalname = json.HypoCenter;

            sc_eewMaxInt = calcMaxInt(sc_eewMagnitude, sc_eewDepth);

            distance = getDistance(sc_eewLat, sc_eewLon, localLat, localLon);
            sc_eewarrivetime = Math.round(distance / 4);
            sc_eewint0time = calcint0time(sc_eewMagnitude);
            if ((currentTimeStamp - sc_eewStartAt) / 1000 <= sc_eewint0time && (currentTimeStamp - sc_eewStartAt) / 1000 >= 0) {
                localInt = 0.92 + 1.63 * sc_eewMagnitude - 3.49 * Math.log10(distance);
                sc_eewcancel = false;
            }
            else if (!sc_eewcancel && iclcancel) {
                sc_eewcancel = true;
                warningtf = false;
                ipcRenderer.send('cancel', 'cancel');
            }
            else if (!iclcancel && !sc_eewcancel) {
                sc_eewcancel = true;
                //$("#countDown2").css("visibility", "hidden");
                
            }
        });
}

function icl() //ICL地震预警网
{
    $.getJSON("https://mobile-new.chinaeew.cn/v1/earlywarnings?start_at=&updates=" + Date.now(), //https://mobile-new.chinaeew.cn/v1/earlywarnings?start_at=&updates=
        function (json) {
            iclLat = json.data[0].latitude;
            icllastId = json.data[0].eventId;
            iclLon = json.data[0].longitude;
            iclDepth = json.data[0].depth;
            iclStartAt = json.data[0].startAt;
            iclUpdates = json.data[0].updates;
            iclEpicenter = json.data[0].epicenter;
            iclMagnitude = json.data[0].magnitude;
            shake = true;
            iclMaxInt = calcMaxInt(iclMagnitude, iclDepth);

            distance = getDistance(iclLat, iclLon, localLat, localLon);
            iclarrivetime = Math.round(distance / 4);
            iclint0time = calcint0time(iclMagnitude);
            if ((currentTimeStamp - iclStartAt) / 1000 <= iclint0time) {
                localInt = 0.92 + 1.63 * iclMagnitude - 3.49 * Math.log10(distance);
                    iclcancel = false;
            }
            else if (!iclcancel && sc_eewcancel) {
                iclcancel = true;
                warningtf = false;
                ipcRenderer.send('cancel', 'cancel');
            }
            else if (!sc_eewcancel && !iclcancel) {
                iclcancel = true;
                warningtf = false;
                //$("#countDown2").css("visibility", "hidden");
                
            }
        });
}

var localInt;
var feel;
var distance;
var ty = 0;
var int0time;
var Lat, Lon, StartAt, arrivetime, MaxInt, Epicenter, cancel;
function countDown() {
    if (ty == 1 || ty == 3) {
        Lat = iclLat;
        Lon = iclLon;
        StartAt = iclStartAt;
        arrivetime = iclarrivetime;
        MaxInt = iclMaxInt;
        Epicenter = iclEpicenter;
        cancel = iclcancel;
        Magnitude = iclMagnitude;
        int0time = iclint0time;
    }
    else if (ty == 0 || ty == 2) {
        Lat = sc_eewLat;
        Lon = sc_eewLon;
        StartAt = sc_eewStartAt;
        arrivetime = sc_eewarrivetime;
        MaxInt = sc_eewmainMaxInt;
        Epicenter = sc_eewEpicenter;
        cancel = sc_eewcancel;
        Magnitude = sc_eewMagnitude;
        int0time = sc_eewint0time;
    }
    distance = getDistance(Lat, Lon, localLat, localLon);
    timeMinus = currentTimeStamp - StartAt;
    timeMinusSec = timeMinus / 1000;
    localInt = 0.92 + 1.63 * Magnitude - 3.49 * Math.log10(distance);
    if (timeMinusSec <= int0time && !cancel) {
        //document.getElementById("seis_type").innerHTML = "震中最近测站";
        //setInterval(countdownRun, 1000, Lat, Lon, OriTime);
        if (!warningtf && localInt >= minint) {
            //$("#countDown2").css("visibility", "visible");
            ipcRenderer.send('warning', 'warning');
            if (localInt >= 3.0 && localInt < 5.0) {
                warningtf = true;
            }
            else if (localInt >= 5.0) {
                warningtf = true;
            }
            else {
                warningtf = true;
            }
        }
        if (localInt < 0) {
            localInt = "0.0"
        } else if (localInt >= 0 && localInt < 12) {
            localInt = localInt.toFixed(1);
        } else if (localInt >= 12) {
            localInt = "12.0"
        }
        if (localInt >= MaxInt) localInt = MaxInt;
        if (localInt < 1.0) {
            feel = "无震感";
        } else if (localInt >= 1.0 && localInt < 2.0) {
            feel = "震感微弱";
        } else if (localInt >= 2.0 && localInt < 3.0) {
            feel = "高楼层有震感";
        } else if (localInt >= 3.0 && localInt < 4.0) {
            feel = "震感较强";
        } else if (localInt >= 4.0 && localInt < 5.0) {
            feel = "震感强烈";
        } else if (localInt >= 5.0) {
            feel = "震感极强";
        }
        $("#eewMaxInt").css("background-color", intColor[Math.round(localInt) <= 0 ? 0 : Math.round(localInt)].bkcolor);
        document.getElementById("eewMaxInt").innerHTML = Math.round(localInt) <= 0 ? 0 : Math.round(localInt);
    }
}

var cd = 0;
var cdp = 0;

function countdownRun() {
    if (sc_eewarrivetime - (Date.now() - sc_eewStartAt) / 1000 < iclarrivetime - (Date.now() - iclStartAt) / 1000 && !iclcancel && !sc_eewcancel && (Date.now() - sc_eewStartAt) / 1000 <= sc_eewarrivetime) {
        ty = 0;
        distance = getDistance(sc_eewLat, sc_eewLon, localLat, localLon);
        timeMinus = Date.now() - sc_eewStartAt;
        timeMinusSec = timeMinus / 1000;
        cd = Math.round(distance / 4 - timeMinusSec);
        cdp = Math.round(distance / 7 - timeMinusSec);
        if (cd <= 0) {
            cd = "抵达";
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波已抵达";
        }
        if (cdp <= 0) {
            cdp = "抵达";
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波已抵达";
        }
        else {
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波将抵达";
        }
        if (cd >= 999) cd = 999;
        if (cdp >= 999) cdp = 999;
        document.getElementById("countDown_SNumber").innerHTML = cd;
        document.getElementById("countDown_PNumber").innerHTML = cdp;
    }
    else if (sc_eewarrivetime - (Date.now() - sc_eewStartAt) / 1000 > iclarrivetime - (Date.now() - iclStartAt) / 1000 && !iclcancel && !sc_eewcancel && (Date.now() - iclStartAt) / 1000 <= iclarrivetime) {
        ty = 1;
        distance = getDistance(iclLat, iclLon, localLat, localLon);
        timeMinus = Date.now() - iclStartAt;
        timeMinusSec = timeMinus / 1000;
        cd = Math.round(distance / 4 - timeMinusSec);
        cdp = Math.round(distance / 7 - timeMinusSec);
        if (cd <= 0) {
            cd = "抵达";
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波已抵达";
        }
        if (cdp <= 0) {
            cdp = "抵达";
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波已抵达";
        }
        else {
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波将抵达";
        }
        if (cd >= 999) cd = 999;
        if (cdp >= 999) cdp = 999;
        document.getElementById("countDown_SNumber").innerHTML = cd;
        document.getElementById("countDown_PNumber").innerHTML = cdp;
    }
    else if ((Date.now() - iclStartAt) / 1000 > iclarrivetime && (Date.now() - sc_eewStartAt) / 1000 <= sc_eewarrivetime) {
        ty = 2;
        distance = getDistance(sc_eewLat, sc_eewLon, localLat, localLon);
        timeMinus = Date.now() - sc_eewStartAt;
        timeMinusSec = timeMinus / 1000;
        cd = Math.round(distance / 4 - timeMinusSec);
        cdp = Math.round(distance / 7 - timeMinusSec);
        if (cd <= 0) {
            cd = "抵达";
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波已抵达";
        }
        if (cdp <= 0) {
            cdp = "抵达";
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波已抵达";
        }
        else {
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波将抵达";
        }
        if (cd >= 999) cd = 999;
        if (cdp >= 999) cdp = 999;
        document.getElementById("countDown_SNumber").innerHTML = cd;
        document.getElementById("countDown_PNumber").innerHTML = cdp;
    }
    else if ((Date.now() - iclStartAt) / 1000 <= iclarrivetime && (Date.now() - sc_eewStartAt) / 1000 > sc_eewarrivetime) {
        ty = 3;
        distance = getDistance(iclLat, iclLon, localLat, localLon);
        timeMinus = Date.now() - iclStartAt;
        timeMinusSec = timeMinus / 1000;
        cd = Math.round(distance / 4 - timeMinusSec);
        cdp = Math.round(distance / 7 - timeMinusSec);
        if (cd <= 0) {
            cd = "抵达";
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波已抵达";
        }
        if (cdp <= 0) {
            cdp = "抵达";
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波已抵达";
        }
        else {
            //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波将抵达";
        }
        if (cd >= 999) cd = 999;
        if (cdp >= 999) cdp = 999;
        document.getElementById("countDown_SNumber").innerHTML = cd;
        document.getElementById("countDown_PNumber").innerHTML = cdp;
    }
    else {
        cd = "抵达";
        cdp = "抵达";
        //document.getElementById("countDown_Text").innerHTML = feel + "<br>" + "地震横波已抵达";
        document.getElementById("countDown_SNumber").innerHTML = cd;
        document.getElementById("countDown_PNumber").innerHTML = cdp;
    }
    //console.log("countdownRun() 运行中");
}

_setInterval(sceew, 2000);
_setInterval(icl, 2000);
_setInterval(settime, 1000);
_setInterval(countdownRun, 1000);
_setInterval(countDown, 1000);
_setInterval(getcurrenttime, 10000);
_setInterval(updatelocation, 60000);
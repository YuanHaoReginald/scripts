// ==UserScript==
// @name         Bangumi Bgmlist Integrator
// @description  将你的"在看"与 bgmlist.com 的放送数据优雅整合!
// @namespace    bangumi.scripts.prevails.bgmlistintegrator
// @version      1.2.0
// @author       "Donuts."
// @require      https://code.jquery.com/jquery-2.2.4.min.js
// @include      /^https?:\/\/(bgm\.tv|bangumi\.tv|chii\.in)\/$/
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      bgmlist.com
// @grant        GM_addStyle
// ==/UserScript==

const TIME_ZONE = 'CN';
// valid value: 'CN', 'JP'

// if not login, exit
if (!document.getElementById('badgeUserPanel')) {
    return;
}

function getOneWeekRange(lastDayDate, endTime = '2359') {
    const end = new Date(lastDayDate);
    end.setHours(endTime.substr(0, 2));
    end.setMinutes(endTime.substr(2, 2), 59, 999);
    const begin = new Date(end.getTime());
    begin.setTime(begin.getTime() - 1000 * 60 * 60 * 24 * 7 + 1);
    return [begin, end];
}

const now = new Date();
const lastWeekRange = getOneWeekRange(now);
const WEEK_DAY = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
];

const bgmlist = GM_getValue('bgmlist') || {};

class Bangumi {
    constructor(id, a) {
        this.id = Number(id);
        this.bgm = bgmlist[this.id];
        this.a = a;
    }
    get$Html() {
        const $re = $(this.a).clone();
        $re.find('img').removeAttr('class');
        $re.find('span').remove();
        $re.attr('title', this.bgm.titleCN + '\n' + this.bgm.titleJP);
        $re.data('onAirSite', this.bgm.onAirSite);
        return $re;
    }
    getShowDate() {
        return new Date(this.bgm.showDate || 0);
    }
    getEndDate() {
        return new Date(this.bgm.endDate || 0xfffffffffffff);
    }
    isInRange([begin, end]) {
        const showBegin = this.getShowDate();
        const showEnd = this.getEndDate();
        if (showBegin <= begin && showEnd >= end) {
            return true;
        }
        if (begin <= showBegin && showBegin <= end) {
            return true;
        }
        if (begin <= showEnd && showEnd <= end) {
            return true;
        }
        return false;
    }
}

const myBangumis = $('#prgSubjectList > [subject_type=2] > .thumbTip')
        .toArray().map(i => new Bangumi(i.getAttribute('subject_id'), i)).filter(i => i.bgm);

$('.tooltip').hide();
$('.week:eq(1)').remove();

for (let i = 1; i < 7; i++) {
    const day = WEEK_DAY[(now.getDay() - i + 7) % 7];
    const html = `
        <li class="clearit week ${day}">
            <h3><p><small>${day}</small></p></h3>               
            <div class="coverList clearit"></div>
        </li>
    `;
    const $li = $(html);
    $('.calendarMini .tip').before($li);
}

const $week = $('.week')
$week.each(function () {
    const $div = $('div', this);
    $div.html('');
    const weekDay = WEEK_DAY.indexOf(this.classList[2]); // <li class="clearit week Sat">
    myBangumis.filter(i => i.bgm['weekDay' + TIME_ZONE] === weekDay && i.isInRange(lastWeekRange))
            .forEach(i => $div.append(i.get$Html()));
});

function rmTbWindow() {
    $('#TB_window.userscript_bgmlist_integrator').fadeOut('fast', function () {
        $(this).remove();
    });
}
function showTbWindow(html, style) {
    rmTbWindow();
    $('body').append(`
        <div id="TB_window" class="userscript_bgmlist_integrator"${style ? ` style="${style}"` : ''}>
            ${html}
            <small class="grey">本插件放送数据由 <a href="http://bgmlist.com">bgmlist.com</a> 提供</small>
        </div>`);
    $('#TB_window.userscript_bgmlist_integrator').mouseleave(rmTbWindow);
}

$week.find('.thumbTip').click(function () {
    const onAirSite = $(this).data('onAirSite');
    showTbWindow(`
        <small class="grey"><a href="${$(this).attr('href')}">${$(this).attr('title').replace('\n', '<br>')}</a></small>
        <ul class="line_list">
            ${onAirSite.map((v, i) => `
                <li class="line_${i % 2 ? 'odd' : 'even'}">
                    <h6><a target="_blank" href="${v}">${v.replace(/http:\/\/.+?\./, '').split('/')[0]}</a></h6>
                </li>
                `).join('')}
        </ul>`);
    return false;
});

GM_addStyle('#TB_window.userscript_bgmlist_integrator{display:block;left:80%;top:20px;width:18%;}');

const CHECK_UPDATE_INTERVAL = 1000 * 60 * 60 * 8; // 8h

function getLast(obj) {
    let last = undefined;
    for (let i in obj) {
        last = i;
    }
    return obj[last];
}

function createIndexOnBgmId(bgmlistOriginJson) {
    const origin = JSON.parse(bgmlistOriginJson);
    const bgmlist = {};
    for (let i in origin) {
        bgmlist[origin[i].bgmId] = origin[i];
    }
    return bgmlist
}

function update({path, version}) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: 'http://bgmlist.com/' + path,
        onload: function(response) {
            if (response.status === 200) {
                GM_setValue('bgmlist', createIndexOnBgmId(response.responseText));
                GM_setValue('path', path);
                GM_setValue('version', version);
                showTbWindow('bgmlist 数据更新成功! 请刷新页面<br>');
                setTimeout(rmTbWindow, 5000);
            } else {
                showTbWindow('Connection Error<br>');
                setTimeout(rmTbWindow, 5000);
            }
        }
    });
}

function checkUpdate() {
    const lastCheckUpdate = GM_getValue('lastCheckUpdate') || 0;
    if (new Date().getTime() - lastCheckUpdate < CHECK_UPDATE_INTERVAL) {
        return;
    }
    GM_xmlhttpRequest({
        method: 'GET',
        url: 'http://bgmlist.com/json/archive.json',
        onload: function (response) {
            if (response.status === 200) {
                const archive = JSON.parse(response.responseText);
                const data = archive.data;
                const last = getLast(getLast(data));
                const oldPath = GM_getValue('path');
                const oldVersion = GM_getValue('version');
                if (!oldPath || !oldVersion || last.path > oldPath || last.version > oldVersion) {
                    update(last);
                }
                GM_setValue('lastCheckUpdate', new Date().getTime());
            } else {
                showTbWindow('Connection Error<br>');
                setTimeout(rmTbWindow, 5000);
            }
        }
    });
}

setTimeout(checkUpdate, 500);

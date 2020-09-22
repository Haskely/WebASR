function scheduleHtmlParser(html) {

    const cells = $("td.ng-binding.ng-scope").contents().toArray();
    const reg = /(\S+)\((教学班号：\d+)\) : (\d+)-(\d+)周，每周星期(\S)，(\d+)-(\d+)节，地点：(\S+)/;
    const reg_matches = [];
    cells.forEach((c) => {
        reg_matches.push(c.data.match(reg))
    });

    const chnNumChar = {
        零: 0,
        一: 1,
        二: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        七: 7,
        八: 8,
        九: 9
    };
    const timeSchedule = {
        1: ['08:00', '08:45'],
        2: ['08:55', '09:40'],
        3: ['10:00', '10:45'],
        4: ['10:55', '11:40'],
        5: ['13:00', '13:45'],
        6: ['13:55', '14:40'],
        7: ['15:00', '15:45'],
        8: ['15:55', '16:40'],
        9: ['18:00', '18:45'],
        10: ['18:55', '19:40'],
        11: ['20:00', '20:45'],
        12: ['20:55', '21:40'],
    };
    let parseMatch = (match_res) => {
        const res = {
            "name": "",
            "position": "",
            "teacher": "",
            "weeks": [],
            "day": 0,
            "sections": [],
        };

        res['name'] = match_res[1];
        res['position'] = match_res[8];
        res['teacher'] = match_res[2];
        res['weeks'] = Array(Number(match_res[4]) + 1 - Number(match_res[3])).fill(Number(match_res[3])).map((el, i) => Number(match_res[3]) + i);
        res['day'] = chnNumChar[match_res[5]];
        res['sections'] = Array(Number(match_res[7]) + 1 - Number(match_res[6])).fill(Number(match_res[6])).map((el, i) => {
            const class_num = Number(match_res[6]) + i;
            return {
                "section": class_num,
                "startTime": timeSchedule[class_num][0], //可不填
                "endTime": timeSchedule[class_num][1] //可不填
            };
        });
        return res;
    };

    const results = reg_matches.map((match_res) => {
        return parseMatch(match_res)
    });

    return {
        courseInfos: results
    };
};
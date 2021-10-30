const request = require('request');
const key = require('../keys/key');
const serviceKey = key.publicKey;
const kor_url = 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/'; //api 호출 기본 url
const mysql         = require('mysql'),
      dbconfig      = require('../config/database.js'),
      connection    = mysql.createConnection(dbconfig);

// 행사정보 조회
const searchFestival = (startDay, endDay, callback) => {
    const url = kor_url+'searchFestival?ServiceKey='+serviceKey+'&arrange=P&numOfRows=10&MobileOS=AND&MobileApp=WeT&_type=json';

    
    var queryParams = '&eventStartDate='+startDay+'&eventEndDate='+endDay;
    var fullurl = url + queryParams;
        
    request(fullurl, (err, resp, body) => {
        const re = JSON.parse(body);
        callback({totalCount:re.response.body.totalCount, pageNo:re.response.body.pageNo, item:re.response.body.items.item});
    });
};

module.exports = searchFestival;
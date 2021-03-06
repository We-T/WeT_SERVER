const request = require('request');
const key = require('../keys/key');
const serviceKey = key.publicKey;
const kor_url = 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/'; //api 호출 기본 url
const mysql         = require('mysql'),
      dbconfig      = require('../config/database.js'),
      connection    = mysql.createConnection(dbconfig);

// 키워드 검색 조회
const searchKeyword = (keyword, callback) => {
    const url = kor_url+'searchKeyword?ServiceKey='+serviceKey+'&arrange=P&numOfRows=10&MobileOS=AND&MobileApp=WeT&_type=json';

    
    var queryParams = '&keyword='+keyword;
    var fullurl = url + queryParams;
        
    request(fullurl, (err, resp, body) => {
        const re = JSON.parse(body);
        callback({totalCount:re.response.body.totalCount, pageNo:re.response.body.pageNo, item:re.response.body.items.item});
    });
};

module.exports = searchKeyword;

// 숙박정보 조회


// 소개정보 조회


// 이미지정보 조회


// 빅데이터 조회
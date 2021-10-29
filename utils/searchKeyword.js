const request = require('request');
const key = require('../keys/key');
const serviceKey = key.publicKey;
const kor_url = 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/'; //api 호출 기본 url
const mysql         = require('mysql'),
      dbconfig      = require('../config/database.js'),
      connection    = mysql.createConnection(dbconfig);

// 공통정보 조회
/*const detailCommon = (sql_result, callback) => {
    const url = kor_url+'detailCommon?ServiceKey='+serviceKey+'&overviewYN=Y&addrinfoYN=Y&MobileOS=AND&MobileApp=WeT&firstImageYN=Y&defaultYN=Y&_type=json';

    
    var queryParams = '&contentId='+sql_result.tourist_code;
    var fullurl = url + queryParams;
        
    request(fullurl, (err, body) => {
        const re = JSON.parse(body)
        callback(undefined, {
            result:re
        });
    });
}

module.exports = detailCommon;*/

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

// 행사정보 조회


// 숙박정보 조회


// 소개정보 조회


// 이미지정보 조회


// 디비 조회
// 파라미터 있는 경우
/*
const sql_param_query = (sql, params, callback) => {
    
    connection.query(sql, params, (err, result) => {
        const re = JSON.parse(result)
        callback(undefined, {
            result:re
        });
    });
}

module.exports = sql_param_query;

// 파라미터 없는 경우
const sql_query = (sql, callback) => {
    
    connection.query(sql, (err, result) => {
        const re = JSON.parse(result)
        callback(undefined, {
            result:re
        });
    });
}

module.exports = sql_query; */

// 빅데이터 조회
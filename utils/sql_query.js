const request = require('request');
const key = require('../keys/key');
const serviceKey = key.publicKey;
const kor_url = 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/'; //api 호출 기본 url
const mysql         = require('mysql'),
      dbconfig      = require('../config/database.js'),
      connection    = mysql.createConnection(dbconfig);

// 파라미터 없는 경우 디비 조회
const sql_query = (sql, callback) => {
    
    connection.query(sql, (err, result) => {
        callback(result);
    });
}

module.exports = sql_query; 
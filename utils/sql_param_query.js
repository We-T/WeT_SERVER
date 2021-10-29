const request = require('request');
const key = require('../keys/key');
const serviceKey = key.publicKey;
const kor_url = 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/'; //api 호출 기본 url
const mysql         = require('mysql'),
      dbconfig      = require('../config/database.js'),
      connection    = mysql.createConnection(dbconfig);

// 파라미터 있는 경우 디비 조회
const sql_param_query = (sql, params, callback) => {
    
    connection.query(sql, params, (err, result) => {
        callback(result);
    });
}

module.exports = sql_param_query;
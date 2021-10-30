const request = require('request');
const key = require('../keys/key');
const serviceKey = key.publicKey;
const kor_url = 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/'; //api 호출 기본 url
const mysql         = require('mysql'),
      dbconfig      = require('../config/database.js'),
      connection    = mysql.createConnection(dbconfig);

// 아무런 파라미터 없이 리퀘스트
const defaultRequest = (url, callback) => {
        
    request(url, (err, resp, body) => {
        const re = JSON.parse(body);
        callback({totalCount:re.response.body.totalCount, pageNo:re.response.body.pageNo, item:re.response.body.items.item});
    });
};

module.exports = defaultRequest;